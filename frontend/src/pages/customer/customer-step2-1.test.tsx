import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../../lib/auth'
import { api } from '../../lib/api'
import type { ApiResponse, Room, RoomDay, RoomType, ServiceItem } from '../../lib/types'
import { HomePage } from './HomePage'
import { RoomsPage } from './RoomsPage'
import { RoomDetailPage } from './RoomDetailPage'

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

describe('Customer Step 2.1 — Home, Rooms, RoomDetail', () => {
  it('renders HomePage room types and active services from Java APIs', async () => {
    const roomTypes: RoomType[] = [
      {
        id: 1,
        name: 'Deluxe Garden',
        basePrice: 1_800_000,
        capacity: 2,
        description: 'Phòng rộng rãi với ban công yên tĩnh.',
        imageUrl: null,
        areaSqm: 34,
        amenities: 'Wi-Fi, Điều hòa',
      },
    ]
    const services: ServiceItem[] = [
      { id: 10, name: 'Bữa sáng tại phòng', unitPrice: 180_000, unit: 'suất', active: true },
    ]

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/room-types') return apiResponse(roomTypes) as never
      if (url === '/services') return apiResponse(services) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    render(wrap(<HomePage />))

    expect(await screen.findByText('Deluxe Garden')).toBeInTheDocument()
    expect(await screen.findByText('Bữa sáng tại phòng')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /xem phòng/i })).toHaveAttribute('href', '/rooms')
  })

  it('filters RoomsPage and shows alternative recommendations when empty for a roomTypeId', async () => {
    const types: RoomType[] = [
      { id: 2, name: 'Suite', basePrice: 3_200_000, capacity: 4, description: null, imageUrl: null, areaSqm: 50, amenities: null },
    ]
    const altRoom: Room = {
      id: 9,
      roomNumber: '205',
      floor: 2,
      status: 'AVAILABLE',
      operational: true,
      roomTypeName: 'Deluxe',
      basePrice: 1_900_000,
      capacity: 2,
      description: 'Phòng sáng thoáng.',
      imageUrl: null,
    }

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms') return apiResponse([]) as never
      if (url === '/room-types') return apiResponse(types) as never
      if (url === '/rooms/recommendations') {
        return apiResponse([
          { room: altRoom, score: 92, priceDifference: -1_300_000, availableQuantity: 2, availabilityChecked: true },
        ]) as never
      }
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    render(
      wrap(
        <Routes>
          <Route path="/rooms" element={<RoomsPage />} />
        </Routes>,
        '/rooms?roomTypeId=2&checkIn=2030-06-10&checkOut=2030-06-12',
      ),
    )

    expect(await screen.findByText('Chưa tìm thấy phòng phù hợp')).toBeInTheDocument()
    expect(await screen.findByText('Phòng thay thế dành cho bạn')).toBeInTheDocument()
    expect(screen.getByText(/2 phòng còn trống/)).toBeInTheDocument()
  })

  it('renders RoomDetailPage amenities, room services, and RoomCalendar day selection', async () => {
    const detailRoom: Room = {
      id: 5,
      roomNumber: '301',
      floor: 3,
      status: 'AVAILABLE',
      operational: true,
      roomTypeName: 'Executive Suite',
      basePrice: 2_600_000,
      capacity: 3,
      description: 'Phòng hạng sang yên tĩnh.',
      imageUrl: null,
      areaSqm: 45,
      amenities: 'Wi-Fi tốc độ cao, Bồn tắm, Ban công',
      services: [{ id: 1, name: 'Giặt ủi nhanh', unitPrice: 90_000, unit: 'lần', active: true }],
    }

    const futureMonth = new Date()
    const y = futureMonth.getFullYear()
    const m = String(futureMonth.getMonth() + 1).padStart(2, '0')
    const days: RoomDay[] = [
      { date: `${y}-${m}-25`, status: 'AVAILABLE' },
      { date: `${y}-${m}-26`, status: 'AVAILABLE' },
    ]

    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/rooms/5') return apiResponse(detailRoom) as never
      if (url === '/rooms/5/calendar') return apiResponse(days) as never
      if (url === '/rooms/recommendations') return apiResponse([]) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })

    render(
      wrap(
        <Routes>
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
        </Routes>,
        '/rooms/5',
      ),
    )

    expect(await screen.findByText('Wi-Fi tốc độ cao')).toBeInTheDocument()
    expect(screen.getByText('Giặt ủi nhanh')).toBeInTheDocument()

    const addGuestBtn = screen.getByRole('button', { name: 'Thêm khách' })
    fireEvent.click(addGuestBtn)
    await waitFor(() => expect(screen.getByText(/Chọn ngày lưu trú/)).toBeInTheDocument())
  })
})
