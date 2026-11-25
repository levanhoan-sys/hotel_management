import { CircleAlert } from 'lucide-react'
import { errorMessage } from '../../lib/api'
import type { BookingStatus, RoomStatus } from '../../lib/types'

export type Employee = {
  id: number
  username: string
  fullName: string
  email: string
  phone: string | null
  employeeCode: string
  salary: number | null
  hireDate: string
  deskNumber: number | null
  role: 'ROLE_ADMIN' | 'ROLE_RECEPTIONIST'
  accountStatus: 'ACTIVE' | 'LOCKED'
}

export type EmployeeForm = {
  username: string
  password: string
  fullName: string
  email: string
  phone: string
  employeeCode: string
  salary: string
  hireDate: string
  deskNumber: string
}

export type PricingRate = {
  strategy: 'STANDARD' | 'WEEKEND' | 'HOLIDAY'
  multiplier: number
  defaultMultiplier: number
}

export type PricingHistoryMonth = {
  month: string
  label: string
  shortLabel: string
  seasonalContext: string
  occupancyRate: number
  averagePrice: number
  prices: Record<string, number>
}

export type PricingHistoryRoomType = {
  id: number
  name: string
  basePrice: number
  currentPrice: number
  minPrice: number
  maxPrice: number
  changePercent: number
}

export type PricingHistoryResponse = {
  months: PricingHistoryMonth[]
  roomTypes: PricingHistoryRoomType[]
  blendedMultiplier: number
}

export type ChartMode = 'vnd' | 'percent' | 'strategy'
export type AdminRoomTone = 'ALL' | 'ready' | 'occupied' | 'cleaning' | 'maintenance'

export const CHART_SERIES_COLORS = ['#173d2b', '#3b6e52', '#b58a45', '#2e5372', '#8f4b3e', '#7a6855']

export const blankForm = (): EmployeeForm => ({
  username: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  employeeCode: '',
  salary: '',
  hireDate: new Date().toISOString().slice(0, 10),
  deskNumber: '1',
})

export const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)

export const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )

export const compactVnd = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 1 : 2).replace('.', ',')} tr`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(value)
}

export const formatSignedPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`

export const adminBookingNames: Record<BookingStatus, string> = {
  PENDING_DEPOSIT: 'Chờ đặt cọc',
  PENDING_VERIFICATION: 'Chờ xác minh cọc',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  CHECKED_IN: 'Đang lưu trú',
  COMPLETED: 'Hoàn tất',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  NO_SHOW: 'Không đến',
}

export function adminBookingTone(status: BookingStatus) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'green'
  if (status === 'CHECKED_IN') return 'blue'
  if (status === 'PENDING' || status === 'PENDING_DEPOSIT' || status === 'PENDING_VERIFICATION') return 'amber'
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED' || status === 'NO_SHOW') return 'red'
  return 'gray'
}

export function adminRoomTone(status: RoomStatus): Exclude<AdminRoomTone, 'ALL'> {
  if (status === 'OCCUPIED') return 'occupied'
  if (status === 'CLEANING') return 'cleaning'
  if (status === 'MAINTENANCE') return 'maintenance'
  return 'ready'
}

export const adminRoomNames: Record<RoomStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  BOOKED: 'Đã đặt',
  OCCUPIED: 'Đang có khách',
  CLEANING: 'Đang dọn',
  MAINTENANCE: 'Bảo trì',
}

export const pricingTitleMap: Record<PricingRate['strategy'], { title: string; detail: string }> = {
  STANDARD: { title: 'Giá tiêu chuẩn', detail: 'Ngày thường trong tuần' },
  WEEKEND: { title: 'Giá cuối tuần', detail: 'Thứ Sáu đến Chủ Nhật' },
  HOLIDAY: { title: 'Giá ngày lễ', detail: 'Kỳ nghỉ lễ & cao điểm' },
}

export function Loading() {
  return (
    <div className="table-skeleton">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  )
}

export function Failure({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="state-card error-state">
      <CircleAlert size={22} />
      <h3>Không thể tải dữ liệu</h3>
      <p>{errorMessage(error)}</p>
      <button className="button button-outline" onClick={retry}>
        Thử lại
      </button>
    </div>
  )
}
