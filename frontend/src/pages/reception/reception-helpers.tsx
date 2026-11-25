import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, CircleAlert } from 'lucide-react'
import { Dialog } from '../../components/ui/dialog'
import { MoneyInput } from '../../components/MoneyInput'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking, Customer, Room } from '../../lib/types'

export const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

export function useFourRowTableScroll(rowCount: number, maxRows = 4) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateHeight = () => {
      const thead = container.querySelector('thead')
      const rows = Array.from(container.querySelectorAll('tbody tr'))
      if (rows.length <= maxRows) {
        container.style.maxHeight = ''
        return
      }
      const headerHeight = thead ? thead.getBoundingClientRect().height : 0
      const visibleRowsHeight = rows
        .slice(0, maxRows)
        .reduce((sum, row) => sum + row.getBoundingClientRect().height, 0)
      if (headerHeight <= 0 && visibleRowsHeight <= 0) return
      const horizontalScrollbar = Math.max(0, container.offsetHeight - container.clientHeight)
      container.style.maxHeight = `${Math.floor(headerHeight + visibleRowsHeight) + horizontalScrollbar}px`
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateHeight)
    observer.observe(container)
    const table = container.querySelector('table')
    if (table) observer.observe(table)
    return () => observer.disconnect()
  }, [rowCount, maxRows])

  return scrollRef
}

export function useSixRowCalendarScroll(roomCount: number) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const updateHeight = () => {
      const labels = Array.from(container.querySelectorAll('.calendar-room-label'))
      if (labels.length <= 6) {
        container.style.maxHeight = ''
        return
      }
      const grid = container.querySelector('.calendar-grid') ?? container
      const gridTop = grid.getBoundingClientRect().top
      const seventhTop = labels[6].getBoundingClientRect().top
      const visibleHeight = seventhTop - gridTop
      if (visibleHeight <= 0) return
      const horizontalScrollbar = Math.max(0, container.offsetHeight - container.clientHeight)
      container.style.maxHeight = `${Math.floor(visibleHeight) + horizontalScrollbar}px`
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateHeight)
    observer.observe(container)
    const grid = container.querySelector('.calendar-grid')
    if (grid) observer.observe(grid)
    return () => observer.disconnect()
  }, [roomCount])

  return scrollRef
}

export const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )

export const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Chưa cập nhật'

export const dateValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseImageUrls = (raw: string): string[] =>
  Array.from(
    new Set(
      raw
        .split(/\r?\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  )

export const bookingNames: Record<string, string> = {
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

export const roomNames: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  OCCUPIED: 'Đang có khách',
  CLEANING: 'Đang dọn',
  MAINTENANCE: 'Bảo trì',
  BOOKED: 'Đã đặt',
}

export const roomFilterNames: Record<string, string> = {
  ...roomNames,
  PENDING_DEPOSIT: 'Chờ đặt cọc',
  PENDING_VERIFICATION: 'Chờ xác minh cọc',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
}

export function RoomThumbnail({
  src,
  alt,
  className,
  iconSize = 18,
}: {
  src?: string | null
  alt: string
  className: string
  iconSize?: number
}) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div className={className}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <BedDouble size={iconSize} strokeWidth={1.6} aria-hidden="true" />
      )}
    </div>
  )
}

export function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="state-card error-state">
      <CircleAlert size={22} />
      <h3>Không thể tải dữ liệu</h3>
      <p>{errorMessage(error)}</p>
      {retry && (
        <button className="button button-outline" onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  )
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  )
}

export function PageTitle({
  kicker,
  title,
  detail,
  action,
}: {
  kicker: string
  title: string
  detail: string
  action?: React.ReactNode
}) {
  return (
    <div className="ops-title">
      <div>
        <span className="section-kicker">{kicker}</span>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {action}
    </div>
  )
}

export function useOpsData() {
  const rooms = useQuery({
    queryKey: ['ops-rooms'],
    queryFn: () => request(api.get<ApiResponse<Room[]>>('/reception/rooms')),
    refetchOnMount: 'always',
  })
  const bookings = useQuery({
    queryKey: ['ops-bookings'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')),
    refetchOnMount: 'always',
  })
  const customers = useQuery({
    queryKey: ['ops-customers'],
    queryFn: () => request(api.get<ApiResponse<Customer[]>>('/reception/customers')),
  })
  return { rooms, bookings, customers }
}

export function useInvalidate() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all(
      ['ops-bookings', 'ops-rooms', 'summary', 'ops-invoices', 'my-bookings'].map((queryKey) =>
        qc.invalidateQueries({ queryKey: [queryKey] }),
      ),
    )
  }
}

export function statusTone(status: string) {
  return (
    (
      {
        PENDING: 'amber',
        PENDING_DEPOSIT: 'amber',
        PENDING_VERIFICATION: 'amber',
        CONFIRMED: 'green',
        AVAILABLE: 'green',
        BOOKED: 'green',
        CHECKED_IN: 'blue',
        OCCUPIED: 'blue',
        CLEANING: 'amber',
        MAINTENANCE: 'gray',
        COMPLETED: 'gray',
        CHECKED_OUT: 'gray',
        CANCELLED: 'gray',
        EXPIRED: 'gray',
        NO_SHOW: 'gray',
        REJECTED: 'gray',
      } as Record<string, string>
    )[status] || 'gray'
  )
}

export function roomReservationStatus(room: Room, bookings: Booking[]) {
  if (['OCCUPIED', 'CLEANING', 'MAINTENANCE'].includes(room.status)) return room.status
  const today = dateValue(new Date())
  const now = Date.now()
  const statusRank: Record<string, number> = {
    PENDING_VERIFICATION: 0,
    PENDING_DEPOSIT: 1,
    PENDING: 2,
    CONFIRMED: 3,
    CHECKED_IN: 4,
  }
  const reservation = bookings
    .filter((booking) => booking.rooms?.some((item) => item.roomId === room.id) && booking.checkOutDate > today)
    .filter((booking) =>
      booking.status === 'PENDING_DEPOSIT'
        ? Boolean(booking.depositDeadline && new Date(booking.depositDeadline).getTime() > now)
        : booking.status === 'PENDING_VERIFICATION'
          ? Boolean(booking.verificationDeadline && new Date(booking.verificationDeadline).getTime() > now)
          : ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status),
    )
    .sort(
      (a, b) =>
        a.checkInDate.localeCompare(b.checkInDate) || (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99),
    )[0]
  return reservation?.status || room.status
}

export function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => !open && close()} title={title}>
      <div className="ops-modal-body">{children}</div>
    </Dialog>
  )
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {type === 'money' ? (
        <MoneyInput value={value} onChange={onChange} required={required} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      )}
    </label>
  )
}
