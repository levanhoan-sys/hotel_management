import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CircleAlert,
  DoorOpen,
  LockKeyhole,
  SlidersHorizontal,
  TrendingUp,
  UnlockKeyhole,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../lib/api'
import type { ApiResponse, Booking, BookingStatus, Room, RoomStatus, Summary } from '../lib/types'
import './reception-overview.css'

type Employee = { id: number; username: string; fullName: string; email: string; phone: string | null; employeeCode: string; salary: number | null; hireDate: string; deskNumber: number | null; role: 'ROLE_ADMIN' | 'ROLE_RECEPTIONIST'; accountStatus: 'ACTIVE' | 'LOCKED' }
type EmployeeForm = { username: string; password: string; fullName: string; email: string; phone: string; employeeCode: string; salary: string; hireDate: string; deskNumber: string }
type PricingRate = { strategy: 'STANDARD' | 'WEEKEND' | 'HOLIDAY'; multiplier: number; defaultMultiplier: number }
type PricingHistoryMonth = {
  month: string
  label: string
  shortLabel: string
  seasonalContext: string
  occupancyRate: number
  averagePrice: number
  prices: Record<string, number>
}
type PricingHistoryRoomType = {
  id: number
  name: string
  basePrice: number
  currentPrice: number
  minPrice: number
  maxPrice: number
  changePercent: number
}
type PricingHistoryResponse = {
  months: PricingHistoryMonth[]
  roomTypes: PricingHistoryRoomType[]
  blendedMultiplier: number
}
type ChartMode = 'vnd' | 'percent' | 'strategy'
type AdminRoomTone = 'ALL' | 'ready' | 'occupied' | 'cleaning' | 'maintenance'

const CHART_SERIES_COLORS = ['#173d2b', '#3b6e52', '#b58a45', '#2e5372', '#8f4b3e', '#7a6855']

