import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarDays, ChevronRight, ClipboardCheck, FileText, KeyRound, ShieldCheck } from 'lucide-react'
import { api, request } from '../../lib/api'
import type { ApiResponse, Booking, Room, RoomStatus, ServiceUsage, Summary } from '../../lib/types'
import '../../styles/reception-overview.css'
import { ErrorPanel, LoadingRows, bookingNames, date, dateValue, money, roomNames, statusTone } from './reception-helpers'

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
