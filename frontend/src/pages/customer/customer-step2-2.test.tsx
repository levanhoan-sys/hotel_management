import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../../lib/auth'
import { api } from '../../lib/api'
import type { ApiResponse, Booking, Invoice, Room } from '../../lib/types'
import { AuthPage } from './AuthPage'
import { BookingPage } from './BookingPage'
import { BookingDetailPage } from './BookingDetailPage'
import { DepositPaymentPanel } from '../../components/DepositPaymentPanel'

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

function LocationProbe() {
  return <span data-testid="loc">{useLocation().pathname}</span>
}

const sampleRoom: Room = {
  id: 1,
  roomNumber: '101',
  floor: 1,
  status: 'AVAILABLE',
  operational: true,
  roomTypeName: 'Deluxe Garden',
  basePrice: 1_500_000,
  capacity: 2,
  description: 'Phòng yên tĩnh.',
  imageUrl: null,
}

const pendingDepositBooking: Booking = {
  id: 55,
  bookingCode: 'HG-0055',
  customerId: 7,
  customerName: 'Nguyễn Minh An',
  checkInDate: '2030-06-10',
  checkOutDate: '2030-06-12',
  numberOfNights: 2,
  status: 'PENDING_DEPOSIT',
  depositAmount: 900_000,
  depositRate: 0.3,
  rooms: [{ roomId: 1, roomNumber: '101', guestCount: 2, capacity: 2, pricePerNight: 1_500_000 }],
  roomNumbers: ['101'],
  totalRoomCharge: 3_000_000,
  totalServiceCharge: 0,
  estimatedTotal: 3_000_000,
}

