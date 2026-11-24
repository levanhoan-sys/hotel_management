import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AuthProvider } from '../lib/auth'
import { api } from '../lib/api'
import type { ApiResponse } from '../lib/types'
import { AdminPricing } from './admin'
import { PublicLayout } from '../components/layout'

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

describe('AdminPricing detailed Recharts bar visualization', () => {
  it('renders the detailed bar chart, 3 mode toggles, month breakdown, and updates multipliers', async () => {
    const rates = [
      { strategy: 'STANDARD', multiplier: 1.0, defaultMultiplier: 1.0 },
      { strategy: 'WEEKEND', multiplier: 1.2, defaultMultiplier: 1.2 },
      { strategy: 'HOLIDAY', multiplier: 1.5, defaultMultiplier: 1.5 },
    ]
    const history = {
      blendedMultiplier: 1.09,
      months: [
        { month: '2026-06', label: 'Th6/2026', shortLabel: 'Th6', seasonalContext: 'Cao điểm du lịch hè', occupancyRate: 82, averagePrice: 1_980_000, prices: { '1': 725_000, '2': 990_000 } },
        { month: '2026-07', label: 'Th7/2026', shortLabel: 'Th7', seasonalContext: 'Đỉnh điểm mùa hè', occupancyRate: 86, averagePrice: 2_050_000, prices: { '1': 745_000, '2': 1_020_000 } },
        { month: '2026-08', label: 'Th8/2026', shortLabel: 'Th8', seasonalContext: 'Cuối hè & gia đình', occupancyRate: 78, averagePrice: 1_910_000, prices: { '1': 700_000, '2': 960_000 } },
        { month: '2026-09', label: 'Th9/2026', shortLabel: 'Th9', seasonalContext: 'Giao mùa thu, giá ưu đãi', occupancyRate: 63, averagePrice: 1_710_000, prices: { '1': 625_000, '2': 855_000 } },
        { month: '2026-10', label: 'Th10/2026', shortLabel: 'Th10', seasonalContext: 'Mùa thu Hà Nội', occupancyRate: 79, averagePrice: 1_930_000, prices: { '1': 705_000, '2': 970_000 } },
        { month: '2026-11', label: 'Th11/2026', shortLabel: 'Th11', seasonalContext: 'Cuối thu & sự kiện (Hiện tại)', occupancyRate: 73, averagePrice: 1_880_000, prices: { '1': 710_000, '2': 975_000 } },
      ],
      roomTypes: [
        { id: 1, name: 'Standard Single', basePrice: 650_000, currentPrice: 710_000, minPrice: 625_000, maxPrice: 745_000, changePercent: -2.1 },
        { id: 2, name: 'Standard Double', basePrice: 890_000, currentPrice: 975_000, minPrice: 855_000, maxPrice: 1_020_000, changePercent: -1.5 },
      ],
    }

    const getSpy = vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/admin/pricing') return apiResponse(rates) as never
      if (url === '/admin/pricing/history') return apiResponse(history) as never
      throw new Error(`Unexpected GET ${String(url)}`)
    })
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue(apiResponse({ strategy: 'STANDARD', multiplier: 1.15, defaultMultiplier: 1.0 }) as never)

    render(wrap(<AdminPricing />))

    expect(await screen.findByText('Xu hướng giá phòng theo hạng phòng')).toBeInTheDocument()
    expect(await screen.findByLabelText('Biểu đồ biến động giá phòng 6 tháng gần nhất')).toBeInTheDocument()
    expect(screen.getAllByText('Standard Single').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Standard Double').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('Chi tiết theo hạng phòng — Th11/2026')).toBeInTheDocument()

    // Select an earlier month to verify detailed breakdown updates
    const julyBtn = screen.getByRole('button', { name: /Th7\/2026/i })
    fireEvent.click(julyBtn)
    expect(screen.getByText('Chi tiết theo hạng phòng — Th7/2026')).toBeInTheDocument()

    const percentBtn = screen.getByRole('button', { name: 'Biến động (%)' })
    fireEvent.click(percentBtn)
    expect(percentBtn).toHaveAttribute('aria-pressed', 'true')

    const strategyBtn = screen.getByRole('button', { name: 'So sánh 3 chiến lược' })
    fireEvent.click(strategyBtn)
    expect(strategyBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Chú giải 3 mức giá chiến lược')).toBeInTheDocument()

    const inputs = screen.getAllByLabelText('Hệ số giá (0,10–10,00)')
    fireEvent.change(inputs[0], { target: { value: '1.15' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Lưu' })[0])

    await waitFor(() => expect(putSpy).toHaveBeenCalledWith('/admin/pricing/STANDARD', { multiplier: 1.15 }))
    await waitFor(() => expect(getSpy).toHaveBeenCalledWith('/admin/pricing/history'))
  })
})

describe('PublicLayout mobile navigation', () => {
  it('opens and closes mobile menu and provides links to rooms, bookings, and login', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(
      wrap(
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<div>Trang chủ test</div>} />
          </Route>
        </Routes>,
      ),
    )

    const toggle = screen.getByRole('button', { name: 'Mở menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute('aria-expanded', 'true')

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(nav).toHaveClass('open')
    expect(nav).toHaveTextContent('Phòng nghỉ')
    expect(nav).toHaveTextContent('Đơn đặt phòng')
    expect(nav).toHaveTextContent('Đăng nhập')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Mở menu' })).toHaveAttribute('aria-expanded', 'false')
    expect(nav).not.toHaveClass('open')
  })
})