const blankForm = (): EmployeeForm => ({ username: '', password: '', fullName: '', email: '', phone: '', employeeCode: '', salary: '', hireDate: new Date().toISOString().slice(0, 10), deskNumber: '1' })
const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00Z`),
  )
const compactVnd = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 1 : 2).replace('.', ',')} tr`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(value)
}
const formatSignedPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`

const adminBookingNames: Record<BookingStatus, string> = {
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

function adminBookingTone(status: BookingStatus) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'green'
  if (status === 'CHECKED_IN') return 'blue'
  if (status === 'PENDING' || status === 'PENDING_DEPOSIT' || status === 'PENDING_VERIFICATION') return 'amber'
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED' || status === 'NO_SHOW') return 'red'
  return 'gray'
}

function adminRoomTone(status: RoomStatus): Exclude<AdminRoomTone, 'ALL'> {
  if (status === 'OCCUPIED') return 'occupied'
  if (status === 'CLEANING') return 'cleaning'
  if (status === 'MAINTENANCE') return 'maintenance'
  return 'ready'
}

const adminRoomNames: Record<RoomStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  BOOKED: 'Đã đặt',
  OCCUPIED: 'Đang có khách',
  CLEANING: 'Đang dọn',
  MAINTENANCE: 'Bảo trì',
}

const pricingTitleMap: Record<PricingRate['strategy'], { title: string; detail: string }> = {
  STANDARD: { title: 'Giá tiêu chuẩn', detail: 'Ngày thường trong tuần' },
  WEEKEND: { title: 'Giá cuối tuần', detail: 'Thứ Sáu đến Chủ Nhật' },
  HOLIDAY: { title: 'Giá ngày lễ', detail: 'Kỳ nghỉ lễ & cao điểm' },
}

function Loading() { return <div className="table-skeleton"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> }
function Failure({ error, retry }: { error: unknown; retry: () => void }) { return <div className="state-card error-state"><CircleAlert size={22} /><h3>Không thể tải dữ liệu</h3><p>{errorMessage(error)}</p><button className="button button-outline" onClick={retry}>Thử lại</button></div> }

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


export function AdminEmployees() {
  const qc = useQueryClient()
  const [form, setForm] = useState<EmployeeForm>(blankForm)
  const [showForm, setShowForm] = useState(false)
  const employees = useQuery({ queryKey: ['admin-employees'], queryFn: () => request(api.get<ApiResponse<Employee[]>>('/admin/employees')) })
  const create = useMutation({ mutationFn: () => request(api.post<ApiResponse<Employee>>('/admin/employees/receptionists', { ...form, salary: form.salary ? Number(form.salary.replaceAll('.', '')) : null, deskNumber: form.deskNumber ? Number(form.deskNumber) : null })), onSuccess: async () => { toast.success('Đã tạo tài khoản lễ tân.'); setForm(blankForm()); setShowForm(false); await qc.invalidateQueries({ queryKey: ['admin-employees'] }) }, onError: e => toast.error(errorMessage(e)) })
  const toggle = useMutation({ mutationFn: ({ employee, active }: { employee: Employee; active: boolean }) => request(api.patch<ApiResponse<Employee>>(`/admin/employees/${employee.id}/active`, undefined, { params: { active } })), onSuccess: async () => { toast.success('Đã cập nhật trạng thái tài khoản.'); await qc.invalidateQueries({ queryKey: ['admin-employees'] }) }, onError: e => toast.error(errorMessage(e)) })
  return <div className="ops-page"><div className="ops-title"><div><span className="section-kicker">NHÂN SỰ</span><h2>Tài khoản nhân viên</h2><p>Tạo tài khoản lễ tân và quản lý trạng thái truy cập hệ thống.</p></div><button className="button button-dark" onClick={() => setShowForm(v => !v)}><UserPlus size={16} /> {showForm ? 'Đóng biểu mẫu' : 'Thêm lễ tân'}</button></div>
    {showForm && <section className="panel" style={{ marginBottom: 20 }}><div className="panel-heading"><div><span className="section-kicker">TẠO TÀI KHOẢN</span><h3>Thông tin lễ tân</h3></div></div><form className="modal-form" onSubmit={e => { e.preventDefault(); create.mutate() }}><div className="form-grid"><label className="form-field"><span>Tên đăng nhập</span><input required maxLength={50} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></label><label className="form-field"><span>Mật khẩu (tối thiểu 8 ký tự)</span><input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label><label className="form-field"><span>Họ và tên</span><input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label><label className="form-field"><span>Email</span><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label className="form-field"><span>Số điện thoại</span><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label className="form-field"><span>Mã nhân viên</span><input required value={form.employeeCode} onChange={e => setForm({ ...form, employeeCode: e.target.value })} /></label><label className="form-field"><span>Lương (VND)</span><input inputMode="numeric" value={form.salary.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} onChange={e => setForm({ ...form, salary: e.target.value.replace(/\D/g, '') })} /></label><label className="form-field"><span>Ngày vào làm</span><input type="date" required value={form.hireDate} onChange={e => setForm({ ...form, hireDate: e.target.value })} /></label><label className="form-field"><span>Số quầy</span><input type="number" min="0" value={form.deskNumber} onChange={e => setForm({ ...form, deskNumber: e.target.value })} /></label></div><button className="button button-dark" disabled={create.isPending}>{create.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}</button></form></section>}
    {employees.isPending ? <Loading /> : employees.isError ? <Failure error={employees.error} retry={() => void employees.refetch()} /> : <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>NHÂN VIÊN</th><th>MÃ NHÂN VIÊN</th><th>VAI TRÒ</th><th>NGÀY VÀO LÀM</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{employees.data!.map(employee => <tr key={employee.id}><td><b>{employee.fullName}</b><small className="cell-sub">{employee.username} · {employee.email}</small></td><td>{employee.employeeCode || '—'}</td><td>{employee.role === 'ROLE_ADMIN' ? 'Quản trị viên' : `Lễ tân${employee.deskNumber ? ` · Quầy ${employee.deskNumber}` : ''}`}</td><td>{employee.hireDate || '—'}</td><td><span className={`status-badge ${employee.accountStatus === 'ACTIVE' ? 'green' : 'gray'}`}><i />{employee.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td>{employee.role === 'ROLE_ADMIN' ? <span>—</span> : <button className="table-action" disabled={toggle.isPending} onClick={() => toggle.mutate({ employee, active: employee.accountStatus !== 'ACTIVE' })}>{employee.accountStatus === 'ACTIVE' ? <><LockKeyhole size={14} /> Khóa tài khoản</> : <><UnlockKeyhole size={14} /> Mở khóa</>}</button>}</td></tr>)}</tbody></table>{!employees.data!.length && <div className="empty-table">Chưa có tài khoản nhân viên.</div>}</div></section>}
  </div>
}

type TooltipPayloadEntry = {
  dataKey?: string | number
  name?: string
  color?: string
  value?: number
  payload?: {
    label?: string
    seasonalContext?: string
    occupancyRate?: number
    averagePrice?: number
    rawPrices?: Record<string, number>
    roomTypeName?: string
    basePrice?: number
    standardRate?: number
    weekendRate?: number
    holidayRate?: number
  }
}

function PricingTooltip({
  active,
  payload,
  mode,
  roomTypes,
}: {
  active?: boolean
  payload?: readonly TooltipPayloadEntry[]
  mode: ChartMode
  roomTypes: PricingHistoryRoomType[]
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null
  const meta = payload[0].payload

  if (mode === 'strategy') {
    const basePrice = meta.basePrice ?? 0
    return (
      <div className="pricing-tooltip">
        <div className="pricing-tooltip-head">
          <strong>{meta.roomTypeName}</strong>
          <span>Giá niêm yết gốc: {money(basePrice)}/đêm</span>
        </div>
        <div className="pricing-tooltip-rows">
          {payload.map((entry) => {
            const val = Number(entry.value ?? 0)
            const deltaPct = basePrice > 0 ? ((val - basePrice) / basePrice) * 100 : 0
            return (
              <div key={String(entry.dataKey)} className="pricing-tooltip-row">
                <span className="pricing-tooltip-label">
                  <i style={{ background: entry.color || '#173d2b' }} />
                  {entry.name}
                </span>
                <b className="tabular-nums">
                  {money(val)} ({formatSignedPercent(deltaPct)})
                </b>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="pricing-tooltip">
      <div className="pricing-tooltip-head">
        <strong>{meta.label}</strong>
        <span>
          {meta.seasonalContext} · Công suất ước tính {meta.occupancyRate}%
        </span>
      </div>
      <div className="pricing-tooltip-rows">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? '')
          if (key === 'occupancyRate') {
            return (
              <div key={key} className="pricing-tooltip-row">
                <span className="pricing-tooltip-label">
                  <i style={{ background: entry.color || '#d7cbb4' }} />
                  Công suất phòng
                </span>
                <b className="tabular-nums">{entry.value ?? 0}%</b>
              </div>
            )
          }
          const roomTypeId = key.replace(/^rt_/, '')
          const rt = roomTypes.find((item) => String(item.id) === roomTypeId)
          const rawVnd = meta.rawPrices?.[roomTypeId] ?? 0
          const deltaPercent = rt && rt.basePrice > 0 ? ((rawVnd - rt.basePrice) / rt.basePrice) * 100 : 0
          return (
            <div key={key} className="pricing-tooltip-row">
              <span className="pricing-tooltip-label">
                <i style={{ background: entry.color || '#173d2b' }} />
                {entry.name}
              </span>
              <b className="tabular-nums">
                {mode === 'vnd'
                  ? `${money(rawVnd)} (${formatSignedPercent(deltaPercent)})`
                  : `${formatSignedPercent(deltaPercent)} · ${money(rawVnd)}`}
              </b>
            </div>
          )
        })}
        {typeof meta.averagePrice === 'number' && (
          <div className="pricing-tooltip-row pricing-tooltip-summary">
            <span className="pricing-tooltip-label">Bình quân toàn khách sạn</span>
            <b className="tabular-nums">{money(meta.averagePrice)}</b>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminPricing() {
  const qc = useQueryClient()
  const rates = useQuery({ queryKey: ['admin-pricing'], queryFn: () => request(api.get<ApiResponse<PricingRate[]>>('/admin/pricing')) })
  const history = useQuery({ queryKey: ['admin-pricing-history'], queryFn: () => request(api.get<ApiResponse<PricingHistoryResponse>>('/admin/pricing/history')) })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [chartMode, setChartMode] = useState<ChartMode>('vnd')
  const [hiddenTypeIds, setHiddenTypeIds] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: ({ strategy, multiplier }: { strategy: string; multiplier: number }) =>
      request(api.put<ApiResponse<PricingRate>>(`/admin/pricing/${strategy}`, { multiplier })),
    onSuccess: async () => {
      toast.success('Đã lưu hệ số giá.')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['admin-pricing'] }),
        qc.invalidateQueries({ queryKey: ['admin-pricing-history'] }),
      ])
    },
    onError: e => toast.error(errorMessage(e)),
  })

  const labels: Record<PricingRate['strategy'], { title: string; detail: string }> = {
    STANDARD: { title: 'Giá tiêu chuẩn', detail: 'Áp dụng cho đặt phòng thông thường.' },
    WEEKEND: { title: 'Giá cuối tuần', detail: 'Hệ số giá dùng cho chiến lược cuối tuần.' },
    HOLIDAY: { title: 'Giá ngày lễ', detail: 'Hệ số giá dùng cho chiến lược ngày lễ.' },
  }

  const effectiveMultipliers = useMemo(() => {
    const map: Record<PricingRate['strategy'], number> = {
      STANDARD: 1,
      WEEKEND: 1.2,
      HOLIDAY: 1.5,
    }
    for (const rate of rates.data ?? []) {
      const draftRaw = drafts[rate.strategy]
      const parsed = draftRaw !== undefined ? Number(draftRaw) : NaN
      map[rate.strategy] =
        Number.isFinite(parsed) && parsed >= 0.1 && parsed <= 10 ? parsed : rate.multiplier
    }
    return map
  }, [rates.data, drafts])

  const chartData = useMemo(() => {
    if (!history.data) return []
    return history.data.months.map((m) => {
      const row: Record<string, string | number | Record<string, number>> = {
        month: m.month,
        label: m.label,
        shortLabel: m.shortLabel,
        seasonalContext: m.seasonalContext,
        occupancyRate: m.occupancyRate,
        averagePrice: m.averagePrice,
        rawPrices: m.prices,
      }
      for (const rt of history.data.roomTypes) {
        const price = m.prices[String(rt.id)] ?? rt.basePrice
        row[`rt_${rt.id}`] =
          chartMode === 'vnd'
            ? price
            : rt.basePrice > 0
              ? Math.round(((price - rt.basePrice) / rt.basePrice) * 1000) / 10
              : 0
      }
      return row
    })
  }, [history.data, chartMode])

  const strategyChartData = useMemo(() => {
    if (!history.data) return []
    return history.data.roomTypes.map((rt) => ({
      id: rt.id,
      roomTypeName: rt.name,
      shortName: rt.name.length > 16 ? `${rt.name.slice(0, 15)}…` : rt.name,
      basePrice: rt.basePrice,
      standardPrice: Math.round((rt.basePrice * effectiveMultipliers.STANDARD) / 1000) * 1000,
      weekendPrice: Math.round((rt.basePrice * effectiveMultipliers.WEEKEND) / 1000) * 1000,
      holidayPrice: Math.round((rt.basePrice * effectiveMultipliers.HOLIDAY) / 1000) * 1000,
      standardRate: effectiveMultipliers.STANDARD,
      weekendRate: effectiveMultipliers.WEEKEND,
      holidayRate: effectiveMultipliers.HOLIDAY,
    }))
  }, [history.data, effectiveMultipliers])

  const visibleRoomTypes = useMemo(() => {
    const list = history.data?.roomTypes ?? []
    const visible = list.filter((rt) => !hiddenTypeIds.includes(rt.id))
    return visible.length > 0 ? visible : list
  }, [history.data, hiddenTypeIds])

  const activeMonth = useMemo(() => {
    const months = history.data?.months ?? []
    if (!months.length) return null
    return months.find((m) => m.month === selectedMonth) ?? months[months.length - 1]
  }, [history.data, selectedMonth])

  const pricingSummary = useMemo(() => {
    if (!history.data || !history.data.months.length) return null
    const { months, roomTypes } = history.data
    const latestMonth = months[months.length - 1]
    const peakMonth = months.reduce((best, curr) =>
      curr.averagePrice > best.averagePrice ? curr : best,
    months[0])
    const overallAverage = Math.round(
      months.reduce((sum, m) => sum + m.averagePrice, 0) / months.length,
    )
    const spreads = roomTypes.map((rt) =>
      rt.minPrice > 0 ? ((rt.maxPrice - rt.minPrice) / rt.minPrice) * 100 : 0,
    )
    const maxSpread = spreads.length ? Math.max(...spreads) : 0
    return {
      latestAverage: latestMonth.averagePrice,
      latestLabel: latestMonth.label,
      peakLabel: peakMonth.label,
      peakOccupancy: peakMonth.occupancyRate,
      overallAverage,
      maxSpread,
    }
  }, [history.data])

  const toggleRoomType = (id: number) => {
    const total = history.data?.roomTypes.length ?? 0
    setHiddenTypeIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id)
      if (prev.length >= total - 1) return prev
      return [...prev, id]
    })
  }

  return (
    <div className="ops-page">
      <div className="ops-title">
        <div>
          <span className="section-kicker">CẤU HÌNH GIÁ</span>
          <h2>Chiến lược giá</h2>
          <p>Phân tích biểu đồ cột chi tiết theo hạng phòng, công suất theo mùa và mô phỏng trực tiếp 3 mức giá chiến lược.</p>
        </div>
      </div>

      <section className="panel pricing-chart-panel">
        <div className="pricing-chart-head">
          <div>
            <span className="section-kicker">PHÂN TÍCH GIÁ CHI TIẾT</span>
            <h3>Xu hướng giá phòng theo hạng phòng</h3>
            <p>So sánh mức giá thực tế, biên độ biến động kèm công suất phòng 6 tháng và tác động của 3 hệ số chiến lược.</p>
          </div>
          <div className="pricing-mode-switch" role="group" aria-label="Chế độ hiển thị biểu đồ">
            <button
              type="button"
              className={chartMode === 'vnd' ? 'active' : ''}
              aria-pressed={chartMode === 'vnd'}
              onClick={() => setChartMode('vnd')}
            >
              Giá thực tế (VND)
            </button>
            <button
              type="button"
              className={chartMode === 'percent' ? 'active' : ''}
              aria-pressed={chartMode === 'percent'}
              onClick={() => setChartMode('percent')}
            >
              Biến động (%)
            </button>
            <button
              type="button"
              className={chartMode === 'strategy' ? 'active' : ''}
              aria-pressed={chartMode === 'strategy'}
              onClick={() => setChartMode('strategy')}
            >
              So sánh 3 chiến lược
            </button>
          </div>
        </div>

        {history.isPending ? (
          <Loading />
        ) : history.isError ? (
          <Failure error={history.error} retry={() => void history.refetch()} />
        ) : !history.data?.months.length || !history.data?.roomTypes.length ? (
          <div className="empty-table">Chưa có dữ liệu giá phòng trong 6 tháng gần nhất.</div>
        ) : (
          <>
            {pricingSummary && (
              <div className="pricing-summary-strip">
                <div>
                  <span>Giá bình quân hiện tại ({pricingSummary.latestLabel})</span>
                  <strong className="tabular-nums">{money(pricingSummary.latestAverage)}</strong>
                  <small>Hệ số tổng hợp {history.data.blendedMultiplier.toFixed(2)}×</small>
                </div>
                <div>
                  <span>Tháng cao điểm 6 tháng</span>
                  <strong className="tabular-nums">{pricingSummary.peakLabel}</strong>
                  <small>Công suất ước tính {pricingSummary.peakOccupancy}%</small>
                </div>
                <div>
                  <span>Biên độ dao động lớn nhất</span>
                  <strong className="tabular-nums">{pricingSummary.maxSpread.toFixed(1).replace('.', ',')}%</strong>
                  <small>TB 6 tháng: {money(pricingSummary.overallAverage)}</small>
                </div>
              </div>
            )}

            {chartMode !== 'strategy' ? (
              <>
                <div className="pricing-months-strip" role="group" aria-label="Chọn tháng xem chi tiết">
                  {history.data.months.map((m) => {
                    const isSelected = activeMonth?.month === m.month
                    return (
                      <button
                        key={m.month}
                        type="button"
                        aria-pressed={isSelected}
                        className={`pricing-month-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedMonth(m.month)}
                      >
                        <strong>{m.label}</strong>
                        <span className="tabular-nums">{compactVnd(m.averagePrice)}</span>
                        <small className="tabular-nums">{m.occupancyRate}% công suất</small>
                      </button>
                    )
                  })}
                </div>

                <div className="pricing-series-toggles" role="group" aria-label="Lọc hạng phòng trên biểu đồ">
                  {history.data.roomTypes.map((rt, idx) => {
                    const color = CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length]
                    const isVisible = !hiddenTypeIds.includes(rt.id)
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        className={`pricing-series-btn ${isVisible ? 'active' : ''}`}
                        aria-pressed={isVisible}
                        onClick={() => toggleRoomType(rt.id)}
                      >
                        <i style={{ background: isVisible ? color : '#c6cac3' }} />
                        <span>{rt.name}</span>
                        <small className="tabular-nums">{money(rt.currentPrice)}</small>
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="pricing-strategy-legend" aria-label="Chú giải 3 mức giá chiến lược">
                <span>
                  <i style={{ background: '#2e5372' }} />
                  Giá tiêu chuẩn ({effectiveMultipliers.STANDARD.toFixed(2)}×)
                </span>
                <span>
                  <i style={{ background: '#3b6e52' }} />
                  Giá cuối tuần ({effectiveMultipliers.WEEKEND.toFixed(2)}×)
                </span>
                <span>
                  <i style={{ background: '#b58a45' }} />
                  Giá ngày lễ ({effectiveMultipliers.HOLIDAY.toFixed(2)}×)
                </span>
              </div>
            )}

            <div className="pricing-chart-box" aria-label="Biểu đồ biến động giá phòng 6 tháng gần nhất">
              <ResponsiveContainer width="100%" height={340}>
                {chartMode === 'strategy' ? (
                  <BarChart data={strategyChartData} margin={{ top: 14, right: 18, left: 6, bottom: 8 }} barCategoryGap="22%" barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e9e3" />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fill: '#39433c', fontSize: 13 }}
                      axisLine={{ stroke: '#dce0d8' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={74}
                      tickFormatter={(val: number) => compactVnd(val)}
                      tick={{ fill: '#525c55', fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(23, 61, 43, 0.05)' }}
                      content={(props) => (
                        <PricingTooltip
                          active={props.active}
                          payload={props.payload as unknown as readonly TooltipPayloadEntry[] | undefined}
                          mode={chartMode}
                          roomTypes={history.data!.roomTypes}
                        />
                      )}
                    />
                    <Bar dataKey="standardPrice" name="Giá tiêu chuẩn" fill="#2e5372" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                    <Bar dataKey="weekendPrice" name="Giá cuối tuần" fill="#3b6e52" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                    <Bar dataKey="holidayPrice" name="Giá ngày lễ" fill="#b58a45" radius={[5, 5, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 16, right: 18, left: 6, bottom: 4 }} barCategoryGap="18%" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e9e3" />
                    <XAxis
                      dataKey="shortLabel"
                      tick={{ fill: '#39433c', fontSize: 13 }}
                      axisLine={{ stroke: '#dce0d8' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={74}
                      tickFormatter={(val: number) =>
                        chartMode === 'vnd' ? compactVnd(val) : `${val > 0 ? '+' : ''}${val}%`
                      }
                      tick={{ fill: '#525c55', fontSize: 13 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(23, 61, 43, 0.05)' }}
                      content={(props) => (
                        <PricingTooltip
                          active={props.active}
                          payload={props.payload as unknown as readonly TooltipPayloadEntry[] | undefined}
                          mode={chartMode}
                          roomTypes={history.data!.roomTypes}
                        />
                      )}
                    />
                    {chartMode === 'vnd' && pricingSummary && (
                      <ReferenceLine
                        y={pricingSummary.overallAverage}
                        stroke="#b58a45"
                        strokeDasharray="4 4"
                      />
                    )}
                    {chartMode === 'percent' && (
                      <>
                        <ReferenceLine y={0} stroke="#b8c0b6" />
                        <Bar
                          dataKey="occupancyRate"
                          name="Công suất ước tính (%)"
                          fill="#d7cbb4"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={20}
                          isAnimationActive={false}
                        />
                      </>
                    )}
                    {visibleRoomTypes.map((rt) => {
                      const colorIdx = history.data!.roomTypes.findIndex((item) => item.id === rt.id)
                      const color = CHART_SERIES_COLORS[(colorIdx >= 0 ? colorIdx : 0) % CHART_SERIES_COLORS.length]
                      return (
                        <Bar
                          key={rt.id}
                          dataKey={`rt_${rt.id}`}
                          name={rt.name}
                          fill={color}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={24}
                          isAnimationActive={false}
                        />
                      )
                    })}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            {activeMonth && (
              <div className="pricing-detail-section">
                <div className="pricing-detail-head">
                  <div>
                    <strong>Chi tiết theo hạng phòng — {activeMonth.label}</strong>
                    <span>
                      {activeMonth.seasonalContext} · Công suất ước tính {activeMonth.occupancyRate}%
                    </span>
                  </div>
                  <span className="pricing-detail-avg tabular-nums">
                    Bình quân tháng: {money(activeMonth.averagePrice)}
                  </span>
                </div>

                <div className="pricing-detail-table-wrap">
                  <table className="pricing-detail-table">
                    <thead>
                      <tr>
                        <th>HẠNG PHÒNG</th>
                        <th>GIÁ NIÊM YẾT</th>
                        <th>GIÁ {activeMonth.shortLabel.toUpperCase()}</th>
                        <th>BIÊN ĐỘ 6 THÁNG</th>
                        <th>TIÊU CHUẨN</th>
                        <th>CUỐI TUẦN</th>
                        <th>NGÀY LỄ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.roomTypes.map((rt, idx) => {
                        const color = CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length]
                        const monthPrice = activeMonth.prices[String(rt.id)] ?? rt.basePrice
                        const deltaPct = rt.basePrice > 0 ? ((monthPrice - rt.basePrice) / rt.basePrice) * 100 : 0
                        const span = Math.max(1, rt.maxPrice - rt.minPrice)
                        const posPct = Math.min(100, Math.max(0, Math.round(((monthPrice - rt.minPrice) / span) * 100)))
                        const stdPrice = Math.round((rt.basePrice * effectiveMultipliers.STANDARD) / 1000) * 1000
                        const wkndPrice = Math.round((rt.basePrice * effectiveMultipliers.WEEKEND) / 1000) * 1000
                        const holPrice = Math.round((rt.basePrice * effectiveMultipliers.HOLIDAY) / 1000) * 1000
                        return (
                          <tr key={rt.id} className={hiddenTypeIds.includes(rt.id) ? 'is-dimmed' : ''}>
                            <td>
                              <div className="pricing-room-cell">
                                <i style={{ background: color }} />
                                <b>{rt.name}</b>
                              </div>
                            </td>
                            <td className="tabular-nums">{money(rt.basePrice)}</td>
                            <td className="tabular-nums">
                              <strong>{money(monthPrice)}</strong>
                              <small className={`pricing-delta ${deltaPct >= 0 ? 'is-up' : 'is-down'}`}>
                                {formatSignedPercent(deltaPct)}
                              </small>
                            </td>
                            <td>
                              <div className="pricing-range-cell tabular-nums">
                                <div className="pricing-range-labels">
                                  <span>{compactVnd(rt.minPrice)}</span>
                                  <span>{compactVnd(rt.maxPrice)}</span>
                                </div>
                                <div className="pricing-range-track" aria-hidden="true">
                                  <span style={{ width: `${posPct}%`, background: color }} />
                                </div>
                              </div>
                            </td>
                            <td className="tabular-nums">{money(stdPrice)}</td>
                            <td className="tabular-nums">{money(wkndPrice)}</td>
                            <td className="tabular-nums">{money(holPrice)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pricing-insight-foot">
              <TrendingUp size={16} />
              <span>
                Chọn từng tháng hoặc chuyển giữa 3 chế độ <b>Giá thực tế (VND)</b>, <b>Biến động (%)</b> (kèm cột công suất) và <b>So sánh 3 chiến lược</b>; khi chỉnh hệ số bên dưới, bảng và biểu đồ chiến lược cập nhật xem trước ngay.
              </span>
            </div>
          </>
        )}
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <p>Giá của booking đã tạo được giữ nguyên. Hệ số mới chỉ áp dụng cho booking được tính giá sau khi lưu cấu hình.</p>
        {rates.isPending ? (
          <Loading />
        ) : rates.isError ? (
          <Failure error={rates.error} retry={() => void rates.refetch()} />
        ) : (
          <div className="admin-pricing-list">
            {rates.data!.map((rate) => {
              const value = drafts[rate.strategy] ?? String(rate.multiplier)
              return (
                <form
                  className="admin-pricing-row"
                  key={rate.strategy}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const multiplier = Number(value)
                    if (!Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 10) {
                      return toast.error('Hệ số giá phải từ 0,10 đến 10,00.')
                    }
                    save.mutate({ strategy: rate.strategy, multiplier })
                  }}
                >
                  <div>
                    <b>{labels[rate.strategy].title}</b>
                    <small>{labels[rate.strategy].detail}</small>
                    <small className="tabular-nums">
                      Hệ số hiện tại: {rate.multiplier.toFixed(2)}× · Mặc định: {rate.defaultMultiplier.toFixed(2)}×
                    </small>
                  </div>
                  <label className="form-field">
                    <span>Hệ số giá (0,10–10,00)</span>
                    <input
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.01"
                      required
                      value={value}
                      onChange={(e) => setDrafts({ ...drafts, [rate.strategy]: e.target.value })}
                    />
                  </label>
                  <button className="button button-dark" disabled={save.isPending}>
                    Lưu
                  </button>
                </form>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