describe('Customer Step 2.2 — Auth, Booking, BookingDetail & VietQR Deposit', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('validates and submits registration and toggles password visibility on AuthPage', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(
      apiResponse({
        id: 12,
        username: 'minhan99',
        fullName: 'Nguyễn Minh An',
        email: 'an@example.com',
        phone: '0901234567',
        role: 'ROLE_CUSTOMER',
        accountStatus: 'ACTIVE',
      }) as never,
    )
    const post = vi.spyOn(api, 'post').mockResolvedValue(
      apiResponse({
        token: 'jwt-token',
        userId: 12,
        username: 'minhan99',
        fullName: 'Nguyễn Minh An',
        email: 'an@example.com',
        role: 'ROLE_CUSTOMER',
      }) as never,
    )

    render(
      wrap(
        <Routes>
          <Route
            path="/register"
            element={
              <>
                <AuthPage mode="register" />
                <LocationProbe />
              </>
            }
          />
          <Route path="/" element={<LocationProbe />} />
        </Routes>,
        '/register',
      ),
    )

    const passwordInput = screen.getByPlaceholderText('••••••••')
    expect(passwordInput).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }))
    expect(passwordInput).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))
    expect(await screen.findByText('Vui lòng nhập họ tên')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Minh An'), { target: { value: 'Nguyễn Minh An' } })
    fireEvent.change(screen.getByPlaceholderText('Tên đăng nhập'), { target: { value: 'minhan99' } })
    fireEvent.change(screen.getByPlaceholderText('ban@email.com'), { target: { value: 'an@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('+84'), { target: { value: '0901234567' } })
    fireEvent.change(passwordInput, { target: { value: 'MatKhau123!' } })
    fireEvent.click(screen.getByRole('button', { name: /tạo tài khoản/i }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/register', {
        fullName: 'Nguyễn Minh An',
        username: 'minhan99',
        email: 'an@example.com',
        phone: '0901234567',
        password: 'MatKhau123!',
      }),
    )
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/'))
  })

  it('handles empty state, error retry, and booking submission on BookingPage', async () => {
    render(
      wrap(
        <Routes>
          <Route path="/booking" element={<BookingPage />} />
        </Routes>,
        '/booking',
      ),
    )
    expect(await screen.findByText('Bạn chưa chọn phòng')).toBeInTheDocument()

    let failedOnce = false
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms/1') {
        if (!failedOnce) {
          failedOnce = true
          throw new Error('Network unavailable')
        }
        return apiResponse(sampleRoom) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const post = vi.spyOn(api, 'post').mockResolvedValue(apiResponse(pendingDepositBooking) as never)

    render(
      wrap(
        <Routes>
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/my-bookings/:id" element={<LocationProbe />} />
        </Routes>,
        '/booking?roomIds=1&checkIn=2030-06-10&checkOut=2030-06-12&guests=2',
      ),
    )

    expect(await screen.findByText('Chưa thể tải dữ liệu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Deluxe Garden')).toBeInTheDocument()
    expect(screen.getByText('Tổng tiền phòng dự kiến')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu đặt phòng/i }))

    await waitFor(() => expect(post).toHaveBeenCalledWith('/bookings', expect.objectContaining({ roomIds: [1] })))
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/my-bookings/55'))
  })

  it('copies bank details with feedback without auto-confirming payment on DepositPaymentPanel', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    const qrPayload = {
      bookingId: 55,
      amount: 900000,
      transferContent: 'HG0055',
      bankBin: '970436',
      accountNumber: '0123456789',
      accountName: 'KHACH SAN HOANG GIA',
      qrUrl: 'https://img.vietqr.io/image/demo.png',
      depositDeadline: '2030-06-09T12:00:00',
      verificationDeadline: null,
    }

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/55/deposit/qr') return apiResponse(qrPayload) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const post = vi.spyOn(api, 'post').mockResolvedValue(
      apiResponse({
        bookingId: 55,
        paymentStatus: 'REPORTED',
        reportedAt: '2030-06-09T11:50:00',
        verificationDeadline: '2030-06-09T12:20:00',
      }) as never,
    )

    render(wrap(<DepositPaymentPanel booking={pendingDepositBooking} />))

    expect(await screen.findByText('0123456789')).toBeInTheDocument()
    expect(screen.getByText('HG0055')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép số tài khoản' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('0123456789'))
    expect(await screen.findByText('Đã sao chép')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép số tiền' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('900000'))

    fireEvent.click(screen.getByRole('button', { name: 'Sao chép nội dung chuyển khoản' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('HG0055'))

    // Copying transfer info must NEVER automatically report/confirm deposit payment
    expect(post).not.toHaveBeenCalled()

    // Explicit user click reports transfer
    fireEvent.click(screen.getByRole('button', { name: /tôi đã chuyển khoản/i }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/bookings/55/deposit/report'))
  })

  it('renders BookingDetailPage timeline, invoice, and cancellation confirmation dialog', async () => {
    const checkedInBooking: Booking = {
      ...pendingDepositBooking,
      status: 'CHECKED_IN',
      depositPaidAt: '2030-06-09T11:55:00',
      confirmedAt: '2030-06-09T11:56:00',
      checkedInAt: '2030-06-10T14:00:00',
    }
    const invoiceData: Invoice = {
      id: 88,
      bookingId: 55,
      customerName: 'Nguyễn Minh An',
      roomAmount: 3_000_000,
      serviceAmount: 180_000,
      tax: 318_000,
      surcharge: 0,
      discount: 0,
      totalAmount: 3_498_000,
      successfulPayments: 900_000,
      balanceDue: 2_598_000,
      status: 'ISSUED',
      paymentMethod: null,
      isPaid: false,
      paidAt: null,
      items: [{ id: 1, type: 'ROOM', description: 'Deluxe Garden × 2 đêm', quantity: 2, unitPrice: 1_500_000, lineTotal: 3_000_000 }],
      payments: [],
    }

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/55') return apiResponse(checkedInBooking) as never
      if (url === '/bookings/55/refunds') return apiResponse([]) as never
      if (url === '/rooms/1') return apiResponse(sampleRoom) as never
      if (url === '/invoices/booking/55') return apiResponse(invoiceData) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    render(
      wrap(
        <Routes>
          <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        </Routes>,
        '/my-bookings/55',
      ),
    )

    expect((await screen.findAllByText('HG-0055')).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Tiến trình đặt phòng và thanh toán')).toBeInTheDocument()
    expect(await screen.findByText(/3\.498\.000/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /in hóa đơn/i })).toBeInTheDocument()
  })

  it('opens ConfirmDialog with cancellation preview before cancelling booking on BookingDetailPage', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/55') return apiResponse(pendingDepositBooking) as never
      if (url === '/bookings/55/deposit/qr') {
        return apiResponse({
          bookingId: 55,
          amount: 900000,
          transferContent: 'HG0055',
          bankBin: '970436',
          accountNumber: '0123456789',
          accountName: 'KHACH SAN HOANG GIA',
          qrUrl: 'https://img.vietqr.io/image/demo.png',
          depositDeadline: '2030-06-09T12:00:00',
          verificationDeadline: null,
        }) as never
      }
      if (url === '/bookings/55/refunds') return apiResponse([]) as never
      if (url === '/bookings/55/cancellation-preview') {
        return apiResponse({ depositPaid: 900_000, refundRate: 1, refundAmount: 900_000 }) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const patch = vi.spyOn(api, 'patch').mockResolvedValue(apiResponse(null) as never)

    render(
      wrap(
        <Routes>
          <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        </Routes>,
        '/my-bookings/55',
      ),
    )

    const cancelBtn = await screen.findByRole('button', { name: /yêu cầu hủy đặt phòng/i })
    fireEvent.click(cancelBtn)

    expect(await screen.findByText('Xác nhận hủy đơn HG-0055')).toBeInTheDocument()
    expect(screen.getByText(/Tỷ lệ hoàn dự kiến: 100%/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }))

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('/bookings/55/cancel', { reason: 'Khách hàng yêu cầu hủy' }),
    )
  })

  it('completes full flow from room selection -> booking -> booking detail -> VietQR display', async () => {
    const { RoomsPage } = await import('./RoomsPage')
    const qrPayload = {
      bookingId: 55,
      amount: 900000,
      transferContent: 'HG0055',
      bankBin: '970436',
      accountNumber: '0123456789',
      accountName: 'KHACH SAN HOANG GIA',
      qrUrl: 'https://img.vietqr.io/image/demo.png',
      depositDeadline: '2030-06-09T12:00:00',
      verificationDeadline: null,
    }

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms') return apiResponse([sampleRoom]) as never
      if (url === '/room-types') return apiResponse([]) as never
      if (url === '/rooms/1') return apiResponse(sampleRoom) as never
      if (url === '/bookings/55') return apiResponse(pendingDepositBooking) as never
      if (url === '/bookings/55/deposit/qr') return apiResponse(qrPayload) as never
      if (url === '/bookings/55/refunds') return apiResponse([]) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    vi.spyOn(api, 'post').mockResolvedValue(apiResponse(pendingDepositBooking) as never)

    render(
      wrap(
        <Routes>
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/my-bookings/:id" element={<BookingDetailPage />} />
        </Routes>,
        '/rooms?checkIn=2030-06-10&checkOut=2030-06-12&guests=2',
      ),
    )

    fireEvent.click(await screen.findByRole('button', { name: /chọn phòng/i }))
    expect(await screen.findByText('1 phòng đã chọn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /tiếp tục đặt phòng/i }))

    const submitBtn = await screen.findByRole('button', { name: /gửi yêu cầu đặt phòng/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByText('Chuyển khoản đặt cọc để giữ phòng')).toBeInTheDocument()
    const qrImg = await screen.findByAltText('Mã VietQR thanh toán đặt cọc')
    expect(qrImg).toBeInTheDocument()

    // Image error triggers readable fallback without breaking transfer details
    fireEvent.error(qrImg)
    expect(await screen.findByText(/Ảnh QR chưa tải được/)).toBeInTheDocument()
    expect(screen.getByText('0123456789')).toBeInTheDocument()
  })
})
