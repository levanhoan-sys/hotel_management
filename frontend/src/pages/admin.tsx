import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BedDouble, DoorOpen, Users, CircleAlert, UserPlus, LockKeyhole, UnlockKeyhole, ArrowRight, TrendingUp } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../lib/api'
import type { ApiResponse, Summary } from '../lib/types'

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
type ChartMode = 'vnd' | 'percent'

const CHART_SERIES_COLORS = ['#31444d', '#456b4d', '#b58a45', '#8f4b3e', '#6d7b8c', '#7a6855']

const blankForm = (): EmployeeForm => ({ username: '', password: '', fullName: '', email: '', phone: '', employeeCode: '', salary: '', hireDate: new Date().toISOString().slice(0, 10), deskNumber: '1' })
const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount)
const compactVnd = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 1 : 2).replace('.', ',')} tr`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(value)
}
const formatSignedPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`

function Loading() { return <div className="table-skeleton"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> }
function Failure({ error, retry }: { error: unknown; retry: () => void }) { return <div className="state-card error-state"><CircleAlert size={22} /><h3>Không thể tải dữ liệu</h3><p>{errorMessage(error)}</p><button className="button button-outline" onClick={retry}>Thử lại</button></div> }

export function AdminHome() {
  const summary = useQuery({ queryKey: ['admin-summary'], queryFn: () => request(api.get<ApiResponse<Summary>>('/reception/summary')) })
  const employees = useQuery({ queryKey: ['admin-employees'], queryFn: () => request(api.get<ApiResponse<Employee[]>>('/admin/employees')) })
  return <div className="ops-page"><div className="ops-title"><div><span className="section-kicker">TRUNG TÂM QUẢN TRỊ</span><h2>Tổng quan hệ thống</h2><p>Theo dõi tình trạng khách sạn và truy cập nhanh các chức năng quản trị.</p></div><span className="live-pill"><i /> Hệ thống đang hoạt động</span></div>
    {summary.isPending || employees.isPending ? <Loading /> : summary.isError ? <Failure error={summary.error} retry={() => void summary.refetch()} /> : employees.isError ? <Failure error={employees.error} retry={() => void employees.refetch()} /> : <>
      <div className="stat-grid"><article className="stat-card"><div className="stat-top"><span>Tổng số phòng</span><span className="stat-icon"><BedDouble /></span></div><b className="stat-value">{summary.data!.totalRooms}</b><small>{summary.data!.availableRooms} phòng sẵn sàng</small></article><article className="stat-card"><div className="stat-top"><span>Đang có khách</span><span className="stat-icon blue"><Users /></span></div><b className="stat-value">{summary.data!.checkedInBookings}</b><small>{summary.data!.occupiedRooms} phòng đang sử dụng</small></article><article className="stat-card"><div className="stat-top"><span>Đặt phòng đã xác nhận</span><span className="stat-icon sage"><DoorOpen /></span></div><b className="stat-value">{summary.data!.confirmedBookings}</b><small>{summary.data!.totalCustomers} khách hàng</small></article><article className="stat-card"><div className="stat-top"><span>Nhân viên</span><span className="stat-icon sand"><Users /></span></div><b className="stat-value">{employees.data!.length}</b><small>{employees.data!.filter(e => e.accountStatus === 'ACTIVE').length} tài khoản đang hoạt động</small></article></div>
      <section className="panel"><div className="panel-heading"><div><span className="section-kicker">DOANH THU ĐÃ THU</span><h3>{money(summary.data!.revenue)}</h3></div><Link to="/admin/rooms" className="subtle-link">Quản lý danh mục <ArrowRight size={14} /></Link></div><p>Tổng doanh thu từ các hóa đơn đã thanh toán.</p></section>
      <section className="panel" style={{ marginTop: 20 }}><div className="panel-heading"><div><span className="section-kicker">QUẢN LÝ</span><h3>Danh mục khách sạn</h3></div></div><div className="actions-inline"><Link className="button button-outline" to="/admin/rooms">Phòng nghỉ</Link><Link className="button button-outline" to="/admin/room-types">Hạng phòng</Link><Link className="button button-outline" to="/admin/services">Dịch vụ</Link><Link className="button button-dark" to="/admin/employees">Tài khoản nhân viên</Link></div></section>
    </>}
  </div>
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
    label: string
    seasonalContext: string
    occupancyRate: number
    rawPrices: Record<string, number>
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
  return (
    <div className="pricing-tooltip">
      <div className="pricing-tooltip-head">
        <strong>{meta.label}</strong>
        <span>{meta.seasonalContext} · Công suất ước tính {meta.occupancyRate}%</span>
      </div>
      <div className="pricing-tooltip-rows">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? '')
          const roomTypeId = key.replace(/^rt_/, '')
          const rt = roomTypes.find((item) => String(item.id) === roomTypeId)
          const rawVnd = meta.rawPrices[roomTypeId] ?? 0
          const deltaPercent = rt && rt.basePrice > 0 ? ((rawVnd - rt.basePrice) / rt.basePrice) * 100 : 0
          return (
            <div key={key} className="pricing-tooltip-row">
              <span className="pricing-tooltip-label">
                <i style={{ background: entry.color || '#31444d' }} />
                {entry.name}
              </span>
              <b className="tabular-nums">
                {mode === 'vnd'
                  ? money(rawVnd)
                  : `${formatSignedPercent(deltaPercent)} (${money(rawVnd)})`}
              </b>
            </div>
          )
        })}
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

  const chartData = useMemo(() => {
    if (!history.data) return []
    return history.data.months.map((m) => {
      const row: Record<string, string | number | Record<string, number>> = {
        month: m.month,
        label: m.label,
        shortLabel: m.shortLabel,
        seasonalContext: m.seasonalContext,
        occupancyRate: m.occupancyRate,
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

  const visibleRoomTypes = useMemo(() => {
    const list = history.data?.roomTypes ?? []
    const visible = list.filter((rt) => !hiddenTypeIds.includes(rt.id))
    return visible.length > 0 ? visible : list
  }, [history.data, hiddenTypeIds])

  const pricingSummary = useMemo(() => {
    if (!history.data || !history.data.months.length) return null
    const { months, roomTypes } = history.data
    const latestMonth = months[months.length - 1]
    const peakMonth = months.reduce((best, curr) =>
      curr.averagePrice > best.averagePrice ? curr : best,
    months[0])
    const spreads = roomTypes.map((rt) =>
      rt.minPrice > 0 ? ((rt.maxPrice - rt.minPrice) / rt.minPrice) * 100 : 0,
    )
    const maxSpread = spreads.length ? Math.max(...spreads) : 0
    return {
      latestAverage: latestMonth.averagePrice,
      latestLabel: latestMonth.label,
      peakLabel: peakMonth.label,
      peakOccupancy: peakMonth.occupancyRate,
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
          <p>Theo dõi biến động giá 6 tháng gần nhất và điều chỉnh hệ số nhân theo nhu cầu lưu trú.</p>
        </div>
      </div>

      <section className="panel pricing-chart-panel">
        <div className="pricing-chart-head">
          <div>
            <span className="section-kicker">BIẾN ĐỘNG GIÁ 6 THÁNG</span>
            <h3>Xu hướng giá phòng theo hạng phòng</h3>
            <p>Giá trung bình mỗi đêm (VND) trong 6 tháng qua, hỗ trợ cân đối hệ số tiêu chuẩn, cuối tuần và ngày lễ.</p>
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
                  <small>Giữa tháng thấp điểm và cao điểm</small>
                </div>
              </div>
            )}

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

            <div className="pricing-chart-box" aria-label="Biểu đồ biến động giá phòng 6 tháng gần nhất">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 14, right: 18, left: 6, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e9e3" />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#5b665d', fontSize: 12 }}
                    axisLine={{ stroke: '#dce0d8' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={72}
                    tickFormatter={(val: number) =>
                      chartMode === 'vnd' ? compactVnd(val) : `${val > 0 ? '+' : ''}${val}%`
                    }
                    tick={{ fill: '#5b665d', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={(props) => (
                      <PricingTooltip
                        active={props.active}
                        payload={props.payload as unknown as readonly TooltipPayloadEntry[] | undefined}
                        mode={chartMode}
                        roomTypes={history.data!.roomTypes}
                      />
                    )}
                  />
                  {visibleRoomTypes.map((rt) => {
                    const colorIdx = history.data!.roomTypes.findIndex((item) => item.id === rt.id)
                    const color = CHART_SERIES_COLORS[(colorIdx >= 0 ? colorIdx : 0) % CHART_SERIES_COLORS.length]
                    return (
                      <Line
                        key={rt.id}
                        type="monotone"
                        dataKey={`rt_${rt.id}`}
                        name={rt.name}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 5.5, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="pricing-insight-foot">
              <TrendingUp size={15} />
              <span>
                Nhấp vào từng hạng phòng để ẩn/hiện đường giá hoặc chuyển sang chế độ <b>Biến động (%)</b> để so sánh biên độ tăng giảm giữa các phân khúc phòng.
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
