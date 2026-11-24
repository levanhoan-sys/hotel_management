import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  DoorOpen,
  Download,
  FileText,
  KeyRound,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from '../components/ui/dialog'
import { ConfirmDialog } from '../components/shared/ConfirmDialog'
import { MoneyInput } from '../components/MoneyInput'
import { api, errorMessage, request } from '../lib/api'
import { downloadPrintableInvoice, localizeInvoiceItemDescription, tryNativePrint } from '../lib/invoice-print'
import type {
  ApiResponse,
  Booking,
  Customer,
  Invoice,
  Room,
  RoomStatus,
  RoomType,
  ServiceItem,
  ServiceUsage,
  Summary,
} from '../lib/types'
import './reception-overview.css'

const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

function useFourRowTableScroll(rowCount: number, maxRows = 4) {
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

function useSixRowCalendarScroll(roomCount: number) {
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

const date = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )

const dateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : 'Chưa cập nhật'

const dateValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const parseImageUrls = (raw: string): string[] =>
  Array.from(
    new Set(
      raw
        .split(/\r?\n|,/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  )

const bookingNames: Record<string, string> = {
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

const roomNames: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  OCCUPIED: 'Đang có khách',
  CLEANING: 'Đang dọn',
  MAINTENANCE: 'Bảo trì',
  BOOKED: 'Đã đặt',
}

const roomFilterNames: Record<string, string> = {
  ...roomNames,
  PENDING_DEPOSIT: 'Chờ đặt cọc',
  PENDING_VERIFICATION: 'Chờ xác minh cọc',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
}

function RoomThumbnail({
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

function ErrorPanel({ error, retry }: { error: unknown; retry?: () => void }) {
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

function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="table-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  )
}

function PageTitle({
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

function useOpsData() {
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

function useInvalidate() {
  const qc = useQueryClient()
  return async () => {
    await Promise.all(
      ['ops-bookings', 'ops-rooms', 'summary', 'ops-invoices', 'my-bookings'].map((queryKey) =>
        qc.invalidateQueries({ queryKey: [queryKey] }),
      ),
    )
  }
}

type OverviewScheduleTab = 'arrivals' | 'departures' | 'pending'
type OverviewRoomTone = 'ALL' | 'ready' | 'occupied' | 'cleaning' | 'maintenance'

function roomTone(status: RoomStatus): Exclude<OverviewRoomTone, 'ALL'> {
  if (status === 'OCCUPIED') return 'occupied'
  if (status === 'CLEANING') return 'cleaning'
  if (status === 'MAINTENANCE') return 'maintenance'
  return 'ready'
}

export function ReceptionHome() {
  const [scheduleTab, setScheduleTab] = useState<OverviewScheduleTab>('arrivals')
  const [roomFilter, setRoomFilter] = useState<OverviewRoomTone>('ALL')

  const summary = useQuery({
    queryKey: ['summary'],
    queryFn: () => request(api.get<ApiResponse<Summary>>('/reception/summary')),
  })
  const bookings = useQuery({
    queryKey: ['ops-bookings'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')),
  })
  const roomList = useQuery({
    queryKey: ['ops-rooms'],
    queryFn: () => request(api.get<ApiResponse<Room[]>>('/reception/rooms')),
  })
  const pendingDeposits = useQuery({
    queryKey: ['reception-deposits'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/deposits/pending')),
  })
  const pendingServices = useQuery({
    queryKey: ['ops-pending-service-usages'],
    queryFn: () => request(api.get<ApiResponse<ServiceUsage[]>>('/reception/service-usages/pending')),
  })

  const totals = summary.data
  const data = bookings.data || []
  const allRooms = roomList.data || []
  const depositQueue = pendingDeposits.data || []
  const serviceQueue = pendingServices.data || []
  const today = dateValue(new Date())

  const arrivals = data.filter((b) => b.checkInDate === today && b.status === 'CONFIRMED')
  const departures = data.filter((b) => b.checkOutDate === today && b.status === 'CHECKED_IN')
  const pendingBookings = data.filter((b) => b.status === 'PENDING')
  const pendingActionCount = pendingBookings.length + depositQueue.length + serviceQueue.length

  const occupancyPct = totals && totals.totalRooms > 0
    ? Math.round((totals.occupiedRooms / totals.totalRooms) * 100)
    : 0

  const roomStatusCards: Array<{
    name: string
    count: number
    tone: Exclude<OverviewRoomTone, 'ALL'>
  }> = totals
    ? [
        { name: 'Sẵn sàng', count: totals.availableRooms, tone: 'ready' },
        { name: 'Đang lưu trú', count: totals.occupiedRooms, tone: 'occupied' },
        { name: 'Đang dọn', count: totals.cleaningRooms, tone: 'cleaning' },
        { name: 'Bảo trì', count: totals.maintenanceRooms, tone: 'maintenance' },
      ]
    : []

  const filteredRooms = [...allRooms]
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }))
    .filter((room) => roomFilter === 'ALL' || roomTone(room.status) === roomFilter)

  const recent = [...data].sort((a, b) => b.id - a.id).slice(0, 6)

  const recentBookingTarget = (booking: Booking) => {
    if (booking.status === 'PENDING_VERIFICATION') return `/reception/deposits?bookingId=${booking.id}`
    if (booking.status === 'CONFIRMED') return `/reception/check-in?bookingId=${booking.id}`
    if (booking.status === 'CHECKED_IN') return `/reception/check-out?bookingId=${booking.id}`
    return `/reception/bookings?search=${encodeURIComponent(booking.bookingCode)}`
  }

  const pendingItems = [
    ...depositQueue.map((booking) => ({
      id: `deposit-${booking.id}`,
      title: `${booking.customerName} · Đối chiếu tiền cọc`,
      detail: `${booking.bookingCode} · ${money(booking.depositAmount ?? 0)}`,
      badge: 'Chờ xác minh cọc',
      tone: 'amber',
      to: `/reception/deposits?bookingId=${booking.id}`,
      cta: 'Đối chiếu',
    })),
    ...pendingBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      title: `${booking.customerName} · Đơn chờ xác nhận`,
      detail: `${booking.bookingCode} · Phòng ${booking.roomNumbers?.join(', ') || 'Chưa gán'} · ${date(booking.checkInDate)}`,
      badge: 'Chờ xác nhận',
      tone: 'amber',
      to: `/reception/bookings?search=${encodeURIComponent(booking.bookingCode)}`,
      cta: 'Xem đơn',
    })),
    ...serviceQueue.map((usage) => ({
      id: `service-${usage.id}`,
      title: `${usage.serviceName} · ${usage.customerName}`,
      detail: `${usage.bookingCode}${usage.roomNumber ? ` · Phòng ${usage.roomNumber}` : ''} · ${usage.quantity} ${usage.unit}`,
      badge: 'Dịch vụ chờ duyệt',
      tone: 'blue',
      to: '/reception/services',
      cta: 'Duyệt ngay',
    })),
  ]

  return (
    <div className="ops-page reception-overview">
      <header className="overview-header">
        <div className="overview-header-copy">
          <span className="overview-kicker">Ca lễ tân · Hoàng Gia Hotel</span>
          <h1>Tổng quan vận hành</h1>
          <div className="overview-header-meta">
            <time dateTime={today}>
              {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}
            </time>
            <span aria-hidden="true">·</span>
            <span>{data.length} hồ sơ đặt phòng đang theo dõi</span>
          </div>
        </div>
        <div className="overview-header-actions">
          <Link to="/reception/calendar" className="overview-btn-secondary">
            <CalendarDays size={18} aria-hidden="true" /> Lịch phòng
          </Link>
          <Link to="/reception/bookings" className="overview-btn-primary">
            <ClipboardCheck size={18} aria-hidden="true" /> Quản lý đặt phòng <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="overview-kpi-grid" aria-label="Chỉ số vận hành trong ngày">
        <article className="overview-kpi-card">
          <div className="overview-kpi-head">
            <span className="overview-kpi-label">Công suất phòng</span>
            <span className="overview-kpi-icon">
              <BedDouble size={20} aria-hidden="true" />
            </span>
          </div>
          <p className="overview-kpi-value">{summary.isPending ? '—' : `${occupancyPct}%`}</p>
          <p className="overview-kpi-meta">
            {totals
              ? `${totals.occupiedRooms}/${totals.totalRooms} phòng đang có khách · ${totals.availableRooms} sẵn sàng`
              : 'Đang cập nhật số liệu phòng'}
          </p>
        </article>

        <article className="overview-kpi-card">
          <div className="overview-kpi-head">
            <span className="overview-kpi-label">Khách đến &amp; đi hôm nay</span>
            <span className="overview-kpi-icon" data-tone="blue">
              <KeyRound size={20} aria-hidden="true" />
            </span>
          </div>
          <p className="overview-kpi-value">
            {bookings.isPending ? '—' : `${arrivals.length} đến / ${departures.length} đi`}
          </p>
          <p className="overview-kpi-meta">
            {bookings.isPending
              ? 'Đang tải lịch lưu trú hôm nay'
              : `${totals?.checkedInBookings ?? 0} đơn đang lưu trú tại khách sạn`}
          </p>
        </article>

        <article className="overview-kpi-card">
          <div className="overview-kpi-head">
            <span className="overview-kpi-label">Hồ sơ chờ xử lý</span>
            <span className="overview-kpi-icon" data-tone="amber">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
          </div>
          <p className="overview-kpi-value">{bookings.isPending ? '—' : pendingActionCount}</p>
          <p className="overview-kpi-meta">
            {pendingBookings.length} đơn đặt · {depositQueue.length} tiền cọc · {serviceQueue.length} dịch vụ
          </p>
        </article>

        <article className="overview-kpi-card is-revenue">
          <div className="overview-kpi-head">
            <span className="overview-kpi-label">Doanh thu đã thanh toán</span>
            <span className="overview-kpi-icon" data-tone="gold">
              <FileText size={20} aria-hidden="true" />
            </span>
          </div>
          <p className="overview-kpi-value">
            {summary.isPending ? '—' : summary.isError || !totals ? 'Chưa tải được' : money(totals.revenue)}
          </p>
          <Link to="/reception/invoices" className="overview-kpi-link">
            Xem danh sách hóa đơn <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </article>
      </section>

      <div className="overview-main-grid">
        <section className="overview-panel overview-schedule-panel" aria-labelledby="overview-schedule-title">
          <div className="overview-panel-head">
            <div>
              <h2 id="overview-schedule-title">Điều phối trong ngày</h2>
              <p className="overview-panel-desc">Theo dõi nhận phòng, trả phòng và các yêu cầu cần lễ tân xử lý.</p>
            </div>
            <Link to="/reception/check-in" className="overview-action-link">
              Quầy thủ tục <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="overview-tabs" role="tablist" aria-label="Phân loại công việc lễ tân">
            <button
              type="button"
              role="tab"
              aria-selected={scheduleTab === 'arrivals'}
              className={`overview-tab-btn ${scheduleTab === 'arrivals' ? 'is-active' : ''}`}
              onClick={() => setScheduleTab('arrivals')}
            >
              <span>Nhận phòng</span>
              <span className="overview-tab-count">{arrivals.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scheduleTab === 'departures'}
              className={`overview-tab-btn ${scheduleTab === 'departures' ? 'is-active' : ''}`}
              onClick={() => setScheduleTab('departures')}
            >
              <span>Trả phòng</span>
              <span className="overview-tab-count">{departures.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scheduleTab === 'pending'}
              className={`overview-tab-btn ${scheduleTab === 'pending' ? 'is-active' : ''}`}
              onClick={() => setScheduleTab('pending')}
            >
              <span>Chờ xử lý</span>
              <span className="overview-tab-count">{pendingActionCount}</span>
            </button>
          </div>

          {bookings.isPending ? (
            <LoadingRows count={3} />
          ) : bookings.isError ? (
            <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
          ) : scheduleTab === 'arrivals' ? (
            arrivals.length ? (
              <ul className="overview-schedule-list">
                {arrivals.map((booking) => (
                  <li key={booking.id}>
                    <Link to={`/reception/check-in?bookingId=${booking.id}`} className="overview-schedule-row">
                      <span className="overview-schedule-main">
                        <strong>{booking.customerName}</strong>
                        <small>
                          {booking.bookingCode} · Phòng {booking.roomNumbers?.join(', ') || 'Chưa gán'} · {booking.numberOfNights} đêm
                        </small>
                      </span>
                      <span className="status-badge green">Đã xác nhận</span>
                      <span className="overview-row-cta">
                        Nhận phòng <ChevronRight size={17} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overview-empty">
                <p>Chưa có lượt nhận phòng nào được lên lịch trong hôm nay.</p>
              </div>
            )
          ) : scheduleTab === 'departures' ? (
            departures.length ? (
              <ul className="overview-schedule-list">
                {departures.map((booking) => (
                  <li key={booking.id}>
                    <Link to={`/reception/check-out?bookingId=${booking.id}`} className="overview-schedule-row">
                      <span className="overview-schedule-main">
                        <strong>{booking.customerName}</strong>
                        <small>
                          {booking.bookingCode} · Phòng {booking.roomNumbers?.join(', ') || '—'} · Dự kiến {money(booking.estimatedTotal)}
                        </small>
                      </span>
                      <span className="status-badge blue">Đang lưu trú</span>
                      <span className="overview-row-cta">
                        Trả phòng <ChevronRight size={17} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="overview-empty">
                <p>Không có phòng nào đến hạn trả phòng trong hôm nay.</p>
              </div>
            )
          ) : pendingItems.length ? (
            <ul className="overview-schedule-list">
              {pendingItems.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <Link to={item.to} className="overview-schedule-row">
                    <span className="overview-schedule-main">
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <span className={`status-badge ${item.tone}`}>{item.badge}</span>
                    <span className="overview-row-cta">
                      {item.cta} <ChevronRight size={17} aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="overview-empty">
              <p>Tất cả đơn đặt phòng, tiền cọc và yêu cầu dịch vụ đã được xử lý.</p>
            </div>
          )}

          <div className="overview-quick-strip">
            <Link to="/reception/check-in" className="overview-task-pill">
              <span>Nhận phòng</span>
              <strong>{arrivals.length}</strong>
            </Link>
            <Link to="/reception/check-out" className="overview-task-pill">
              <span>Trả phòng</span>
              <strong>{departures.length}</strong>
            </Link>
            <Link to="/reception/deposits" className="overview-task-pill">
              <span>Xác minh cọc</span>
              <strong>{depositQueue.length}</strong>
            </Link>
          </div>
        </section>

        <section className="overview-panel overview-rooms-panel" aria-labelledby="overview-rooms-title">
          <div className="overview-panel-head">
            <div>
              <h2 id="overview-rooms-title">Tình trạng phòng trực tiếp</h2>
              <p className="overview-panel-desc">Nhấp vào từng trạng thái để lọc nhanh sơ đồ phòng.</p>
            </div>
            <Link to="/reception/rooms" className="overview-action-link">
              Quản lý phòng <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {summary.isPending ? (
            <LoadingRows count={2} />
          ) : summary.isError ? (
            <ErrorPanel error={summary.error} retry={() => void summary.refetch()} />
          ) : (
            totals && (
              <>
                <div className="overview-room-summary">
                  <div className="overview-room-total">
                    <strong>{totals.totalRooms}</strong> phòng toàn khách sạn
                  </div>
                  <span className="overview-occupancy-note">Công suất hiện tại: {occupancyPct}%</span>
                </div>

                <div className="overview-room-bar" aria-hidden="true">
                  {roomStatusCards
                    .filter((room) => room.count > 0)
                    .map((room) => (
                      <span
                        key={room.tone}
                        data-tone={room.tone}
                        style={{ width: `${(room.count / Math.max(1, totals.totalRooms)) * 100}%` }}
                      />
                    ))}
                </div>

                <div className="overview-room-stats">
                  {roomStatusCards.map(({ name, count, tone }) => {
                    const isSelected = roomFilter === tone
                    return (
                      <button
                        key={tone}
                        type="button"
                        data-tone={tone}
                        aria-pressed={isSelected}
                        className={`overview-room-stat-btn ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setRoomFilter((prev) => (prev === tone ? 'ALL' : tone))}
                      >
                        <strong>{count}</strong>
                        <span>{name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          )}

          <div className="overview-room-board-head">
            <span>
              Sơ đồ phòng ({filteredRooms.length} phòng)
            </span>
            {roomFilter !== 'ALL' && (
              <button
                type="button"
                className="overview-clear-filter"
                onClick={() => setRoomFilter('ALL')}
              >
                Hiện tất cả
              </button>
            )}
          </div>

          {roomList.isPending ? (
            <LoadingRows count={2} />
          ) : roomList.isError ? (
            <ErrorPanel error={roomList.error} retry={() => void roomList.refetch()} />
          ) : filteredRooms.length ? (
            <div className="overview-room-board">
              {filteredRooms.slice(0, 9).map((room) => {
                const tone = roomTone(room.status)
                return (
                  <Link key={room.id} to="/reception/rooms" className="overview-room-tile" data-tone={tone}>
                    <div className="overview-room-tile-top">
                      <strong>P.{room.roomNumber}</strong>
                      <span className="overview-room-state">{roomNames[room.status] || room.status}</span>
                    </div>
                    <small>
                      {room.roomTypeName} · Tầng {room.floor}
                    </small>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="overview-empty">
              <p>Không có phòng nào thuộc trạng thái đang chọn.</p>
            </div>
          )}
        </section>
      </div>

      <section className="overview-panel overview-recent-panel" aria-labelledby="overview-recent-title">
        <div className="overview-panel-head">
          <div>
            <h2 id="overview-recent-title">Đặt phòng gần đây</h2>
            <p className="overview-panel-desc">Cập nhật chi tiết 6 hồ sơ đặt phòng mới nhất trong hệ thống.</p>
          </div>
          <Link to="/reception/bookings" className="overview-action-link">
            Xem tất cả đặt phòng <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        {bookings.isPending ? (
          <LoadingRows count={4} />
        ) : bookings.isError ? (
          <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
        ) : recent.length ? (
          <div className="overview-table-wrap">
            <table className="overview-recent-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Phòng</th>
                  <th>Lưu trú</th>
                  <th>Tổng dự kiến</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <span className="overview-code">{booking.bookingCode}</span>
                    </td>
                    <td>
                      <strong>{booking.customerName}</strong>
                      <span className="overview-cell-sub">
                        {booking.rooms?.reduce((sum, r) => sum + r.guestCount, 0) || 1} khách
                      </span>
                    </td>
                    <td>
                      <strong>{booking.roomNumbers?.length ? booking.roomNumbers.join(', ') : 'Chưa gán'}</strong>
                      <span className="overview-cell-sub">{booking.roomNumbers?.length || 0} phòng</span>
                    </td>
                    <td>
                      <span>
                        {date(booking.checkInDate)} → {date(booking.checkOutDate)}
                      </span>
                      <span className="overview-cell-sub">{booking.numberOfNights} đêm</span>
                    </td>
                    <td>
                      <span className="overview-money">{money(booking.estimatedTotal)}</span>
                    </td>
                    <td>
                      <span className={'status-badge ' + statusTone(booking.status)}>
                        {bookingNames[booking.status] || booking.status}
                      </span>
                    </td>
                    <td>
                      <Link to={recentBookingTarget(booking)} className="overview-row-cta">
                        Chi tiết <ChevronRight size={16} aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overview-empty">
            <p>Chưa có dữ liệu đặt phòng nào được ghi nhận.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function statusTone(status: string) {
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

function roomReservationStatus(room: Room, bookings: Booking[]) {
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

export function ReceptionPage({
  kind,
}: {
  kind: 'rooms' | 'room-types' | 'bookings' | 'calendar' | 'check-in' | 'check-out' | 'services' | 'invoices'
}) {
  if (kind === 'rooms') return <RoomsManagement />
  if (kind === 'room-types') return <RoomTypesManagement />
  if (kind === 'bookings') return <BookingsManagement />
  if (kind === 'calendar') return <RoomCalendar />
  if (kind === 'check-in') return <Lifecycle kind="check-in" />
  if (kind === 'check-out') return <Lifecycle kind="check-out" />
  if (kind === 'services') return <ServicesManagement />
  return <InvoicesManagement />
}

export function DepositVerificationPage() {
  type Qr = {
    amount: number
    transferContent: string
    bankBin: string
    accountNumber: string
    accountName: string
    qrUrl: string
  }
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedBookingId = Number(searchParams.get('bookingId'))
  const pending = useQuery({
    queryKey: ['reception-deposits'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/deposits/pending')),
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    Number.isInteger(requestedBookingId) && requestedBookingId > 0 ? requestedBookingId : null,
  )
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [dialogAction, setDialogAction] = useState<'confirm' | 'reject' | null>(null)

  useEffect(() => {
    if (Number.isInteger(requestedBookingId) && requestedBookingId > 0) {
      setSelectedId(requestedBookingId)
    }
  }, [requestedBookingId])

  const selected = pending.data?.find((item) => item.id === selectedId) || pending.data?.[0]

  useEffect(() => {
    if (selected) setAmount(String(selected.depositAmount ?? ''))
  }, [selected?.id, selected?.depositAmount])

  const qr = useQuery({
    queryKey: ['reception-deposit-qr', selected?.id],
    queryFn: () => request(api.get<ApiResponse<Qr>>(`/bookings/${selected!.id}/deposit/qr`)),
    enabled: Boolean(selected),
  })

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['reception-deposits'] }),
      qc.invalidateQueries({ queryKey: ['ops-bookings'] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
    ])
  }

  const confirm = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<unknown>>(`/reception/deposits/${selected!.id}/confirm`, {
          actualReceivedAmount: Number(amount),
          transactionReference: reference.trim(),
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã xác nhận cọc sau khi đối chiếu')
      setDialogAction(null)
      setReference('')
      setAmount('')
      await refresh()
    },
    onError: (e) => {
      setDialogAction(null)
      toast.error(errorMessage(e))
    },
  })

  const reject = useMutation({
    mutationFn: () => request(api.post<ApiResponse<unknown>>(`/reception/deposits/${selected!.id}/reject`)),
    onSuccess: async () => {
      toast.success('Đã từ chối xác minh')
      setDialogAction(null)
      await refresh()
    },
    onError: (e) => {
      setDialogAction(null)
      toast.error(errorMessage(e))
    },
  })

  return (
    <div className="ops-page">
      <PageTitle
        kicker="ĐỐI SOÁT CHUYỂN KHOẢN"
        title="Xác nhận tiền cọc"
        detail="Đối chiếu giao dịch trong tài khoản ngân hàng trước khi xác nhận đặt phòng"
      />
      {pending.isPending ? (
        <LoadingRows />
      ) : pending.isError ? (
        <ErrorPanel error={pending.error} retry={() => void pending.refetch()} />
      ) : (
        <div className="invoice-layout">
          <section className="panel invoice-booking-list">
            <span className="section-kicker invoice-list-label">Chờ xác minh ({pending.data?.length || 0})</span>
            {pending.data?.map((item) => (
              <button
                className={`invoice-booking-row ${selected?.id === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id)
                  setAmount(String(item.depositAmount ?? ''))
                  setReference('')
                }}
              >
                <span className="booking-result-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <b>{item.customerName}</b>
                  <small>
                    {item.bookingCode} —{' '}
                    {item.depositReportedAt ? new Date(item.depositReportedAt).toLocaleString('vi-VN') : '—'}
                  </small>
                </span>
                <b>{money(item.depositAmount || 0)}</b>
              </button>
            ))}
            {!pending.data?.length && <div className="empty-compact">Không có khoản cọc đang chờ</div>}
          </section>

          <section className="panel invoice-detail">
            {selected ? (
              <>
                <div className="invoice-head">
                  <div>
                    <span className="section-kicker">{selected.bookingCode}</span>
                    <h3>{selected.customerName}</h3>
                    <p>
                      Giữ phòng đến{' '}
                      {selected.verificationDeadline
                        ? new Date(selected.verificationDeadline).toLocaleString('vi-VN')
                        : '—'}
                    </p>
                  </div>
                  <span className="status-badge amber">Chờ xác minh</span>
                </div>
                <p>
                  Tiền cọc cần đối chiếu: <strong>{money(selected.depositAmount || 0)}</strong>
                </p>
                {qr.data && (
                  <div className="deposit-transfer">
                    <img width="180" src={qr.data.qrUrl} alt="VietQR của booking" />
                    <div>
                      <p>{qr.data.accountName}</p>
                      <p>{qr.data.accountNumber}</p>
                      <p>
                        Nội dung: <strong>{qr.data.transferContent}</strong>
                      </p>
                    </div>
                  </div>
                )}
                <form
                  className="payment-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (Number(amount) !== selected.depositAmount) {
                      return toast.error('Số tiền thực nhận phải khớp chính xác tiền cọc')
                    }
                    if (!reference.trim()) {
                      return toast.error('Nhập mã giao dịch ngân hàng sau khi đối chiếu')
                    }
                    setDialogAction('confirm')
                  }}
                >
                  <label className="form-field">
                    <span>Số tiền thực nhận (VND)</span>
                    <MoneyInput value={amount} onChange={setAmount} required />
                  </label>
                  <label className="form-field">
                    <span>Mã giao dịch ngân hàng</span>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ví dụ: FT241124001"
                      maxLength={255}
                      required
                    />
                  </label>
                  <button className="button button-dark full-button" disabled={confirm.isPending || reject.isPending}>
                    {confirm.isPending ? 'Đang xác nhận…' : 'Xác nhận đã nhận tiền'}
                  </button>
                  <button
                    type="button"
                    className="button button-outline full-button"
                    disabled={confirm.isPending || reject.isPending}
                    onClick={() => setDialogAction('reject')}
                  >
                    {reject.isPending ? 'Đang xử lý…' : 'Từ chối xác minh'}
                  </button>
                </form>
              </>
            ) : (
              <div className="lifecycle-empty">
                <ShieldCheck size={28} />
                <h3>Chọn khoản cọc</h3>
                <p>Chi tiết giao dịch sẽ hiển thị tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={dialogAction !== null}
        onOpenChange={(open) => {
          if (!open && !confirm.isPending && !reject.isPending) setDialogAction(null)
        }}
        title={dialogAction === 'reject' ? 'Từ chối xác minh tiền cọc' : 'Xác nhận đã nhận tiền cọc'}
        message={
          dialogAction === 'reject'
            ? 'Từ chối xác minh giao dịch này? Booking sẽ hết hiệu lực giữ phòng.'
            : `Xác nhận đã đối chiếu tài khoản ngân hàng và nhận đủ ${money(Number(amount) || 0)} cho đơn ${selected?.bookingCode || ''} (Mã GD: ${reference.trim()})?`
        }
        confirmLabel={dialogAction === 'reject' ? 'Xác nhận từ chối' : 'Xác nhận đã nhận tiền'}
        tone={dialogAction === 'reject' ? 'danger' : 'primary'}
        pending={confirm.isPending || reject.isPending}
        onConfirm={() => {
          if (dialogAction === 'reject') reject.mutate()
          else confirm.mutate()
        }}
      />
    </div>
  )
}

function RoomsManagement() {
  const { rooms, bookings } = useOpsData()
  const roomTypes = useQuery({
    queryKey: ['ops-room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/reception/room-types')),
  })
  const roomServices = useQuery({
    queryKey: ['ops-services'],
    queryFn: () => request(api.get<ApiResponse<ServiceItem[]>>('/reception/services')),
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Room | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOperational, setConfirmOperational] = useState<{ room: Room; active: boolean } | null>(null)
  const [form, setForm] = useState({
    roomNumber: '',
    floor: '1',
    roomTypeId: '',
    serviceIds: [] as number[],
    imageUrlsText: '',
  })
  const invalidate = useInvalidate()

  const openForm = (room?: Room) => {
    setEditing(room || null)
    const matchedType = room ? roomTypes.data?.find((t) => t.name === room.roomTypeName) : undefined
    const initialImages = room
      ? room.imageUrls?.length
        ? room.imageUrls
        : room.imageUrl
          ? [room.imageUrl]
          : []
      : []
    setForm({
      roomNumber: room?.roomNumber || '',
      floor: String(room?.floor || 1),
      roomTypeId: room ? String(matchedType?.id || '') : '',
      serviceIds: room?.services?.map((service) => service.id) || [],
      imageUrlsText: initialImages.join('\n'),
    })
    setModalOpen(true)
  }

  useEffect(() => {
    if (!modalOpen || !editing || form.roomTypeId || !roomTypes.data?.length) return
    const matchedType = roomTypes.data.find((t) => t.name === editing.roomTypeName)
    if (matchedType) {
      setForm((prev) => (prev.roomTypeId ? prev : { ...prev, roomTypeId: String(matchedType.id) }))
    }
  }, [modalOpen, editing, form.roomTypeId, roomTypes.data])

  const applyRoomTypeImages = (typeId: string, force = false) => {
    const selectedType = roomTypes.data?.find((t) => String(t.id) === typeId)
    if (!selectedType) {
      setForm((prev) => ({ ...prev, roomTypeId: typeId }))
      return
    }
    const typeImages = selectedType.imageUrls?.length
      ? selectedType.imageUrls
      : selectedType.imageUrl
        ? [selectedType.imageUrl]
        : []
    setForm((prev) => ({
      ...prev,
      roomTypeId: typeId,
      imageUrlsText:
        typeImages.length && (force || !prev.imageUrlsText.trim()) ? typeImages.join('\n') : prev.imageUrlsText,
    }))
  }

  const parsedRoomImages = parseImageUrls(form.imageUrlsText)

  const saveRoom = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<Room>>({
          method: editing ? 'PUT' : 'POST',
          url: editing ? `/reception/rooms/${editing.id}` : '/reception/rooms',
          data: {
            roomNumber: form.roomNumber.trim(),
            floor: Number(form.floor),
            roomTypeId: Number(form.roomTypeId),
            serviceIds: form.serviceIds,
            imageUrls: parsedRoomImages,
          },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu thông tin phòng')
      setModalOpen(false)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const operational = useMutation({
    mutationFn: ({ room, active }: { room: Room; active: boolean }) =>
      request(api.patch<ApiResponse<null>>(`/reception/rooms/${room.id}/operational`, undefined, { params: { active } })),
    onSuccess: async (_, vars) => {
      toast.success(
        vars.active
          ? `Đã kích hoạt lại phòng ${vars.room.roomNumber}`
          : `Đã ngừng hoạt động phòng ${vars.room.roomNumber}`,
      )
      setConfirmOperational(null)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const changeStatus = useMutation({
    mutationFn: ({ id, status: next }: { id: number; status: RoomStatus }) =>
      request(api.patch<ApiResponse<null>>(`/reception/rooms/${id}/status`, undefined, { params: { status: next } })),
    onSuccess: async (_, vars) => {
      toast.success(`Đã chuyển trạng thái phòng sang ${roomNames[vars.status] || vars.status}`)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cleaned = useMutation({
    mutationFn: (id: number) => request(api.patch<ApiResponse<null>>(`/reception/rooms/${id}/cleaned`)),
    onSuccess: async () => {
      toast.success('Phòng đã được đánh dấu sẵn sàng')
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allRooms = rooms.data || []
  const allBookings = bookings.data || []
  const getBlockingBookings = (room: Room) => {
    const today = dateValue(new Date())
    const now = Date.now()
    return allBookings.filter((b) => {
      if (b.checkOutDate <= today) return false
      const matchesRoom =
        b.rooms?.some((rm) => rm.roomId === room.id || rm.roomNumber === room.roomNumber) ||
        b.roomNumbers?.includes(room.roomNumber)
      if (!matchesRoom) return false
      if (b.status === 'PENDING_DEPOSIT') {
        return Boolean(b.depositDeadline && Date.parse(b.depositDeadline) > now)
      }
      if (b.status === 'PENDING_VERIFICATION') {
        return Boolean(b.verificationDeadline && Date.parse(b.verificationDeadline) > now)
      }
      return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status)
    })
  }
  const roomTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['AVAILABLE', 'Sẵn sàng'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['OCCUPIED', 'Đang có khách'],
    ['CLEANING', 'Đang dọn'],
    ['MAINTENANCE', 'Bảo trì'],
  ]

  const filtered = allRooms.filter((r) => {
    const matchesStatus = !status || roomReservationStatus(r, allBookings) === status
    const q = search.trim().toLowerCase()
    const matchesQuery = !q || `${r.roomNumber} ${r.roomTypeName} tầng ${r.floor}`.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const hasRoomFilters = Boolean(search.trim() || status)
  const roomTableScrollRef = useFourRowTableScroll(filtered.length)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="TÀI SẢN & SỨC CHỨA"
        title="Quản lý phòng"
        detail="Theo dõi trạng thái, hình ảnh từng phòng, dọn phòng và bảo trì"
        action={
          <button className="button button-dark" onClick={() => openForm()}>
            <Plus size={15} /> Thêm phòng
          </button>
        }
      />

      {rooms.isPending || bookings.isPending ? (
        <LoadingRows />
      ) : rooms.isError || bookings.isError ? (
        <ErrorPanel
          error={rooms.error || bookings.error}
          retry={() => {
            void rooms.refetch()
            void bookings.refetch()
          }}
        />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm phòng nghỉ">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc nhanh trạng thái phòng">
                {roomTabs.map(([value, label]) => (
                  <button
                    key={value || 'ALL'}
                    type="button"
                    className={status === value ? 'is-active' : ''}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="ops-result-count">
                <b>{filtered.length}</b> phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm số phòng, tầng hoặc hạng phòng"
                  placeholder="Tìm số phòng, tầng hoặc hạng phòng…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="ops-clear-btn"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => setSearch('')}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>

              <label className="ops-select-box">
                <span>TRẠNG THÁI</span>
                <select aria-label="Lọc theo trạng thái phòng" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(roomFilterNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              {hasRoomFilters && (
                <button
                  type="button"
                  className="ops-reset-btn"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </section>

          <section className="panel table-panel">
            <div ref={roomTableScrollRef} className="table-scroll table-scroll-4">
              <table>
                <thead>
                  <tr>
                    <th>PHÒNG &amp; HÌNH ẢNH</th>
                    <th>HẠNG PHÒNG</th>
                    <th>TẦNG</th>
                    <th>SỨC CHỨA</th>
                    <th>GIÁ / ĐÊM</th>
                    <th>TRẠNG THÁI</th>
                    <th>HOẠT ĐỘNG</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const photoCount = r.imageUrls?.length || (r.imageUrl ? 1 : 0)
                    const thumbUrl = r.imageUrl || r.imageUrls?.[0]
                    const hasBlockingBooking = getBlockingBookings(r).length > 0
                    const statusOptions: RoomStatus[] =
                      r.status === 'OCCUPIED' ? ['OCCUPIED'] : ['AVAILABLE', 'CLEANING', 'MAINTENANCE']
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="room-table-cell">
                            <RoomThumbnail src={thumbUrl} alt={`Phòng ${r.roomNumber}`} className="room-table-thumb" />
                            <div className="room-table-meta">
                              <b className="room-number">Phòng {r.roomNumber}</b>
                              <small className="cell-sub">
                                Mã #{r.id} — {photoCount > 0 ? `${photoCount} ảnh` : 'Chưa có ảnh'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <b>{r.roomTypeName}</b>
                          {(r.areaSqm || (r.services && r.services.length > 0)) && (
                            <small className="cell-sub">
                              {[
                                r.areaSqm ? `${r.areaSqm} m²` : '',
                                r.services && r.services.length > 0 ? `${r.services.length} dịch vụ` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </small>
                          )}
                        </td>
                        <td>Tầng {r.floor}</td>
                        <td>{r.capacity} khách</td>
                        <td>{money(r.basePrice)}</td>
                        <td>
                          <span className={`status-badge ${statusTone(roomReservationStatus(r, allBookings))}`}>
                            {roomFilterNames[roomReservationStatus(r, allBookings)]}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${r.operational ? 'green' : 'gray'}`}>
                            {r.operational ? 'Đang hoạt động' : 'Đã ngừng'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-inline">
                            <button type="button" className="table-action" onClick={() => openForm(r)}>
                              Sửa
                            </button>
                            {r.status === 'CLEANING' ? (
                              <button
                                type="button"
                                className="table-action"
                                disabled={cleaned.isPending}
                                onClick={() => cleaned.mutate(r.id)}
                              >
                                <Check size={14} /> Đã dọn
                              </button>
                            ) : (
                              <select
                                className="status-select"
                                aria-label={`Đổi trạng thái phòng ${r.roomNumber}`}
                                value={r.status}
                                title={
                                  !r.operational
                                    ? 'Kích hoạt lại phòng trước khi đổi trạng thái'
                                    : r.status === 'OCCUPIED'
                                      ? 'Phòng đang có khách lưu trú'
                                      : undefined
                                }
                                disabled={changeStatus.isPending || !r.operational || r.status === 'OCCUPIED'}
                                onChange={(e) => changeStatus.mutate({ id: r.id, status: e.target.value as RoomStatus })}
                              >
                                {statusOptions.map((k) => (
                                  <option
                                    key={k}
                                    value={k}
                                    disabled={k === 'MAINTENANCE' && hasBlockingBooking}
                                  >
                                    {k === 'MAINTENANCE' && hasBlockingBooking
                                      ? `${roomNames[k]} (đang có đơn)`
                                      : roomNames[k]}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              className="table-action"
                              disabled={operational.isPending}
                              onClick={() => setConfirmOperational({ room: r, active: !r.operational })}
                            >
                              {r.operational ? 'Ngừng' : 'Kích hoạt'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty-table">Không tìm thấy phòng phù hợp</div>}
            </div>
          </section>
        </>
      )}

      {confirmOperational && (() => {
        const blockingBookings = !confirmOperational.active ? getBlockingBookings(confirmOperational.room) : []
        const blockedByStayOrBooking =
          !confirmOperational.active && (confirmOperational.room.status === 'OCCUPIED' || blockingBookings.length > 0)

        return (
          <Modal
            title={
              confirmOperational.active
                ? `Kích hoạt phòng ${confirmOperational.room.roomNumber}`
                : `Ngừng hoạt động phòng ${confirmOperational.room.roomNumber}`
            }
            close={() => setConfirmOperational(null)}
          >
            <div className="modal-form">
              <div className="ops-confirm-summary">
                <div>
                  <span>Phòng</span>
                  <b>
                    Phòng {confirmOperational.room.roomNumber} — {confirmOperational.room.roomTypeName}
                  </b>
                </div>
                <div>
                  <span>Tầng</span>
                  <b>Tầng {confirmOperational.room.floor}</b>
                </div>
              </div>
              {blockedByStayOrBooking ? (
                <p className="inline-warning is-danger">
                  <CircleAlert size={15} />
                  <span>
                    {confirmOperational.room.status === 'OCCUPIED'
                      ? 'Phòng đang có khách lưu trú nên chưa thể ngừng hoạt động.'
                      : `Không thể ngừng hoạt động vì phòng đang có đơn đặt phòng hiệu lực (${blockingBookings
                          .map((b) => `${b.bookingCode} · ${bookingNames[b.status] || b.status}`)
                          .join(', ')}). Hãy hủy hoặc đổi phòng cho đơn trước.`}
                  </span>
                </p>
              ) : (
                <p className="inline-warning">
                  <CircleAlert size={15} />
                  <span>
                    {confirmOperational.active
                      ? 'Phòng sẽ mở lại để lễ tân và khách hàng có thể đặt phòng.'
                      : 'Phòng tạm ngừng sẽ không xuất hiện trong danh sách chọn phòng mới cho đến khi được kích hoạt lại.'}
                  </span>
                </p>
              )}
              <div className="ops-modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  disabled={operational.isPending}
                  onClick={() => setConfirmOperational(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className={confirmOperational.active ? 'button button-dark' : 'button button-danger'}
                  disabled={operational.isPending || blockedByStayOrBooking}
                  onClick={() => operational.mutate(confirmOperational)}
                >
                  {operational.isPending
                    ? 'Đang xử lý…'
                    : confirmOperational.active
                      ? 'Xác nhận kích hoạt'
                      : 'Xác nhận ngừng hoạt động'}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {modalOpen && (
        <Modal title={editing ? `Cập nhật phòng ${editing.roomNumber}` : 'Thêm phòng mới'} close={() => setModalOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.roomNumber.trim() || Number(form.floor) < 1 || !Number(form.roomTypeId)) {
                return toast.error('Vui lòng nhập số phòng, tầng và hạng phòng hợp lệ')
              }
              saveRoom.mutate()
            }}
          >
            <Input
              label="Số phòng"
              value={form.roomNumber}
              onChange={(roomNumber) => setForm({ ...form, roomNumber })}
              required
            />
            <Input
              label="Tầng"
              value={form.floor}
              type="number"
              onChange={(floor) => setForm({ ...form, floor })}
              required
            />
            <label className="form-field">
              <span>Hạng phòng</span>
              <select
                value={form.roomTypeId}
                onChange={(e) => applyRoomTypeImages(e.target.value, false)}
                required
              >
                <option value="">Chọn hạng phòng</option>
                {roomTypes.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {money(t.basePrice)}
                  </option>
                ))}
              </select>
            </label>

            <div className="room-gallery-field">
              <div className="room-gallery-header">
                <span className="section-kicker">HÌNH ẢNH PHÒNG ({parsedRoomImages.length} ẢNH)</span>
                {form.roomTypeId && (
                  <button
                    type="button"
                    className="room-gallery-fill-btn"
                    onClick={() => applyRoomTypeImages(form.roomTypeId, true)}
                  >
                    Dùng ảnh theo hạng phòng
                  </button>
                )}
              </div>
              <label className="form-field">
                <span>Danh sách URL hình ảnh phòng (mỗi dòng 1 URL)</span>
                <textarea
                  value={form.imageUrlsText}
                  onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              {parsedRoomImages.length > 0 && (
                <div className="room-gallery-preview-grid" aria-label="Xem trước hình ảnh phòng">
                  {parsedRoomImages.slice(0, 8).map((url, idx) => (
                    <RoomThumbnail
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`Ảnh phòng ${idx + 1}`}
                      className="room-gallery-thumb"
                      iconSize={16}
                    />
                  ))}
                </div>
              )}
            </div>

            <fieldset className="room-choice-list">
              <legend>Dịch vụ của phòng</legend>
              {roomServices.data
                ?.filter((service) => service.active)
                .map((service) => (
                  <label key={service.id}>
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          serviceIds: e.target.checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                    />
                    <span>{service.name}</span>
                    <b>{money(service.unitPrice)}</b>
                  </label>
                ))}
            </fieldset>

            <button className="button button-dark full-button" disabled={saveRoom.isPending || roomTypes.isPending}>
              {saveRoom.isPending ? 'Đang lưu…' : 'Lưu phòng'} <Check size={15} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function RoomTypesManagement() {
  const queryClient = useQueryClient()
  const types = useQuery({
    queryKey: ['ops-room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/reception/room-types')),
  })
  const [search, setSearch] = useState('')
  const [capacityFilter, setCapacityFilter] = useState('')
  const [sortBy, setSortBy] = useState('DEFAULT')
  const [editing, setEditing] = useState<RoomType | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    basePrice: '',
    capacity: '2',
    description: '',
    imageUrl: '',
    imageUrlsText: '',
    areaSqm: '',
    amenities: '',
  })
  const [id, setId] = useState<number | null>(null)

  const reset = (type?: RoomType) => {
    setId(type?.id ?? null)
    const gallery = type?.imageUrls?.length ? type.imageUrls : type?.imageUrl ? [type.imageUrl] : []
    setForm({
      name: type?.name || '',
      basePrice: String(type?.basePrice || ''),
      capacity: String(type?.capacity || 2),
      description: type?.description || '',
      imageUrl: type?.imageUrl || gallery[0] || '',
      imageUrlsText: gallery.join('\n'),
      areaSqm: String(type?.areaSqm || ''),
      amenities: type?.amenities || '',
    })
    setEditing(type || null)
    setOpen(true)
  }

  const parsedGallery = parseImageUrls(
    [form.imageUrl.trim(), ...parseImageUrls(form.imageUrlsText)].filter(Boolean).join('\n'),
  )

  const mutation = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<RoomType>>({
          method: id ? 'PUT' : 'POST',
          url: id ? `/reception/room-types/${id}` : '/reception/room-types',
          data: {
            name: form.name,
            basePrice: Number(form.basePrice),
            capacity: Number(form.capacity),
            description: form.description,
            imageUrl: form.imageUrl.trim() || parsedGallery[0] || '',
            imageUrls: parsedGallery,
            areaSqm: form.areaSqm ? Number(form.areaSqm) : null,
            amenities: form.amenities,
          },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu hạng phòng')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ops-room-types'] })
      await queryClient.invalidateQueries({ queryKey: ['room-types'] })
      await queryClient.invalidateQueries({ queryKey: ['ops-rooms'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allTypes = types.data || []
  const matchesCapacity = (capacity: number, filterKey: string) => {
    if (filterKey === '1-2') return capacity <= 2
    if (filterKey === '3-4') return capacity >= 3 && capacity <= 4
    if (filterKey === '5+') return capacity >= 5
    return true
  }

  const capacityTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['1-2', '1–2 khách'],
    ['3-4', '3–4 khách'],
    ['5+', 'Từ 5 khách'],
  ]

  const filteredTypes = allTypes
    .filter((t) => {
      const q = search.trim().toLowerCase()
      const matchesQuery =
        !q || `${t.name} ${t.description || ''} ${t.amenities || ''}`.toLowerCase().includes(q)
      return matchesQuery && matchesCapacity(t.capacity, capacityFilter)
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.basePrice - b.basePrice
      if (sortBy === 'PRICE_DESC') return b.basePrice - a.basePrice
      if (sortBy === 'CAPACITY_DESC') return b.capacity - a.capacity
      return 0
    })

  const hasTypeFilters = Boolean(search.trim() || capacityFilter || sortBy !== 'DEFAULT')

  return (
    <div className="ops-page">
      <PageTitle
        kicker="DANH MỤC LƯU TRÚ"
        title="Hạng phòng"
        detail="Cập nhật tiện nghi, bộ sưu tập hình ảnh, sức chứa và mức giá niêm yết"
        action={
          <button className="button button-dark" onClick={() => reset()}>
            <Plus size={16} /> Thêm hạng phòng
          </button>
        }
      />

      {types.isPending ? (
        <LoadingRows />
      ) : types.isError ? (
        <ErrorPanel error={types.error} retry={() => void types.refetch()} />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm hạng phòng">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc theo sức chứa hạng phòng">
                {capacityTabs.map(([value, label]) => (
                  <button
                    key={value || 'ALL'}
                    type="button"
                    className={capacityFilter === value ? 'is-active' : ''}
                    aria-pressed={capacityFilter === value}
                    onClick={() => setCapacityFilter(value)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="ops-result-count">
                <b>{filteredTypes.length}</b> hạng phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm tên hạng phòng, tiện nghi hoặc mô tả"
                  placeholder="Tìm tên hạng phòng, tiện nghi, mô tả…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="ops-clear-btn"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => setSearch('')}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>

              <label className="ops-select-box">
                <span>SẮP XẾP</span>
                <select aria-label="Sắp xếp hạng phòng" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="DEFAULT">Mặc định</option>
                  <option value="PRICE_ASC">Giá thấp đến cao</option>
                  <option value="PRICE_DESC">Giá cao đến thấp</option>
                  <option value="CAPACITY_DESC">Sức chứa cao đến thấp</option>
                </select>
              </label>

              {hasTypeFilters && (
                <button
                  type="button"
                  className="ops-reset-btn"
                  onClick={() => {
                    setSearch('')
                    setCapacityFilter('')
                    setSortBy('DEFAULT')
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </section>

          {filteredTypes.length === 0 ? (
            <div className="panel">
              <div className="empty-table">Không tìm thấy hạng phòng phù hợp</div>
            </div>
          ) : (
            <div className="type-admin-scroll">
              <div className="type-admin-grid">
                {filteredTypes.map((t, i) => {
                  const coverSrc = t.imageUrl || t.imageUrls?.[0]
                  const photoCount = t.imageUrls?.length || (t.imageUrl ? 1 : 0)
                  const indexLabel = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
                  return (
                    <article className="type-admin-card" key={t.id}>
                      <div className="type-admin-art">
                        <span>{indexLabel}</span>
                        <RoomThumbnail src={coverSrc} alt={t.name} className="type-admin-cover" iconSize={34} />
                      </div>
                      <div className="type-admin-content">
                        <div>
                          <span className="section-kicker">MÃ HẠNG #{t.id}</span>
                          <h3>{t.name}</h3>
                        </div>
                        <p>{t.description || 'Chưa có mô tả'}</p>
                        <div className="type-admin-meta">
                          <div className="type-admin-specs">
                            <span>
                              <Users size={14} /> {t.capacity} khách
                            </span>
                            <span>{photoCount > 0 ? `${photoCount} ảnh` : 'Chưa có ảnh'}</span>
                          </div>
                          <b>
                            {money(t.basePrice)} <small>/ đêm</small>
                          </b>
                        </div>
                        <button className="button button-outline full-button" onClick={() => reset(t)}>
                          Chỉnh sửa hạng phòng
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {open && (
        <Modal title={editing ? 'Cập nhật hạng phòng' : 'Thêm hạng phòng'} close={() => setOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.name.trim() || Number(form.basePrice) <= 0 || Number(form.capacity) < 1) {
                return toast.error('Vui lòng kiểm tra tên, giá và sức chứa')
              }
              mutation.mutate()
            }}
          >
            <Input
              label="Tên hạng phòng"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              required
            />
            <Input
              label="Giá cơ bản / đêm (VND)"
              value={form.basePrice}
              type="money"
              onChange={(basePrice) => setForm({ ...form, basePrice })}
              required
            />
            <Input
              label="Sức chứa tối đa"
              value={form.capacity}
              type="number"
              onChange={(capacity) => setForm({ ...form, capacity })}
              required
            />
            <Input
              label="Diện tích (m²)"
              value={form.areaSqm}
              type="number"
              onChange={(areaSqm) => setForm({ ...form, areaSqm })}
            />
            <label className="form-field">
              <span>Tiện nghi (ngăn cách bằng dấu phẩy)</span>
              <textarea
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                placeholder="Wi-Fi, điều hòa, TV"
              />
            </label>
            <Input
              label="URL ảnh đại diện chính"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
            />
            <div className="room-gallery-field">
              <div className="room-gallery-header">
                <span className="section-kicker">BỘ SƯU TẬP ẢNH ({parsedGallery.length} ẢNH)</span>
              </div>
              <label className="form-field">
                <span>Danh sách URL thư viện ảnh (mỗi dòng 1 URL)</span>
                <textarea
                  value={form.imageUrlsText}
                  onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              {parsedGallery.length > 0 && (
                <div className="room-gallery-preview-grid" aria-label="Xem trước thư viện ảnh hạng phòng">
                  {parsedGallery.slice(0, 8).map((url, idx) => (
                    <RoomThumbnail
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`Ảnh hạng phòng ${idx + 1}`}
                      className="room-gallery-thumb"
                      iconSize={16}
                    />
                  ))}
                </div>
              )}
            </div>
            <label className="form-field">
              <span>Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <p className="inline-warning">
              <CircleAlert size={15} /> Giá cơ bản mới không thay đổi mức giá của các đơn đã đặt
            </p>
            <button className="button button-dark full-button" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu…' : 'Lưu hạng phòng'} <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function BookingsManagement() {
  const { bookings, customers, rooms } = useOpsData()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const [search, setSearch] = useState(urlSearch)
  const [status, setStatus] = useState('')
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [walkIn, setWalkIn] = useState({ customerId: '', checkInDate: '', checkOutDate: '', roomIds: [] as number[] })
  const [confirmAction, setConfirmAction] = useState<{
    booking: Booking
    action: 'cancel' | 'reject'
    reason: string
  } | null>(null)
  const invalidate = useInvalidate()

  const verifyDeposit = useMutation({
    mutationFn: async (b: Booking) => {
      if (b.status === 'PENDING_DEPOSIT') {
        await request(api.post<ApiResponse<unknown>>(`/bookings/${b.id}/deposit/report`))
      }
      return b.id
    },
    onSuccess: async (bookingId) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['reception-deposits'] }), invalidate()])
      navigate(`/reception/deposits?bookingId=${bookingId}`)
    },
    onError: async (e) => {
      toast.error(errorMessage(e))
      await invalidate()
    },
  })

  useEffect(() => {
    if (urlSearch) setSearch(urlSearch)
  }, [urlSearch])

  const mutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'confirm' | 'reject' | 'cancel'; reason?: string }) =>
      request(
        api.patch<ApiResponse<Booking>>(
          `/reception/bookings/${id}/${action}`,
          action === 'reject' || action === 'cancel'
            ? {
                reason:
                  reason?.trim() ||
                  (action === 'reject' ? 'Không thể xác nhận ở thời điểm hiện tại' : 'Hủy bởi lễ tân'),
              }
            : undefined,
        ),
      ),
    onSuccess: async (_, vars) => {
      toast.success(
        vars.action === 'cancel'
          ? 'Đã hủy đặt phòng và mở lại phòng trống'
          : vars.action === 'reject'
            ? 'Đã từ chối yêu cầu đặt phòng'
            : 'Đã xác nhận đặt phòng',
      )
      setConfirmAction(null)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const createWalkIn = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<Booking>>('/reception/bookings', {
          customerId: Number(walkIn.customerId),
          checkInDate: walkIn.checkInDate,
          checkOutDate: walkIn.checkOutDate,
          roomIds: walkIn.roomIds,
          pricingType: 'STANDARD',
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã tạo đặt phòng tại quầy')
      setWalkInOpen(false)
      setWalkIn({ customerId: '', checkInDate: '', checkOutDate: '', roomIds: [] })
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allBookings = bookings.data || []
  const bookingTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['PENDING', 'Chờ xác nhận'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['CHECKED_IN', 'Đang lưu trú'],
    ['COMPLETED', 'Hoàn tất'],
    ['CANCELLED', 'Đã hủy'],
  ]

  const filtered = allBookings.filter((b) => {
    const matchesStatus = !status || b.status === status
    const q = search.trim().toLowerCase()
    const matchesQuery =
      !q || `${b.bookingCode} ${b.customerName} ${b.roomNumbers?.join(' ')}`.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const hasBookingFilters = Boolean(search.trim() || status)
  const bookingTableScrollRef = useFourRowTableScroll(filtered.length)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="YÊU CẦU LƯU TRÚ"
        title="Đặt phòng"
        detail="Quản lý yêu cầu và cập nhật trạng thái đặt phòng"
        action={
          <button className="button button-dark" onClick={() => setWalkInOpen(true)}>
            <Plus size={15} /> Tạo tại quầy
          </button>
        }
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm đơn đặt phòng">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc nhanh trạng thái đặt phòng">
                {bookingTabs.map(([value, label]) => (
                  <button
                    key={value || 'ALL'}
                    type="button"
                    className={status === value ? 'is-active' : ''}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="ops-result-count">
                <b>{filtered.length}</b> đặt phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm mã đặt phòng, tên khách hoặc số phòng"
                  placeholder="Tìm mã đặt phòng, tên khách, số phòng…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="ops-clear-btn"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => setSearch('')}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>

              <label className="ops-select-box">
                <span>TRẠNG THÁI</span>
                <select aria-label="Lọc theo trạng thái đặt phòng" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(bookingNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              {hasBookingFilters && (
                <button
                  type="button"
                  className="ops-reset-btn"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </section>

          <section className="panel table-panel">
            <div ref={bookingTableScrollRef} className="table-scroll table-scroll-4">
              <table>
                <thead>
                  <tr>
                    <th>MÃ ĐƠN / KHÁCH</th>
                    <th>THỜI GIAN</th>
                    <th>PHÒNG</th>
                    <th>TỔNG TIỀN</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const totalGuests = b.rooms?.reduce((sum, r) => sum + (r.guestCount || 0), 0) || 0
                    const totalChargeSummary = [
                      b.depositAmount ? `Cọc: ${money(b.depositAmount)}` : '',
                      b.totalServiceCharge > 0 ? `DV: ${money(b.totalServiceCharge)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                    <tr key={b.id}>
                      <td>
                        <b className="booking-code">{b.bookingCode}</b>
                        <small className="cell-sub">{b.customerName}</small>
                      </td>
                      <td>
                        {date(b.checkInDate)}
                        <small className="cell-sub">
                          đến {date(b.checkOutDate)}
                          {b.numberOfNights > 0 ? ` (${b.numberOfNights} đêm)` : ''}
                        </small>
                      </td>
                      <td>
                        {b.roomNumbers?.map((n) => `#${n}`).join(', ') || '—'}
                        <small className="cell-sub">
                          {b.rooms?.length || 0} phòng{totalGuests > 0 ? ` · ${totalGuests} khách` : ''}
                        </small>
                      </td>
                      <td>
                        <b>{money(b.estimatedTotal)}</b>
                        {totalChargeSummary && <small className="cell-sub">{totalChargeSummary}</small>}
                      </td>
                      <td>
                        <span className={`status-badge ${statusTone(b.status)}`}>
                          {bookingNames[b.status] || b.status}
                        </span>
                      </td>
                      <td>
                        <div className="actions-inline">
                          {b.status === 'PENDING' && (
                            <>
                              <button
                                className="icon-action success"
                                title="Xác nhận"
                                disabled={mutation.isPending}
                                onClick={() => mutation.mutate({ id: b.id, action: 'confirm' })}
                              >
                                <Check size={15} />
                              </button>
                              <button
                                className="icon-action danger"
                                title="Từ chối"
                                disabled={mutation.isPending}
                                onClick={() => setConfirmAction({ booking: b, action: 'reject', reason: '' })}
                              >
                                <X size={15} />
                              </button>
                            </>
                          )}
                          {b.status === 'PENDING_DEPOSIT' && (
                            <>
                              <button
                                type="button"
                                className="table-action"
                                disabled={verifyDeposit.isPending || mutation.isPending}
                                onClick={() => verifyDeposit.mutate(b)}
                              >
                                Xác minh cọc
                              </button>
                              <button
                                type="button"
                                className="table-action danger-outline"
                                disabled={mutation.isPending || verifyDeposit.isPending}
                                onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                              >
                                <X size={14} /> Hủy
                              </button>
                            </>
                          )}
                          {b.status === 'PENDING_VERIFICATION' && (
                            <>
                              <Link className="table-action" to={`/reception/deposits?bookingId=${b.id}`}>
                                Xác minh cọc
                              </Link>
                              <button
                                type="button"
                                className="table-action danger-outline"
                                disabled={mutation.isPending}
                                onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                              >
                                <X size={14} /> Hủy
                              </button>
                            </>
                          )}
                          {b.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              className="table-action danger-outline"
                              disabled={mutation.isPending}
                              onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                            >
                              <X size={14} /> Hủy
                            </button>
                          )}
                          {!['PENDING', 'CONFIRMED', 'PENDING_DEPOSIT', 'PENDING_VERIFICATION'].includes(b.status) && (
                            <span className="muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty-table">Không có đặt phòng phù hợp</div>}
            </div>
          </section>
        </>
      )}

      {confirmAction && (
        <Modal
          title={
            confirmAction.action === 'cancel'
              ? `Hủy đặt phòng ${confirmAction.booking.bookingCode}`
              : `Từ chối yêu cầu ${confirmAction.booking.bookingCode}`
          }
          close={() => setConfirmAction(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                id: confirmAction.booking.id,
                action: confirmAction.action,
                reason: confirmAction.reason,
              })
            }}
          >
            <div className="ops-confirm-summary">
              <div>
                <span>Khách hàng</span>
                <b>{confirmAction.booking.customerName}</b>
              </div>
              <div>
                <span>Thời gian</span>
                <b>
                  {date(confirmAction.booking.checkInDate)} đến {date(confirmAction.booking.checkOutDate)}
                </b>
              </div>
              <div>
                <span>Phòng giữ chỗ</span>
                <b>{confirmAction.booking.roomNumbers?.map((n) => `#${n}`).join(', ') || '—'}</b>
              </div>
              <div>
                <span>Tổng tiền ước tính</span>
                <b>{money(confirmAction.booking.estimatedTotal)}</b>
              </div>
            </div>

            <p className="inline-warning">
              <CircleAlert size={15} />
              {confirmAction.action === 'cancel'
                ? 'Đơn đã xác nhận nhưng chưa nhận phòng có thể được lễ tân hủy khi khách đổi kế hoạch. Thao tác này sẽ chuyển đơn sang Đã hủy và giải phóng phòng để khách khác đặt.'
                : 'Yêu cầu đặt phòng sẽ chuyển sang trạng thái Từ chối và giải phóng phòng giữ chỗ.'}
            </p>

            <label className="form-field">
              <span>{confirmAction.action === 'cancel' ? 'Lý do hủy đơn (tùy chọn)' : 'Lý do từ chối (tùy chọn)'}</span>
              <textarea
                placeholder={
                  confirmAction.action === 'cancel'
                    ? 'Ví dụ: Khách liên hệ báo hủy lịch hoặc đổi ngày lưu trú…'
                    : 'Ví dụ: Phòng đang bảo trì đột xuất…'
                }
                value={confirmAction.reason}
                onChange={(e) => setConfirmAction({ ...confirmAction, reason: e.target.value })}
              />
            </label>

            <div className="ops-modal-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={mutation.isPending}
                onClick={() => setConfirmAction(null)}
              >
                Giữ lại
              </button>
              <button type="submit" className="button button-danger" disabled={mutation.isPending}>
                {mutation.isPending
                  ? 'Đang xử lý…'
                  : confirmAction.action === 'cancel'
                    ? 'Xác nhận hủy đơn'
                    : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {walkInOpen && (
        <Modal title="Tạo đặt phòng tại quầy" close={() => setWalkInOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!walkIn.customerId || !walkIn.checkInDate || walkIn.checkOutDate <= walkIn.checkInDate || !walkIn.roomIds.length) {
                return toast.error('Kiểm tra khách hàng, ngày lưu trú và ít nhất một phòng')
              }
              createWalkIn.mutate()
            }}
          >
            <label className="form-field">
              <span>Khách hàng</span>
              <select
                value={walkIn.customerId}
                onChange={(e) => setWalkIn({ ...walkIn, customerId: e.target.value })}
                required
              >
                <option value="">Chọn khách hàng</option>
                {customers.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Ngày nhận phòng</span>
              <input
                type="date"
                value={walkIn.checkInDate}
                onChange={(e) => setWalkIn({ ...walkIn, checkInDate: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Ngày trả phòng</span>
              <input
                type="date"
                min={walkIn.checkInDate}
                value={walkIn.checkOutDate}
                onChange={(e) => setWalkIn({ ...walkIn, checkOutDate: e.target.value })}
                required
              />
            </label>
            <fieldset className="room-choice-list">
              <legend>Chọn phòng</legend>
              {rooms.data
                ?.filter((r) => r.operational && r.status === 'AVAILABLE')
                .map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      checked={walkIn.roomIds.includes(r.id)}
                      onChange={(e) =>
                        setWalkIn({
                          ...walkIn,
                          roomIds: e.target.checked
                            ? [...walkIn.roomIds, r.id]
                            : walkIn.roomIds.filter((id) => id !== r.id),
                        })
                      }
                    />
                    <span>
                      Phòng {r.roomNumber} — {r.roomTypeName}
                    </span>
                    <b>{money(r.basePrice)}/đêm</b>
                  </label>
                ))}
            </fieldset>
            <button
              className="button button-dark full-button"
              disabled={createWalkIn.isPending || customers.isPending || rooms.isPending}
            >
              {createWalkIn.isPending ? 'Đang tạo…' : 'Tạo đặt phòng'} <Check size={15} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function RoomCalendar() {
  const { bookings, rooms } = useOpsData()
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return dateValue(d)
  })
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + i)
    return dateValue(d)
  })
  const previous = (by: number) => {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + by)
    setStart(dateValue(d))
  }
  const calendarScrollRef = useSixRowCalendarScroll(rooms.data?.length ?? 0)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="KẾ HOẠCH LƯU TRÚ"
        title="Lịch phòng"
        detail="Theo dõi tình trạng phòng và lịch lưu trú theo từng ngày"
        action={
          <div className="calendar-controls">
            <button className="icon-action" onClick={() => previous(-14)} aria-label="Hai tuần trước">
              <ChevronLeft size={16} />
            </button>
            <span>
              {date(days[0])} — {date(days[13])}
            </span>
            <button className="icon-action" onClick={() => previous(14)} aria-label="Hai tuần sau">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      {rooms.isPending || bookings.isPending ? (
        <LoadingRows />
      ) : rooms.isError ? (
        <ErrorPanel error={rooms.error} retry={() => void rooms.refetch()} />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <section className="panel calendar-panel">
          <div className="calendar-legend">
            <span>
              <i className="legend-confirmed" /> Đã xác nhận
            </span>
            <span>
              <i className="legend-staying" /> Đang lưu trú
            </span>
            <span>
              <i className="legend-pending" /> Chờ xác nhận
            </span>
          </div>
          <div ref={calendarScrollRef} className="calendar-scroll calendar-scroll-6">
            <div className="calendar-grid" style={{ gridTemplateColumns: '150px repeat(14, minmax(48px, 1fr))' }}>
              <div className="calendar-head room-head">PHÒNG</div>
              {days.map((day) => (
                <div className="calendar-head" key={day}>
                  <small>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(`${day}T00:00:00`))}</small>
                  <b>{day.slice(8, 10)}</b>
                </div>
              ))}
              {(rooms.data || []).map((room) => (
                <CalendarRoom key={room.id} room={room} days={days} bookings={bookings.data || []} />
              ))}
            </div>
          </div>
          {rooms.data?.length === 0 && <div className="empty-table">Chưa có phòng để hiển thị</div>}
        </section>
      )}
    </div>
  )
}

function CalendarRoom({ room, days, bookings }: { room: Room; days: string[]; bookings: Booking[] }) {
  const booking = bookings.find(
    (b) =>
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) &&
      b.checkInDate <= days[13] &&
      b.checkOutDate > days[0] &&
      b.rooms?.some((r) => r.roomId === room.id),
  )
  return (
    <>
      <div className="calendar-room-label">
        <b>{room.roomNumber}</b>
        <small>{room.roomTypeName}</small>
      </div>
      {days.map((day, i) => {
        const occupied = Boolean(booking && day >= booking.checkInDate && day < booking.checkOutDate)
        const begins = occupied && day === booking?.checkInDate
        const ends = occupied && days[i + 1] === booking?.checkOutDate
        return (
          <div className={`calendar-cell ${occupied ? `booking-${booking?.status.toLowerCase()}` : ''}`} key={day}>
            <span
              className={occupied ? `calendar-booking-bar ${begins ? 'begins' : ''} ${ends ? 'ends' : ''}` : ''}
              title={occupied ? `${booking?.bookingCode} — ${bookingNames[booking!.status]}` : ''}
            />
          </div>
        )
      })}
    </>
  )
}

function Lifecycle({ kind }: { kind: 'check-in' | 'check-out' }) {
  const { bookings, rooms } = useOpsData()
  const [searchParams] = useSearchParams()
  const requestedBookingId = Number(searchParams.get('bookingId'))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [confirmCheckInOpen, setConfirmCheckInOpen] = useState(false)
  const invalidate = useInvalidate()
  const eligible = (bookings.data || []).filter((b) =>
    kind === 'check-in' ? b.status === 'CONFIRMED' : b.status === 'CHECKED_IN',
  )

  useEffect(() => {
    if (!Number.isInteger(requestedBookingId) || requestedBookingId <= 0) return
    const list = (bookings.data || []).filter((b) =>
      kind === 'check-in' ? b.status === 'CONFIRMED' : b.status === 'CHECKED_IN',
    )
    const match = list.find((b) => b.id === requestedBookingId)
    if (match) setSelected(match)
  }, [requestedBookingId, bookings.data, kind])
  const matches = eligible.filter((b) =>
    `${b.bookingCode} ${b.customerName}`.toLowerCase().includes(search.toLowerCase()),
  )
  const roomById = new Map((rooms.data || []).map((room) => [room.id, room]))
  const roomIssues =
    selected?.rooms?.filter((bookingRoom) => {
      const room = roomById.get(bookingRoom.roomId)
      return !room || !room.operational || room.status !== 'AVAILABLE'
    }) || []

  const mutation = useMutation({
    mutationFn: (id: number) => request(api.post<ApiResponse<Booking | Invoice>>(`/reception/bookings/${id}/${kind}`)),
    onSuccess: async () => {
      toast.success(kind === 'check-in' ? 'Đã hoàn tất nhận phòng' : 'Đã hoàn tất trả phòng')
      setConfirmCheckInOpen(false)
      setSelected(null)
      setSearch('')
      await invalidate()
    },
    onError: (e) => {
      setConfirmCheckInOpen(false)
      toast.error(errorMessage(e, 'Không thể hoàn tất thao tác này'))
    },
  })

  return (
    <div className="ops-page">
      <PageTitle
        kicker={kind === 'check-in' ? 'CHÀO ĐÓN KHÁCH' : 'HOÀN TẤT KỲ LƯU TRÚ'}
        title={kind === 'check-in' ? 'Nhận phòng' : 'Trả phòng'}
        detail={
          kind === 'check-in'
            ? 'Chỉ booking đã xác nhận mới xuất hiện trong danh sách'
            : 'Chọn khách đang lưu trú để lập hóa đơn và hoàn tất trả phòng'
        }
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <div className="lifecycle-layout">
          <section className="panel lifecycle-search">
            <label className="table-search lifecycle-input">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã đặt phòng hoặc tên khách…"
              />
            </label>
            <span className="section-kicker">
              {kind === 'check-in' ? 'Sẵn sàng nhận phòng' : 'Đang lưu trú'} ({matches.length})
            </span>
            {matches.length ? (
              <div className="lifecycle-results">
                {matches.map((b) => (
                  <button
                    className={`lifecycle-result ${selected?.id === b.id ? 'selected' : ''}`}
                    key={b.id}
                    onClick={() => setSelected(b)}
                  >
                    <span className="booking-result-icon">
                      {kind === 'check-in' ? <KeyRound size={17} /> : <DoorOpen size={17} />}
                    </span>
                    <span>
                      <b>{b.customerName}</b>
                      <small className="booking-code-display">
                        {b.bookingCode} — {b.roomNumbers?.map((n) => `#${n}`).join(', ') || 'Chưa gán phòng'}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-compact">Không có booking phù hợp</div>
            )}
          </section>

          <section className="panel lifecycle-detail">
            {selected ? (
              <>
                <div className="detail-header">
                  <div>
                    <span className="section-kicker">MÃ ĐẶT PHÒNG</span>
                    <h3 className="booking-code-display">{selected.bookingCode}</h3>
                  </div>
                  <span className={`status-badge ${statusTone(selected.status)}`}>
                    {bookingNames[selected.status]}
                  </span>
                </div>

                <div className="detail-customer">
                  <div className="avatar large-avatar" aria-hidden="true">
                    <img src="/a_clean_icon_style_image_a_simple_white_user_pers.png" alt="" width={1536} height={1024} />
                  </div>
                  <div>
                    <b>{selected.customerName}</b>
                    <span>Khách hàng</span>
                  </div>
                </div>

                <div className="lifecycle-info">
                  <div>
                    <span>NGÀY NHẬN</span>
                    <b>{date(selected.checkInDate)}</b>
                  </div>
                  <div>
                    <span>NGÀY TRẢ</span>
                    <b>{date(selected.checkOutDate)}</b>
                  </div>
                  <div>
                    <span>SỐ ĐÊM</span>
                    <b>{selected.numberOfNights} đêm</b>
                  </div>
                </div>

                <div className="lifecycle-room-block">
                  <span className="section-kicker">PHÒNG TRONG ĐẶT CHỖ</span>
                  {selected.rooms?.map((r, idx) => {
                    const actual = roomById.get(r.roomId)
                    const roomThumb = actual?.imageUrl || actual?.imageUrls?.[0] || selected.roomImageUrls?.[idx]
                    return (
                      <div key={r.roomId}>
                        <RoomThumbnail
                          src={roomThumb}
                          alt={`Phòng ${r.roomNumber}`}
                          className="lifecycle-room-thumb"
                          iconSize={16}
                        />
                        <span>
                          <b>Phòng {r.roomNumber}</b>
                          <small>
                            {r.guestCount}/{r.capacity} khách, {money(r.pricePerNight)}/đêm
                          </small>
                        </span>
                        <span className={`status-badge room-${actual?.status.toLowerCase() || 'maintenance'}`}>
                          {actual
                            ? `${roomNames[actual.status]}${actual.operational ? '' : ' (ngừng hoạt động)'}`
                            : 'Không tìm thấy phòng'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {kind === 'check-in' &&
                  (rooms.isPending ? (
                    <div className="inline-warning">
                      <CircleAlert size={15} /> Đang kiểm tra tình trạng phòng…
                    </div>
                  ) : (
                    roomIssues.length > 0 && (
                      <div className="inline-warning">
                        <CircleAlert size={15} /> Một hoặc nhiều phòng chưa sẵn sàng — kiểm tra trạng thái phòng trước
                        khi nhận khách
                      </div>
                    )
                  ))}

                {kind === 'check-out' ? (
                  <Link className="button button-gold full-button" to={`/reception/invoices?bookingId=${selected.id}`}>
                    Mở hóa đơn và trả phòng <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={mutation.isPending || rooms.isPending || rooms.isError || roomIssues.length > 0}
                    onClick={() => setConfirmCheckInOpen(true)}
                  >
                    {mutation.isPending ? 'Đang xử lý…' : 'Xác nhận nhận phòng'} <Check size={16} />
                  </button>
                )}

                <p className="summary-terms">
                  <ShieldCheck size={14} /> Trạng thái phòng được kiểm tra trước khi nhận khách
                </p>
              </>
            ) : (
              <div className="lifecycle-empty">
                <ClipboardCheck size={27} />
                <h3>Chọn một booking</h3>
                <p>Thông tin khách lưu trú sẽ xuất hiện tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={confirmCheckInOpen && selected !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setConfirmCheckInOpen(false)
        }}
        title="Xác nhận nhận phòng"
        message={`Xác nhận nhận phòng cho ${selected?.customerName || ''} (đơn ${selected?.bookingCode || ''})?`}
        confirmLabel="Xác nhận nhận phòng"
        tone="primary"
        pending={mutation.isPending}
        onConfirm={() => {
          if (selected) mutation.mutate(selected.id)
        }}
      />
    </div>
  )
}

function PendingServiceRequests({
  items,
  loading,
  error,
  reviewing,
  retry,
  onReview,
}: {
  items?: ServiceUsage[]
  loading: boolean
  error: unknown
  reviewing: boolean
  retry: () => void
  onReview: (id: number, decision: 'approve' | 'reject') => void
}) {
  if (error) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h3>Yêu cầu dịch vụ</h3>
        </div>
        <ErrorPanel error={error} retry={retry} />
      </section>
    )
  }
  if (loading || !items?.length) return null
  return (
    <section className="panel pending-service-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">CẦN XỬ LÝ</span>
          <h3>Yêu cầu dịch vụ ({items.length})</h3>
        </div>
        <span className="status-badge amber">Chờ duyệt</span>
      </div>
      <div className="pending-service-list">
        {items.map((item) => (
          <article className="pending-service-row" key={item.id}>
            <div>
              <b>
                {item.serviceName} × {item.quantity} {item.unit}
              </b>
              <span>
                {item.customerName} — {item.bookingCode} — Phòng {item.roomNumber || '—'}
              </span>
              <small>
                {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(item.orderedAt),
                )}
              </small>
            </div>
            <strong>{money(item.subTotal)}</strong>
            <div className="actions-inline">
              <button className="table-action" disabled={reviewing} onClick={() => onReview(item.id, 'approve')}>
                Duyệt
              </button>
              <button
                className="table-action danger-outline"
                disabled={reviewing}
                onClick={() =>
                  window.confirm(`Từ chối yêu cầu ${item.serviceName} của ${item.customerName}?`) &&
                  onReview(item.id, 'reject')
                }
              >
                Từ chối
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ServicesManagement() {
  const queryClient = useQueryClient()
  const { bookings } = useOpsData()
  const services = useQuery({
    queryKey: ['ops-services'],
    queryFn: () => request(api.get<ApiResponse<ServiceItem[]>>('/reception/services')),
  })
  const pendingUsages = useQuery({
    queryKey: ['pending-service-requests'],
    queryFn: () => request(api.get<ApiResponse<ServiceUsage[]>>('/reception/service-usages/pending')),
  })
  const reviewUsage = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'approve' | 'reject' }) =>
      request(api.patch<ApiResponse<ServiceUsage>>(`/reception/service-usages/${id}/${decision}`, {})),
    onSuccess: async (_, variables) => {
      toast.success(variables.decision === 'approve' ? 'Đã duyệt yêu cầu dịch vụ' : 'Đã từ chối yêu cầu dịch vụ')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-service-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['ops-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['service-usages'] }),
      ])
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', unitPrice: '', unit: 'lần' })
  const [bookingId, setBookingId] = useState('')
  const [bookingRoomId, setBookingRoomId] = useState('')
  const [serviceItemId, setServiceItemId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const checkedInBookings = (bookings.data || []).filter((b) => b.status === 'CHECKED_IN')
  const activeBooking = checkedInBookings.find((b) => String(b.id) === bookingId)
  const activeRoomId = activeBooking?.rooms?.some((room) => String(room.roomId) === bookingRoomId)
    ? bookingRoomId
    : String(activeBooking?.rooms?.[0]?.roomId || '')
  const activeBookingRoom = activeBooking?.rooms?.find((room) => String(room.roomId) === activeRoomId)

  const usages = useQuery({
    queryKey: ['service-usages', bookingId],
    queryFn: () => request(api.get<ApiResponse<ServiceUsage[]>>(`/reception/bookings/${bookingId}/service-usages`)),
    enabled: Boolean(bookingId),
  })

  const openForm = (item?: ServiceItem) => {
    setEditing(item || null)
    setForm({ name: item?.name || '', unitPrice: String(item?.unitPrice || ''), unit: item?.unit || 'lần' })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<ServiceItem>>({
          method: editing ? 'PUT' : 'POST',
          url: editing ? `/reception/services/${editing.id}` : '/reception/services',
          data: { ...form, unitPrice: Number(form.unitPrice) },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu dịch vụ')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ops-services'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggle = useMutation({
    mutationFn: (item: ServiceItem) =>
      request(
        api.patch<ApiResponse<ServiceItem>>(`/reception/services/${item.id}/active`, undefined, {
          params: { active: !item.active },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã cập nhật trạng thái dịch vụ')
      await queryClient.invalidateQueries({ queryKey: ['ops-services'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const addUsage = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<ServiceUsage>>(`/reception/bookings/${bookingId}/service-usages`, {
          bookingRoomId: activeBookingRoom?.bookingRoomId,
          serviceItemId: Number(serviceItemId),
          quantity: Number(quantity),
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã thêm dịch vụ vào booking')
      setServiceItemId('')
      setQuantity('1')
      await queryClient.invalidateQueries({ queryKey: ['service-usages', bookingId] })
      await queryClient.invalidateQueries({ queryKey: ['ops-bookings'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cancelUsage = useMutation({
    mutationFn: (id: number) =>
      request(api.patch<ApiResponse<ServiceUsage>>(`/reception/service-usages/${id}/cancel`, { reason: 'Điều chỉnh tại quầy' })),
    onSuccess: async () => {
      toast.success('Đã hủy khoản dịch vụ')
      await queryClient.invalidateQueries({ queryKey: ['service-usages', bookingId] })
      await queryClient.invalidateQueries({ queryKey: ['ops-bookings'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const serviceTableScrollRef = useFourRowTableScroll(services.data?.length ?? 0, 6)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="TIỆN ÍCH & DỊCH VỤ"
        title="Dịch vụ khách sạn"
        detail="Quản lý danh mục dịch vụ và mức giá khách sạn cung cấp"
        action={
          <button className="button button-dark" onClick={() => openForm()}>
            <Plus size={16} /> Thêm dịch vụ
          </button>
        }
      />

      <PendingServiceRequests
        items={pendingUsages.data}
        loading={pendingUsages.isPending}
        error={pendingUsages.error}
        reviewing={reviewUsage.isPending}
        retry={() => void pendingUsages.refetch()}
        onReview={(id, decision) => reviewUsage.mutate({ id, decision })}
      />

      <section className="panel usage-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PHÁT SINH TRONG KỲ LƯU TRÚ</span>
            <h3>Ghi nhận dịch vụ</h3>
            <p className="panel-sub-note">
              Thêm dịch vụ phát sinh (giặt ủi, ăn uống, đưa đón…) trực tiếp vào hóa đơn của khách đang lưu trú.
            </p>
          </div>
          <span className="live-pill">
            {bookings.isPending ? 'Đang tải booking…' : `${checkedInBookings.length} booking đang lưu trú`}
          </span>
        </div>

        {bookings.isError ? (
          <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
        ) : (
          <>
            <form
              className="usage-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (!checkedInBookings.length) {
                  return toast.error('Hiện chưa có booking nào đang lưu trú (đã nhận phòng).')
                }
                if (!bookingId || !activeBookingRoom?.bookingRoomId) {
                  return toast.error('Vui lòng chọn booking và phòng đang lưu trú.')
                }
                if (!serviceItemId) {
                  return toast.error('Vui lòng chọn dịch vụ muốn thêm.')
                }
                if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
                  return toast.error('Số lượng phải là số nguyên từ 1 trở lên.')
                }
                addUsage.mutate()
              }}
            >
              <label className="form-field">
                <span>Booking</span>
                <select
                  value={bookingId}
                  disabled={bookings.isPending || !checkedInBookings.length}
                  onChange={(e) => {
                    setBookingId(e.target.value)
                    setBookingRoomId('')
                  }}
                >
                  <option value="">
                    {bookings.isPending
                      ? 'Đang tải booking…'
                      : checkedInBookings.length
                        ? 'Chọn khách đang lưu trú'
                        : 'Chưa có khách đang lưu trú'}
                  </option>
                  {checkedInBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} — {b.customerName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Phòng trong booking</span>
                <select
                  value={activeRoomId}
                  onChange={(e) => setBookingRoomId(e.target.value)}
                  disabled={!activeBooking}
                >
                  <option value="">{activeBooking ? 'Chọn phòng' : 'Chọn booking trước'}</option>
                  {activeBooking?.rooms?.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Dịch vụ</span>
                <select
                  value={serviceItemId}
                  disabled={!checkedInBookings.length}
                  onChange={(e) => setServiceItemId(e.target.value)}
                >
                  <option value="">Chọn dịch vụ</option>
                  {services.data
                    ?.filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {money(s.unitPrice)}/{s.unit}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                <span>Số lượng</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  disabled={!checkedInBookings.length}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="button button-dark"
                disabled={addUsage.isPending || bookings.isPending}
              >
                <Plus size={15} /> {addUsage.isPending ? 'Đang thêm…' : 'Thêm vào booking'}
              </button>
            </form>

            {!bookings.isPending && !checkedInBookings.length && (
              <p className="usage-empty-hint">
                Hiện chưa có khách nào ở trạng thái đang lưu trú (đã nhận phòng). Khi có khách nhận phòng tại quầy, bạn có thể chọn booking ở trên để ghi nhận dịch vụ phát sinh vào hóa đơn.
              </p>
            )}
          </>
        )}

        {bookingId && (
          <div className="usage-history">
            <div className="usage-history-heading">
              <span className="section-kicker">LỊCH SỬ BOOKING</span>
              <span>{usages.data?.length || 0} dòng</span>
            </div>
            {usages.isPending ? (
              <LoadingRows count={2} />
            ) : usages.isError ? (
              <ErrorPanel error={usages.error} retry={() => void usages.refetch()} />
            ) : usages.data?.length ? (
              usages.data.map((usage) => (
                <div className={`usage-row ${usage.cancelled ? 'cancelled' : ''}`} key={usage.id}>
                  <div>
                    <b>{usage.serviceName}</b>
                    <small>
                      Phòng {usage.roomNumber || '—'}, {usage.quantity} {usage.unit}
                    </small>
                  </div>
                  <span>{usage.approvalStatus === 'APPROVED' ? money(usage.subTotal) : '—'}</span>
                  {usage.approvalStatus === 'PENDING' ? (
                    <span className="status-badge amber">Chờ duyệt</span>
                  ) : usage.approvalStatus === 'REJECTED' ? (
                    <span className="status-badge gray">Từ chối</span>
                  ) : usage.cancelled ? (
                    <span className="status-badge gray">Đã hủy</span>
                  ) : (
                    <button
                      className="table-action"
                      disabled={cancelUsage.isPending}
                      onClick={() =>
                        window.confirm(`Hủy ${usage.serviceName} khỏi hóa đơn?`) && cancelUsage.mutate(usage.id)
                      }
                    >
                      Hủy khoản
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-compact">Booking chưa phát sinh dịch vụ</div>
            )}
          </div>
        )}
      </section>

      {services.isPending ? (
        <LoadingRows />
      ) : services.isError ? (
        <ErrorPanel error={services.error} retry={() => void services.refetch()} />
      ) : (
        <section className="panel table-panel">
          <div ref={serviceTableScrollRef} className="table-scroll table-scroll-6">
            <table>
              <thead>
                <tr>
                  <th>DỊCH VỤ</th>
                  <th>ĐƠN GIÁ</th>
                  <th>ĐƠN VỊ</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {services.data?.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <b>{s.name}</b>
                      <small className="cell-sub">Mã dịch vụ #{s.id}</small>
                    </td>
                    <td>
                      <b>{money(s.unitPrice)}</b>
                    </td>
                    <td>{s.unit || '—'}</td>
                    <td>
                      <span className={`status-badge ${s.active ? 'green' : 'gray'}`}>
                        {s.active ? 'Đang phục vụ' : 'Đã tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-inline">
                        <button className="table-action" onClick={() => openForm(s)}>
                          Chỉnh sửa
                        </button>
                        <button className="table-action" disabled={toggle.isPending} onClick={() => toggle.mutate(s)}>
                          {s.active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!services.data?.length && <div className="empty-table">Chưa có dịch vụ trong danh mục</div>}
          </div>
        </section>
      )}

      {open && (
        <Modal title={editing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'} close={() => setOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.name.trim() || Number(form.unitPrice) <= 0) {
                return toast.error('Vui lòng nhập tên và đơn giá hợp lệ')
              }
              save.mutate()
            }}
          >
            <Input
              label="Tên dịch vụ"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              required
            />
            <Input
              label="Đơn giá (VND)"
              value={form.unitPrice}
              type="money"
              onChange={(unitPrice) => setForm({ ...form, unitPrice })}
              required
            />
            <Input
              label="Đơn vị"
              value={form.unit}
              onChange={(unit) => setForm({ ...form, unit })}
            />
            <button className="button button-dark full-button" disabled={save.isPending}>
              Lưu dịch vụ <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function InvoicesManagement() {
  const [searchParams] = useSearchParams()
  const { bookings } = useOpsData()
  const [search, setSearch] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [amount, setAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false)
  const requestedBookingId = Number(searchParams.get('bookingId')) || null
  const requestHandled = useRef<number | null>(null)
  const invalidate = useInvalidate()

  const eligible = (bookings.data || []).filter((b) => ['CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(b.status))

  const paymentDateMatches = useQuery({
    queryKey: ['ops-invoice-payment-dates', searchDate, eligible.map((b) => b.id)],
    queryFn: async () => {
      const matches = await Promise.all(
        eligible.map(async (booking) => {
          try {
            const inv = await request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${booking.id}`))
            const paymentDates = [
              inv.paidAt,
              ...(inv.payments || []).filter((p) => p.status === 'SUCCESSFUL').map((p) => p.paidAt),
            ]
            return paymentDates.some((paidAt) => paidAt?.slice(0, 10) === searchDate) ? booking.id : null
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) return null
            throw error
          }
        }),
      )
      return matches.filter((id): id is number => id !== null)
    },
    enabled: Boolean(searchDate) && bookings.data !== undefined,
  })

  const visible = eligible.filter(
    (b) =>
      `${b.bookingCode} ${b.customerName}`.toLowerCase().includes(search.toLowerCase()) &&
      (!searchDate || b.depositPaidAt?.slice(0, 10) === searchDate || paymentDateMatches.data?.includes(b.id)),
  )

  const invoiceQuery = useQuery({
    queryKey: ['ops-invoice', invoice?.bookingId],
    queryFn: () => request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${invoice?.bookingId}`)),
    enabled: Boolean(invoice?.bookingId),
  })

  const create = useMutation({
    mutationFn: (bookingId: number) => request(api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/invoice`, {})),
    onSuccess: async (value) => {
      setInvoice(value)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const updateDraft = useMutation({
    mutationFn: () => {
      if (!invoice) throw new Error('Chưa có hóa đơn dự thảo để cập nhật')
      const discount = Number(discountAmount)
      if (!Number.isFinite(discount) || discount < 0) throw new Error('Số tiền giảm giá phải bằng hoặc lớn hơn 0')
      return request(
        api.put<ApiResponse<Invoice>>(`/reception/invoices/${invoice.id}/draft`, {
          surcharge: invoice.surcharge,
          discount,
        }),
      )
    },
    onSuccess: async (value) => {
      setInvoice(value)
      toast.success('Đã cập nhật giảm giá và tổng tiền hóa đơn')
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const issue = useMutation({
    mutationFn: (id: number) => request(api.post<ApiResponse<Invoice>>(`/reception/invoices/${id}/issue`)),
    onSuccess: async (value) => {
      setInvoice(value)
      toast.success('Hóa đơn đã phát hành')
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const payment = useMutation({
    mutationFn: () => {
      if (!invoiceQuery.data) throw new Error('Chưa có hóa đơn để ghi nhận thanh toán')
      return request(
        api.post<ApiResponse<{ id: number }>>(`/reception/invoices/${invoiceQuery.data.id}/payments`, {
          amount: Number(amount),
          method: 'CASH',
          idempotencyKey: crypto.randomUUID(),
          reference: 'Thu tiền mặt tại quầy',
        }),
      )
    },
    onSuccess: async () => {
      toast.success('Đã ghi nhận thanh toán tiền mặt')
      setAmount('')
      await invoiceQuery.refetch()
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const completeCheckout = useMutation({
    mutationFn: (bookingId: number) =>
      request(api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/check-out`)),
    onSuccess: async (value) => {
      setConfirmCheckoutOpen(false)
      setInvoice(value)
      toast.success('Trả phòng đã được hoàn tất')
      await invalidate()
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const openInvoice = async (bookingId: number) => {
    try {
      const current = await request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${bookingId}`))
      if (current.status === 'DRAFT') {
        setInvoice(
          await request(
            api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/invoice`, {
              surcharge: current.surcharge,
              discount: current.discount,
            }),
          ),
        )
      } else {
        setInvoice(current)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) create.mutate(bookingId)
      else toast.error(errorMessage(error))
    }
  }

  useEffect(() => {
    if (requestedBookingId && bookings.data && requestHandled.current !== requestedBookingId) {
      requestHandled.current = requestedBookingId
      void openInvoice(requestedBookingId)
    }
  }, [requestedBookingId, bookings.data])

  const shown = invoiceQuery.data || invoice
  const selectedBooking = bookings.data?.find((booking) => booking.id === shown?.bookingId)
  const isCheckedOut =
    selectedBooking?.status === 'COMPLETED' ||
    selectedBooking?.status === 'CHECKED_OUT' ||
    Boolean(selectedBooking?.checkedOutAt)

  useEffect(() => {
    if (!invoiceQuery.data) return
    setAmount(String(invoiceQuery.data.balanceDue))
    if (invoiceQuery.data.status === 'DRAFT') setDiscountAmount(String(invoiceQuery.data.discount))
  }, [invoiceQuery.data])

  return (
    <div className="ops-page">
      <PageTitle
        kicker="HÓA ĐƠN & THANH TOÁN"
        title="Thu ngân"
        detail="Xem hóa đơn, chi phí phát sinh và ghi nhận thanh toán tại quầy"
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <div className="invoice-layout">
          <section className="panel invoice-booking-list">
            <div className="table-tools invoice-search-tools">
              <div className="invoice-search-field">
                <span>Tìm đơn / khách</span>
                <label className="table-search">
                  <Search size={16} />
                  <input
                    placeholder="Mã booking hoặc tên khách…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <label className="invoice-date-filter">
                <span>Ngày thanh toán</span>
                <input
                  type="date"
                  aria-label="Lọc hóa đơn theo ngày thanh toán"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </label>
            </div>

            <span className="section-kicker invoice-list-label">Booking cần hóa đơn ({visible.length})</span>

            {searchDate && paymentDateMatches.isPending ? (
              <div className="empty-compact">Đang tìm giao dịch thanh toán…</div>
            ) : paymentDateMatches.isError ? (
              <ErrorPanel error={paymentDateMatches.error} retry={() => void paymentDateMatches.refetch()} />
            ) : visible.length ? (
              <div className="invoice-booking-scroll">
                {visible.map((b) => (
                  <button
                    type="button"
                    className={`invoice-booking-row ${invoice?.bookingId === b.id ? 'selected' : ''}`}
                    key={b.id}
                    onClick={() => void openInvoice(b.id)}
                  >
                    <span className="booking-result-icon">
                      <FileText size={17} />
                    </span>
                    <span>
                      <b>{b.customerName}</b>
                      <small>
                        {b.bookingCode} — {searchDate ? `Thanh toán ${date(searchDate)}` : date(b.checkInDate)}
                      </small>
                    </span>
                    <span className={`status-badge ${statusTone(b.status)}`}>{bookingNames[b.status]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-compact">Không có booking phù hợp với bộ lọc</div>
            )}
          </section>

          <section className="panel invoice-detail">
            {invoiceQuery.isFetching || create.isPending ? (
              <div className="lifecycle-empty">
                <span className="spinner" /> Đang tải hóa đơn…
              </div>
            ) : invoiceQuery.isError && !shown ? (
              <ErrorPanel error={invoiceQuery.error} />
            ) : shown ? (
              <>
                <div className="invoice-head">
                  <div>
                    <span className="section-kicker">Hóa đơn #HG-{shown.id}</span>
                    <h3>{shown.customerName}</h3>
                    <p>
                      Mã đặt phòng: <strong>{selectedBooking?.bookingCode || `#${shown.bookingId}`}</strong>
                      {selectedBooking?.roomNumbers?.length
                        ? ` · ${selectedBooking.roomNumbers.map((r) => `Phòng ${r}`).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`status-badge ${shown.isPaid || shown.status === 'PAID' ? 'green' : shown.status === 'ISSUED' ? 'amber' : 'gray'}`}
                  >
                    {shown.isPaid || shown.status === 'PAID'
                      ? 'Đã thanh toán'
                      : shown.status === 'DRAFT'
                        ? 'Bản nháp'
                        : 'Chờ thanh toán'}
                  </span>
                </div>

                <div className="invoice-booking-dates">
                  <div>
                    <span>NGÀY NHẬN DỰ KIẾN</span>
                    <b>{selectedBooking ? date(selectedBooking.checkInDate) : '—'}</b>
                  </div>
                  <div>
                    <span>NGÀY TRẢ DỰ KIẾN</span>
                    <b>{selectedBooking ? date(selectedBooking.checkOutDate) : '—'}</b>
                  </div>
                  <div>
                    <span>CHECK-IN THỰC TẾ</span>
                    <b>{dateTime(selectedBooking?.checkedInAt)}</b>
                  </div>
                  <div>
                    <span>CHECK-OUT THỰC TẾ</span>
                    <b>{dateTime(selectedBooking?.checkedOutAt)}</b>
                  </div>
                </div>

                {shown.status === 'DRAFT' && (
                  <form
                    className="invoice-discount-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateDraft.mutate()
                    }}
                  >
                    <label className="form-field">
                      <span>Số tiền giảm giá (VND)</span>
                      <MoneyInput value={discountAmount} onChange={setDiscountAmount} required />
                    </label>
                    <button type="submit" className="button button-outline full-button" disabled={updateDraft.isPending}>
                      {updateDraft.isPending ? 'Đang cập nhật…' : 'Cập nhật giá hóa đơn'}
                    </button>
                    <small className="muted">Lưu mức giảm giá để cập nhật tổng tiền cuối cùng trước khi phát hành</small>
                  </form>
                )}

                {shown.items?.length > 0 && (
                  <div className="invoice-section-block">
                    <span className="section-kicker">Chi tiết khoản mục</span>
                    <div className="invoice-item-list">
                      {shown.items.map((item) => (
                        <div key={item.id}>
                          <span>
                            {localizeInvoiceItemDescription(item.description)}
                            <small>
                              {item.quantity} × {money(item.unitPrice)}
                            </small>
                          </span>
                          <b>{money(item.lineTotal)}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="invoice-section-block">
                  <span className="section-kicker">Tổng hợp thanh toán</span>
                  <div className="invoice-lines">
                    <div>
                      <span>Tiền phòng</span>
                      <b>{money(shown.roomAmount)}</b>
                    </div>
                    <div>
                      <span>Dịch vụ</span>
                      <b>{money(shown.serviceAmount)}</b>
                    </div>
                    <div>
                      <span>Thuế VAT</span>
                      <b>{money(shown.tax)}</b>
                    </div>
                    {shown.surcharge > 0 && (
                      <div>
                        <span>Phụ thu</span>
                        <b>{money(shown.surcharge)}</b>
                      </div>
                    )}
                    {shown.discount > 0 && (
                      <div>
                        <span>Giảm giá</span>
                        <b>−{money(shown.discount)}</b>
                      </div>
                    )}
                  </div>
                </div>

                <div className="invoice-grand">
                  <span>Tổng thanh toán</span>
                  <b>{money(shown.totalAmount)}</b>
                </div>

                <div className="invoice-balance">
                  <div>
                    <span>Đã thanh toán</span>
                    <b>{money(shown.successfulPayments)}</b>
                  </div>
                  <div>
                    <span>Còn lại</span>
                    <b>{money(shown.balanceDue)}</b>
                  </div>
                </div>

                {shown.status === 'DRAFT' && (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={issue.isPending}
                    onClick={() => issue.mutate(shown.id)}
                  >
                    {issue.isPending ? 'Đang phát hành…' : 'Phát hành hóa đơn'} <Check size={15} />
                  </button>
                )}

                {shown.balanceDue > 0 && shown.status === 'ISSUED' && (
                  <form
                    className="payment-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (Number(amount) <= 0 || Number(amount) > shown.balanceDue) {
                        return toast.error('Nhập số tiền dương không vượt quá số dư')
                      }
                      payment.mutate()
                    }}
                  >
                    <label className="form-field">
                      <span>Thu tiền mặt (VND)</span>
                      <MoneyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder={String(shown.balanceDue)}
                        required
                      />
                    </label>
                    <button type="submit" className="button button-dark full-button" disabled={payment.isPending}>
                      {payment.isPending ? 'Đang ghi nhận…' : 'Ghi nhận tiền mặt'} <Check size={15} />
                    </button>
                    <small className="muted">Chỉ hỗ trợ ghi nhận tiền mặt tại quầy</small>
                  </form>
                )}

                {shown.status === 'PAID' && shown.balanceDue === 0 && !isCheckedOut && (
                  <button
                    type="button"
                    className="button button-gold full-button"
                    disabled={completeCheckout.isPending}
                    onClick={() => setConfirmCheckoutOpen(true)}
                  >
                    {completeCheckout.isPending ? 'Đang hoàn tất…' : 'Hoàn tất trả phòng'} <ArrowRight size={15} />
                  </button>
                )}

                {isCheckedOut && (
                  <div className="invoice-checkout-done">
                    <Check size={16} />
                    <span>
                      Đã hoàn tất trả phòng
                      {selectedBooking?.checkedOutAt ? ` lúc ${dateTime(selectedBooking.checkedOutAt)}` : ''}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="print-button"
                  onClick={() => setPrintPreviewOpen(true)}
                >
                  <ReceiptText size={15} /> In / lưu trang hóa đơn
                </button>
              </>
            ) : (
              <div className="lifecycle-empty">
                <FileText size={28} />
                <h3>Chọn booking</h3>
                <p>Chi tiết hóa đơn sẽ hiển thị tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmCheckoutOpen && Boolean(shown)}
        onOpenChange={(open) => {
          if (!open && !completeCheckout.isPending) setConfirmCheckoutOpen(false)
        }}
        title="Hoàn tất trả phòng"
        message={`Xác nhận hoàn tất trả phòng cho ${shown?.customerName || ''} (Hóa đơn #HG-${shown?.id || ''})? Phòng sẽ chuyển sang trạng thái Đang dọn dẹp.`}
        confirmLabel="Hoàn tất trả phòng"
        tone="gold"
        pending={completeCheckout.isPending}
        onConfirm={() => {
          if (shown) completeCheckout.mutate(shown.bookingId)
        }}
      />

      <Dialog
        open={printPreviewOpen && Boolean(shown)}
        onOpenChange={setPrintPreviewOpen}
        title={shown ? `Bản in & Lưu hóa đơn #HG-${shown.id}` : 'Hóa đơn'}
        description="Tải về tệp hóa đơn để lưu trữ hoặc mở trên trình duyệt để in / lưu PDF."
        size="md"
      >
        {shown && (
          <div className="ops-modal-body invoice-print-preview">
            <div className="invoice-print-sheet">
              <div className="invoice-print-head">
                <div>
                  <span className="section-kicker">HOÀNG GIA HOTEL</span>
                  <h4>Hóa đơn #HG-{shown.id}</h4>
                  <p>
                    Khách hàng: <strong>{shown.customerName}</strong> · Mã đơn:{' '}
                    <strong>{selectedBooking?.bookingCode || `#${shown.bookingId}`}</strong>
                  </p>
                </div>
                <span
                  className={`status-badge ${shown.status === 'PAID' ? 'green' : shown.status === 'ISSUED' ? 'blue' : 'gray'}`}
                >
                  {shown.status === 'PAID'
                    ? 'Đã thanh toán'
                    : shown.status === 'ISSUED'
                      ? 'Đã phát hành'
                      : 'Bản nháp'}
                </span>
              </div>

              <div className="invoice-print-meta">
                <div>
                  <span>PHÒNG</span>
                  <b>{selectedBooking?.roomNumbers?.length ? selectedBooking.roomNumbers.map((r) => `Phòng ${r}`).join(', ') : '—'}</b>
                </div>
                <div>
                  <span>NHẬN — TRẢ</span>
                  <b>
                    {selectedBooking ? `${date(selectedBooking.checkInDate)} → ${date(selectedBooking.checkOutDate)}` : '—'}
                  </b>
                </div>
                <div>
                  <span>CHECK-IN THỰC TẾ</span>
                  <b>{dateTime(selectedBooking?.checkedInAt)}</b>
                </div>
                <div>
                  <span>CHECK-OUT / THANH TOÁN</span>
                  <b>{dateTime(selectedBooking?.checkedOutAt || shown.paidAt)}</b>
                </div>
              </div>

              {shown.items?.length > 0 && (
                <div className="invoice-item-list">
                  {shown.items.map((item) => (
                    <div key={item.id}>
                      <span>
                        {localizeInvoiceItemDescription(item.description)}
                        <small>
                          {item.quantity} × {money(item.unitPrice)}
                        </small>
                      </span>
                      <b>{money(item.lineTotal)}</b>
                    </div>
                  ))}
                </div>
              )}

              <div className="invoice-lines">
                <div>
                  <span>Tiền phòng</span>
                  <b>{money(shown.roomAmount)}</b>
                </div>
                <div>
                  <span>Dịch vụ</span>
                  <b>{money(shown.serviceAmount)}</b>
                </div>
                <div>
                  <span>Thuế VAT</span>
                  <b>{money(shown.tax)}</b>
                </div>
                {shown.surcharge > 0 && (
                  <div>
                    <span>Phụ thu</span>
                    <b>{money(shown.surcharge)}</b>
                  </div>
                )}
                {shown.discount > 0 && (
                  <div>
                    <span>Giảm giá</span>
                    <b>−{money(shown.discount)}</b>
                  </div>
                )}
              </div>

              <div className="invoice-grand">
                <span>Tổng thanh toán</span>
                <b>{money(shown.totalAmount)}</b>
              </div>
              <div className="invoice-balance">
                <span>
                  Đã thanh toán <b>{money(shown.successfulPayments)}</b>
                </span>
                <span>
                  Còn lại <b>{money(shown.balanceDue)}</b>
                </span>
              </div>
            </div>

            <div className="ops-modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  const res = tryNativePrint()
                  if (res.threw || res.inIframe) {
                    toast.info(
                      'Nếu trình duyệt nhúng chặn hộp thoại in tự động, hãy nhấn Ctrl+P hoặc dùng nút "Tải hóa đơn (.html)".',
                    )
                  }
                }}
              >
                <Printer size={15} /> In trực tiếp
              </button>
              <button
                type="button"
                className="button button-dark"
                onClick={() => {
                  downloadPrintableInvoice(shown, selectedBooking)
                  toast.success('Đã tải tệp hóa đơn. Mở tệp trên trình duyệt để in hoặc lưu PDF.')
                }}
              >
                <Download size={15} /> Tải hóa đơn (.html)
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(open) => !open && close()} title={title}>
      <div className="ops-modal-body">{children}</div>
    </Dialog>
  )
}

function Input({
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
