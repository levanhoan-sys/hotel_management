import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarDays, DoorOpen, SlidersHorizontal, UserCog, Users } from 'lucide-react'
import { api, request } from '../../lib/api'
import type { ApiResponse, Booking, Room, Summary } from '../../lib/types'
import '../../styles/reception-overview.css'
import {
  type AdminRoomTone,
  type Employee,
  Failure,
  Loading,
  type PricingRate,
  adminBookingNames,
  adminBookingTone,
  adminRoomNames,
  adminRoomTone,
  formatDateShort,
  money,
  pricingTitleMap,
} from './admin-helpers'

export function AdminHome() {
  const [roomFilter, setRoomFilter] = useState<AdminRoomTone>('ALL')

  const summary = useQuery({ queryKey: ['admin-summary'], queryFn: () => request(api.get<ApiResponse<Summary>>('/reception/summary')) })
  const rooms = useQuery({ queryKey: ['admin-rooms'], queryFn: () => request(api.get<ApiResponse<Room[]>>('/reception/rooms')) })
  const bookings = useQuery({ queryKey: ['admin-bookings'], queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')) })
  const employees = useQuery({ queryKey: ['admin-employees'], queryFn: () => request(api.get<ApiResponse<Employee[]>>('/admin/employees')) })
  const pricing = useQuery({ queryKey: ['admin-pricing'], queryFn: () => request(api.get<ApiResponse<PricingRate[]>>('/admin/pricing')) })

  const totals = summary.data
  const roomList = rooms.data ?? []
  const bookingList = bookings.data ?? []
  const employeeList = employees.data ?? []
  const pricingList = pricing.data ?? []

  const activeEmployees = employeeList.filter((e) => e.accountStatus === 'ACTIVE')
  const occupancyPct = totals && totals.totalRooms > 0 ? Math.round((totals.occupiedRooms / totals.totalRooms) * 100) : 0

  const roomStatusCards: Array<{ name: string; count: number; tone: Exclude<AdminRoomTone, 'ALL'> }> = totals
    ? [
        { name: 'Sẵn sàng', count: totals.availableRooms, tone: 'ready' },
        { name: 'Đang lưu trú', count: totals.occupiedRooms, tone: 'occupied' },
        { name: 'Đang dọn', count: totals.cleaningRooms, tone: 'cleaning' },
        { name: 'Bảo trì', count: totals.maintenanceRooms, tone: 'maintenance' },
      ]
    : []

  const filteredRooms = useMemo(
    () =>
      [...roomList]
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'vi', { numeric: true }))
        .filter((room) => roomFilter === 'ALL' || adminRoomTone(room.status) === roomFilter),
    [roomList, roomFilter],
  )

  const recentBookings = useMemo(() => [...bookingList].sort((a, b) => b.id - a.id).slice(0, 5), [bookingList])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="ops-page reception-overview">
      <header className="overview-header">
        <div className="overview-header-copy">
          <span className="overview-kicker">Trung tâm quản trị · Hoàng Gia Hotel</span>
          <h1>Tổng quan hệ thống</h1>
          <div className="overview-header-meta">
            <time dateTime={today}>
              {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}
            </time>
            <span aria-hidden="true">·</span>
            <span>Hệ thống đang hoạt động ổn định</span>
          </div>
        </div>
        <div className="overview-header-actions">
          <Link to="/admin/pricing" className="overview-btn-secondary">
            <SlidersHorizontal size={18} aria-hidden="true" /> Chiến lược giá
          </Link>
          <Link to="/admin/employees" className="overview-btn-primary">
            <UserCog size={18} aria-hidden="true" /> Quản lý nhân viên <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {summary.isPending || employees.isPending ? (
        <Loading />
      ) : summary.isError ? (
        <Failure error={summary.error} retry={() => void summary.refetch()} />
      ) : employees.isError ? (
        <Failure error={employees.error} retry={() => void employees.refetch()} />
      ) : (
        <>
          <section className="overview-kpi-grid" aria-label="Chỉ số tổng quan hệ thống">
            <article className="overview-kpi-card">
              <div className="overview-kpi-head">
                <span className="overview-kpi-label">Công suất &amp; quỹ phòng</span>
                <span className="overview-kpi-icon">
                  <BedDouble size={20} aria-hidden="true" />
                </span>
              </div>
              <p className="overview-kpi-value">{occupancyPct}%</p>
              <p className="overview-kpi-meta">
                {totals!.occupiedRooms}/{totals!.totalRooms} phòng đang có khách · {totals!.availableRooms} sẵn sàng
              </p>
            </article>

            <article className="overview-kpi-card">
              <div className="overview-kpi-head">
                <span className="overview-kpi-label">Lưu trú &amp; khách hàng</span>
                <span className="overview-kpi-icon" data-tone="blue">
                  <DoorOpen size={20} aria-hidden="true" />
                </span>
              </div>
              <p className="overview-kpi-value">{totals!.checkedInBookings}</p>
              <p className="overview-kpi-meta">
                {totals!.confirmedBookings} đơn đã xác nhận · {totals!.totalCustomers} khách hàng
              </p>
            </article>

            <article className="overview-kpi-card is-revenue">
              <div className="overview-kpi-head">
                <span className="overview-kpi-label">Doanh thu đã thanh toán</span>
                <span className="overview-kpi-icon" data-tone="gold">
                  <CalendarDays size={20} aria-hidden="true" />
                </span>
              </div>
              <p className="overview-kpi-value">{money(totals!.revenue)}</p>
              <Link to="/admin/rooms" className="overview-kpi-link">
                Quản lý danh mục phòng <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>

            <article className="overview-kpi-card">
              <div className="overview-kpi-head">
                <span className="overview-kpi-label">Nhân sự hoạt động</span>
                <span className="overview-kpi-icon" data-tone="amber">
                  <Users size={20} aria-hidden="true" />
                </span>
              </div>
              <p className="overview-kpi-value">
                {activeEmployees.length}/{employeeList.length}
              </p>
              <Link to="/admin/employees" className="overview-kpi-link">
                Danh sách tài khoản <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </section>

          <div className="overview-main-grid">
            <section className="overview-panel overview-rooms-panel" aria-labelledby="admin-rooms-overview-title">
              <div className="overview-panel-head">
                <div>
                  <h2 id="admin-rooms-overview-title">Tình trạng phòng trực tiếp</h2>
                  <p className="overview-panel-desc">Nhấp vào từng trạng thái để lọc nhanh sơ đồ phòng.</p>
                </div>
                <Link to="/admin/rooms" className="overview-action-link">
                  Quản lý phòng <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>

              <div className="overview-room-summary">
                <div className="overview-room-total">
                  <strong>{totals!.totalRooms}</strong> phòng toàn khách sạn
                </div>
                <span className="overview-occupancy-note">Công suất hiện tại: {occupancyPct}%</span>
              </div>

              <div className="overview-room-bar" aria-hidden="true">
                {roomStatusCards
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <span
                      key={item.tone}
                      data-tone={item.tone}
                      style={{ width: `${(item.count / Math.max(1, totals!.totalRooms)) * 100}%` }}
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

              <div className="overview-room-board-head">
                <span>Sơ đồ phòng ({filteredRooms.length} phòng)</span>
                {roomFilter !== 'ALL' && (
                  <button type="button" className="overview-clear-filter" onClick={() => setRoomFilter('ALL')}>
                    Hiện tất cả
                  </button>
                )}
              </div>

              {rooms.isPending ? (
                <Loading />
              ) : rooms.isError ? (
                <Failure error={rooms.error} retry={() => void rooms.refetch()} />
              ) : filteredRooms.length ? (
                <div className="overview-room-board">
                  {filteredRooms.slice(0, 9).map((room) => {
                    const tone = adminRoomTone(room.status)
                    return (
                      <Link key={room.id} to="/admin/rooms" className="overview-room-tile" data-tone={tone}>
                        <div className="overview-room-tile-top">
                          <strong>P.{room.roomNumber}</strong>
                          <span className="overview-room-state">{adminRoomNames[room.status] || room.status}</span>
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

            <section className="overview-panel" aria-labelledby="admin-ops-config-title">
              <div className="overview-panel-head">
                <div>
                  <h2 id="admin-ops-config-title">Chính sách giá &amp; Nhân sự</h2>
                  <p className="overview-panel-desc">Hệ số giá áp dụng hiện hành và danh sách tài khoản vận hành.</p>
                </div>
                <Link to="/admin/pricing" className="overview-action-link">
                  Điều chỉnh giá <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>

              {pricing.isPending ? (
                <Loading />
              ) : pricing.isError ? (
                <Failure error={pricing.error} retry={() => void pricing.refetch()} />
              ) : (
                <ul className="overview-list-rows" aria-label="Hệ số giá đang áp dụng">
                  {pricingList.map((rate) => {
                    const meta = pricingTitleMap[rate.strategy]
                    return (
                      <li key={rate.strategy} className="overview-list-row">
                        <div className="overview-list-copy">
                          <strong>{meta.title}</strong>
                          <small>
                            {meta.detail} · Mặc định {rate.defaultMultiplier.toFixed(2)}×
                          </small>
                        </div>
                        <span className="overview-list-value">{rate.multiplier.toFixed(2)}×</span>
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="overview-room-board-head">
                <span>Đội ngũ tài khoản ({employeeList.length} nhân sự)</span>
                <Link to="/admin/employees" className="overview-action-link">
                  Xem tất cả <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>

              {employeeList.length ? (
                <ul className="overview-list-rows">
                  {employeeList.slice(0, 4).map((employee) => (
                    <li key={employee.id} className="overview-list-row">
                      <div className="overview-list-copy">
                        <strong>{employee.fullName}</strong>
                        <small>
                          {employee.role === 'ROLE_ADMIN'
                            ? 'Quản trị viên'
                            : `Lễ tân${employee.deskNumber ? ` · Quầy ${employee.deskNumber}` : ''}`}
                          {employee.employeeCode ? ` · ${employee.employeeCode}` : ''}
                        </small>
                      </div>
                      <span className={`status-badge ${employee.accountStatus === 'ACTIVE' ? 'green' : 'gray'}`}>
                        {employee.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overview-empty">
                  <p>Chưa có tài khoản nhân viên nào.</p>
                </div>
              )}
            </section>
          </div>

          <section className="overview-panel overview-recent-panel" aria-labelledby="admin-recent-bookings-title">
            <div className="overview-panel-head">
              <div>
                <h2 id="admin-recent-bookings-title">Hoạt động đặt phòng gần đây</h2>
                <p className="overview-panel-desc">Theo dõi 5 hồ sơ đặt phòng mới nhất trong toàn khách sạn.</p>
              </div>
              <Link to="/admin/rooms" className="overview-action-link">
                Danh mục phòng <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            {bookings.isPending ? (
              <Loading />
            ) : bookings.isError ? (
              <Failure error={bookings.error} retry={() => void bookings.refetch()} />
            ) : recentBookings.length ? (
              <div className="overview-table-wrap">
                <table className="overview-recent-table">
                  <thead>
                    <tr>
                      <th>MÃ ĐƠN</th>
                      <th>KHÁCH HÀNG</th>
                      <th>PHÒNG</th>
                      <th>LƯU TRÚ</th>
                      <th>TỔNG DỰ KIẾN</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <span className="overview-code">{booking.bookingCode}</span>
                        </td>
                        <td>
                          <strong>{booking.customerName}</strong>
                          <span className="overview-cell-sub">{booking.numberOfNights} đêm lưu trú</span>
                        </td>
                        <td>{booking.roomNumbers?.length ? booking.roomNumbers.join(', ') : 'Chưa gán'}</td>
                        <td>
                          {formatDateShort(booking.checkInDate)} → {formatDateShort(booking.checkOutDate)}
                        </td>
                        <td>
                          <span className="overview-money">{money(booking.estimatedTotal)}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${adminBookingTone(booking.status)}`}>
                            {adminBookingNames[booking.status] || booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overview-empty">
                <p>Chưa có hồ sơ đặt phòng nào trong hệ thống.</p>
              </div>
            )}
          </section>

          <section className="overview-panel" aria-labelledby="admin-shortcuts-title">
            <div className="overview-panel-head">
              <div>
                <h2 id="admin-shortcuts-title">Danh mục quản trị nhanh</h2>
                <p className="overview-panel-desc">Truy cập trực tiếp các phân hệ cấu hình dữ liệu khách sạn.</p>
              </div>
            </div>
            <div className="overview-shortcuts">
              <Link className="overview-shortcut-link" to="/admin/rooms">
                <span>Phòng nghỉ</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="overview-shortcut-link" to="/admin/room-types">
                <span>Hạng phòng</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="overview-shortcut-link" to="/admin/services">
                <span>Dịch vụ khách sạn</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="overview-shortcut-link" to="/admin/pricing">
                <span>Chiến lược giá</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
