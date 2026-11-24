import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../lib/auth'
import { api } from '../lib/api'
import type { ApiResponse, Booking, Room } from '../lib/types'
import { AuthPage, BookingPage, MyBookingsPage, RoomsPage } from './customer'
import { ReceptionPage } from './reception'
import { Guard } from '../App'

const room: Room = { id: 1, roomNumber: '101', floor: 1, status: 'AVAILABLE', operational: true, roomTypeName: 'Deluxe', basePrice: 1_500_000, capacity: 2, description: null, imageUrl: null }
const booking: Booking = { id: 51, bookingCode: 'MA-0051', customerId: 7, customerName: 'Nguyễn Minh An', checkInDate: '2030-05-13', checkOutDate: '2030-05-14', numberOfNights: 1, status: 'PENDING', rooms: [{ roomId: 1, roomNumber: '101', guestCount: 2, capacity: 2, pricePerNight: 1_500_000 }], roomNumbers: ['101'], totalRoomCharge: 1_500_000, totalServiceCharge: 0, estimatedTotal: 1_500_000 }
function apiResponse<T>(data: T): { data: ApiResponse<T> } { return { data: { success: true, message: 'OK', data } } }
function wrapper(children: React.ReactNode, initial = '/'): React.ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}><AuthProvider><MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter></AuthProvider></QueryClientProvider>
}
function LocationText() { return <span data-testid="location">{useLocation().pathname}</span> }

describe('customer portal flows', () => {
  it('validates login fields before calling the API, then uses the returned role', async () => {
    vi.spyOn(api, 'get').mockResolvedValue(apiResponse({ id: 4, username: 'guest', fullName: 'Minh An', email: 'a@example.com', phone: null, role: 'ROLE_CUSTOMER', accountStatus: 'ACTIVE' }) as never)
    const post = vi.spyOn(api, 'post').mockResolvedValue(apiResponse({ token: 'session-token', userId: 4, username: 'guest', fullName: 'Minh An', email: 'a@example.com', role: 'ROLE_CUSTOMER' }) as never)
    render(wrapper(<Routes><Route path="/login" element={<><AuthPage mode="login" /><LocationText /></>} /><Route path="/" element={<LocationText />} /></Routes>, '/login'))
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    expect(await screen.findByText('Vui lòng nhập tên đăng nhập')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Tên đăng nhập'), { target: { value: 'guest' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'long-password' } })
    fireEvent.click(screen.getByRole('button', { name: /đăng nhập/i }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/auth/login', { username: 'guest', password: 'long-password' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
  })

  it('selects unique rooms and submits a valid multi-room request to the backend contract', async () => {
    const rooms = [room, { ...room, id: 2, roomNumber: '102' }]
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms') return apiResponse(rooms) as never
      if (url === '/room-types') return apiResponse([]) as never
      if (url === '/rooms/1') return apiResponse(room) as never
      if (url === '/rooms/2') return apiResponse({ ...room, id: 2, roomNumber: '102' }) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const post = vi.spyOn(api, 'post').mockResolvedValue(apiResponse({ ...booking, rooms: [...booking.rooms, { ...booking.rooms[0], roomId: 2, roomNumber: '102' }], roomNumbers: ['101', '102'] }) as never)
    render(wrapper(<Routes><Route path="/rooms" element={<RoomsPage />} /><Route path="/booking" element={<BookingPage />} /></Routes>, '/rooms?selected=1,1,2&checkIn=2030-05-13&checkOut=2030-05-14&guests=2'))
    expect(await screen.findByText('2 phòng đã chọn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /tiếp tục đặt phòng/i }))
    expect(await screen.findByText('Phòng đã chọn')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /gửi yêu cầu đặt phòng/i }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/bookings', expect.objectContaining({ checkInDate: '2030-05-13', checkOutDate: '2030-05-14', roomIds: [1, 2], pricingType: 'STANDARD' })))
  })

  it('asks for confirmation and sends booking cancellation through the API', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/bookings/me') return apiResponse([booking]) as never
      if (url === '/bookings/51/cancellation-preview') {
        return apiResponse({ depositPaid: 450_000, refundRate: 1, refundAmount: 450_000 }) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const patch = vi.spyOn(api, 'patch').mockResolvedValue(apiResponse(null) as never)
    render(wrapper(<MyBookingsPage />))
    expect(await screen.findByText('MA-0051')).toBeInTheDocument()
    expect(screen.getByText('Chờ xác nhận')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /hủy đặt phòng/i }))
    expect(await screen.findByText('Xác nhận hủy đơn MA-0051')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn' }))
    await waitFor(() => expect(patch).toHaveBeenCalledWith('/bookings/51/cancel', { reason: 'Khách hàng yêu cầu hủy' }))
  })

  it('shows backend room status and blocks check-in when a room is not ready', async () => {
    const checkedInCandidate = { ...booking, status: 'CONFIRMED' as const }
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/reception/bookings') return apiResponse([checkedInCandidate]) as never
      if (url === '/reception/rooms') return apiResponse([{ ...room, status: 'MAINTENANCE' }]) as never
      if (url === '/reception/customers') return apiResponse([]) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    render(wrapper(<Routes><Route path="/reception/check-in" element={<ReceptionPage kind="check-in" />} /></Routes>, '/reception/check-in'))
    fireEvent.click(await screen.findByRole('button', { name: /nguyễn minh an/i }))
    expect(await screen.findByText(/Bảo trì/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /xác nhận nhận phòng/i })).toBeDisabled()
  })

  it('redirects an unauthenticated user away from protected routes', async () => {
    render(wrapper(<Routes><Route path="/private" element={<Guard><span>Private</span></Guard>} /><Route path="/login" element={<LocationText />} /></Routes>, '/private'))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
    expect(screen.queryByText('Private')).not.toBeInTheDocument()
  })

  it('renders invoice totals from the backend response', async () => {
    const invoice = { id: 22, bookingId: 51, customerName: booking.customerName, roomAmount: 1_500_000, serviceAmount: 250_000, tax: 175_000, surcharge: 0, discount: 0, totalAmount: 1_925_000, successfulPayments: 1_000_000, balanceDue: 925_000, status: 'ISSUED' as const, paymentMethod: null, isPaid: false, paidAt: null, items: [], payments: [] }
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/reception/bookings') return apiResponse([{ ...booking, status: 'CHECKED_IN' }]) as never
      if (url === '/reception/rooms') return apiResponse([room]) as never
      if (url === '/reception/customers') return apiResponse([]) as never
      if (url === '/invoices/booking/51') return apiResponse(invoice) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    render(wrapper(<Routes><Route path="/reception/invoices" element={<ReceptionPage kind="invoices" />} /></Routes>, '/reception/invoices'))
    fireEvent.click(await screen.findByRole('button', { name: /nguyễn minh an/i }))
    expect(await screen.findByText(/1\.925\.000/)).toBeInTheDocument()
    expect(screen.getByText('Còn lại').parentElement).toHaveTextContent(/925\.000/)
  })
})
