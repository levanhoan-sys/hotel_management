import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../../lib/auth'
import { api, tokenKey } from '../../lib/api'
import type { ApiResponse, Booking, Profile, Room } from '../../lib/types'
import { MyBookingsPage } from './MyBookingsPage'
import { ProfilePage } from './ProfilePage'
import { RoomServiceOrder } from './RoomServiceOrder'
import { RefundTrackingPanel, type RefundRecord } from '../../components/RefundTrackingPanel'

function apiResponse<T>(data: T): { data: ApiResponse<T> } {
  return { data: { success: true, message: 'OK', data } }
}

function wrap(children: React.ReactNode, initial = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

const sampleBookings: Booking[] = [
  {
    id: 101,
    bookingCode: 'HG-0101',
    customerId: 7,
    customerName: 'Nguyễn Minh An',
    checkInDate: '2030-07-01',
    checkOutDate: '2030-07-03',
    numberOfNights: 2,
    status: 'CONFIRMED',
    depositAmount: 900_000,
    rooms: [{ roomId: 1, roomNumber: '101', guestCount: 2, capacity: 2, pricePerNight: 1_500_000 }],
    roomNumbers: ['101'],
    totalRoomCharge: 3_000_000,
    totalServiceCharge: 0,
    estimatedTotal: 3_000_000,
  },
  {
    id: 102,
    bookingCode: 'HG-0102',
    customerId: 7,
    customerName: 'Nguyễn Minh An',
    checkInDate: '2030-08-10',
    checkOutDate: '2030-08-13',
    numberOfNights: 3,
    status: 'CHECKED_IN',
    rooms: [
      { roomId: 2, roomNumber: '202', guestCount: 2, capacity: 2, pricePerNight: 2_000_000, bookingRoomId: 901 },
    ],
    roomNumbers: ['202'],
    serviceOrders: [
      {
        id: 11,
        bookingRoomId: 901,
        roomNumber: '202',
        name: 'Bữa sáng tại phòng',
        quantity: 1,
        unit: 'phần',
        subTotal: 180_000,
        approvalStatus: 'PENDING',
      },
      {
        id: 12,
        bookingRoomId: 901,
        roomNumber: '202',
        name: 'Giặt ủi nhanh',
        quantity: 2,
        unit: 'kg',
        subTotal: 240_000,
        approvalStatus: 'APPROVED',
      },
      {
        id: 13,
        bookingRoomId: 901,
        roomNumber: '202',
        name: 'Đưa đón sân bay',
        quantity: 1,
        unit: 'chuyến',
        subTotal: 450_000,
        approvalStatus: 'REJECTED',
      },
    ],
    totalRoomCharge: 6_000_000,
    totalServiceCharge: 240_000,
    estimatedTotal: 6_240_000,
  },
  {
    id: 103,
    bookingCode: 'HG-0103',
    customerId: 7,
    customerName: 'Nguyễn Minh An',
    checkInDate: '2030-05-01',
    checkOutDate: '2030-05-02',
    numberOfNights: 1,
    status: 'CANCELLED',
    cancellationReason: 'Thay đổi lịch công tác',
    rooms: [{ roomId: 3, roomNumber: '305', guestCount: 1, capacity: 2, pricePerNight: 1_200_000 }],
    roomNumbers: ['305'],
    totalRoomCharge: 1_200_000,
    totalServiceCharge: 0,
    estimatedTotal: 1_200_000,
  },
]

const sampleRoomWithServices: Room = {
  id: 2,
  roomNumber: '202',
  floor: 2,
  status: 'OCCUPIED',
  operational: true,
  roomTypeName: 'Executive Moss',
  basePrice: 2_000_000,
  capacity: 2,
  description: null,
  imageUrl: null,
  services: [
    { id: 31, name: 'Bữa sáng tại phòng', unitPrice: 180_000, unit: 'phần', active: true },
    { id: 32, name: 'Nước suối bổ sung', unitPrice: 0, unit: 'chai', active: true },
    { id: 33, name: 'Dịch vụ tạm ngưng', unitPrice: 100_000, unit: 'lần', active: false },
  ],
}

describe('Customer Step 2.3 — MyBookings, Profile, RoomServiceOrder & RefundTracking', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('handles loading, error retry, empty state, and filters/sort on MyBookingsPage', async () => {
    let calls = 0
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/me') {
        calls += 1
        if (calls === 1) throw new Error('Server timeout')
        if (calls === 2) return apiResponse([]) as never
        return apiResponse(sampleBookings) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    const { unmount } = render(
      wrap(
        <Routes>
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Routes>,
        '/my-bookings',
      ),
    )

    expect(screen.getByLabelText('Đang tải dữ liệu')).toBeInTheDocument()
    expect(await screen.findByText('Chưa thể tải dữ liệu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Chưa có đặt phòng nào')).toBeInTheDocument()
    unmount()

    // Mount cleanly with a fresh QueryClient to load full booking list
    render(
      wrap(
        <Routes>
          <Route path="/my-bookings" element={<MyBookingsPage />} />
        </Routes>,
        '/my-bookings',
      ),
    )

    expect(await screen.findByText('HG-0101')).toBeInTheDocument()
    expect(screen.getByText('HG-0102')).toBeInTheDocument()
    expect(screen.getByText('HG-0103')).toBeInTheDocument()

    // Filter by tab "Đang lưu trú"
    fireEvent.click(screen.getByRole('button', { name: /Đang lưu trú/i }))
    expect(screen.getByText('HG-0102')).toBeInTheDocument()
    expect(screen.queryByText('HG-0101')).not.toBeInTheDocument()

    // Switch back to all and search by room number
    fireEvent.click(screen.getByRole('button', { name: /Tất cả/i }))
    const searchInput = screen.getByLabelText('Tìm mã đặt phòng hoặc số phòng')
    fireEvent.change(searchInput, { target: { value: '305' } })
    expect(screen.getByText('HG-0103')).toBeInTheDocument()
    expect(screen.queryByText('HG-0101')).not.toBeInTheDocument()

    // Non-matching search -> EmptyState + Xóa bộ lọc
    fireEvent.change(searchInput, { target: { value: '9999' } })
    expect(await screen.findByText('Không có đơn phù hợp')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(await screen.findByText('HG-0101')).toBeInTheDocument()
  })

  it('updates contact profile and password with explicit success and error feedback on ProfilePage', async () => {
    sessionStorage.setItem(tokenKey, 'demo-jwt')
    const profile: Profile = {
      id: 7,
      username: 'minhan',
      fullName: 'Nguyễn Minh An',
      email: 'an@example.com',
      phone: '0909123456',
      role: 'ROLE_CUSTOMER',
      accountStatus: 'ACTIVE',
    }

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/auth/me') {
        return apiResponse({
          token: 'demo-jwt',
          userId: 7,
          username: 'minhan',
          fullName: 'Nguyễn Minh An',
          email: 'an@example.com',
          role: 'ROLE_CUSTOMER',
        }) as never
      }
      if (url === '/users/me') return apiResponse(profile) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    const put = vi.spyOn(api, 'put').mockImplementation(async (url, body) => {
      if (url === '/users/me') return apiResponse({ ...profile, ...(body as object) }) as never
      if (url === '/users/me/password') throw new Error('Mật khẩu hiện tại không đúng')
      throw new Error(`Unexpected PUT ${String(url)}`)
    })

    render(wrap(<ProfilePage />))

    expect(await screen.findByDisplayValue('Nguyễn Minh An')).toBeInTheDocument()
    expect(screen.getByText('Đang hoạt động')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Minh An Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /lưu thay đổi/i }))

    expect(await screen.findByText('Thông tin đã được cập nhật.')).toBeInTheDocument()
    expect(put).toHaveBeenCalledWith(
      '/users/me',
      expect.objectContaining({ fullName: 'Nguyễn Minh An Updated', email: 'an@example.com' }),
    )

    // Password toggle + failed update error feedback
    const currentInput = screen.getByLabelText('Mật khẩu hiện tại')
    expect(currentInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu hiện tại' }))
    expect(currentInput).toHaveAttribute('type', 'text')

    fireEvent.change(currentInput, { target: { value: 'wrong-pass' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu mới (tối thiểu 8 ký tự)'), {
      target: { value: 'NewPassword123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }))

    expect(await screen.findByText('Mật khẩu hiện tại không đúng')).toBeInTheDocument()
  })

  it('displays service order statuses, handles errors/empty, and orders a room service on RoomServiceOrder', async () => {
    // Hidden when booking is not CHECKED_IN
    const { container } = render(wrap(<RoomServiceOrder booking={sampleBookings[0]} />))
    expect(container).toBeEmptyDOMElement()

    let roomCalls = 0
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms/2') {
        roomCalls += 1
        if (roomCalls === 1) throw new Error('Failed to load offerings')
        return apiResponse(sampleRoomWithServices) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const post = vi.spyOn(api, 'post').mockResolvedValue(apiResponse(sampleBookings[1]) as never)

    render(wrap(<RoomServiceOrder booking={sampleBookings[1]} />))

    // Shows existing orders with distinct approval badges
    expect(screen.getByText('Chờ lễ tân duyệt')).toBeInTheDocument()
    expect(screen.getByText('Đã duyệt · Đang tính phí')).toBeInTheDocument()
    expect(screen.getByText('Yêu cầu bị từ chối')).toBeInTheDocument()

    // Error state + retry
    expect(await screen.findByText('Chưa thể tải dữ liệu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    // Only active services appear
    expect(await screen.findByRole('button', { name: /Nước suối bổ sung/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dịch vụ tạm ngưng/i })).not.toBeInTheDocument()

    // Select a priced service and increase quantity
    fireEvent.click(screen.getByRole('button', { name: /Bữa sáng tại phòng/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng dịch vụ' }))
    expect(screen.getByText(/360\.000/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /đặt dịch vụ/i }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/bookings/102/services', {
        bookingRoomId: 901,
        serviceItemId: 31,
        quantity: 2,
      }),
    )
  })

  it('renders RefundTrackingPanel loading, error, empty, pending, and completed states without inventing dates', async () => {
    const refunds: RefundRecord[] = [
      {
        id: 1,
        code: 'RF-HG0103-1',
        amount: 450_000,
        status: 'PENDING',
        createdAt: '2030-05-01T09:00:00',
        completedAt: null,
        reference: null,
      },
      {
        id: 2,
        code: 'RF-HG0103-2',
        amount: 300_000,
        status: 'COMPLETED',
        createdAt: '2030-05-01T09:05:00',
        completedAt: '2030-05-01T14:30:00',
        reference: 'VCB-998877',
      },
    ]

    let call = 0
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/103/refunds') {
        call += 1
        if (call === 1) throw new Error('Refund API unreachable')
        if (call === 2) return apiResponse([]) as never
        return apiResponse(refunds) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    const { rerender } = render(wrap(<RefundTrackingPanel bookingId={103} bookingStatus="CANCELLED" />))

    expect(screen.getByLabelText('Đang tải dữ liệu')).toBeInTheDocument()
    expect(await screen.findByText('Chưa thể tải dữ liệu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Chưa có giao dịch hoàn tiền')).toBeInTheDocument()

    // Force a fresh component key to load populated refund records
    rerender(wrap(<RefundTrackingPanel key="loaded" bookingId={103} bookingStatus="CANCELLED" />))

    expect(await screen.findByText('RF-HG0103-1')).toBeInTheDocument()
    expect(screen.getByText('Đang chờ xử lý')).toBeInTheDocument()
    expect(screen.getByText('Chưa có thời gian hoàn tất từ hệ thống')).toBeInTheDocument()

    expect(screen.getByText('RF-HG0103-2')).toBeInTheDocument()
    expect(screen.getByText('Đã hoàn tiền')).toBeInTheDocument()
    expect(screen.getByText('VCB-998877')).toBeInTheDocument()
  })
})
