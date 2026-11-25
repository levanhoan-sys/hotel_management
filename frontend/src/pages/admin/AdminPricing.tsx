import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
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
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse } from '../../lib/types'
import {
  CHART_SERIES_COLORS,
  type ChartMode,
  Failure,
  Loading,
  type PricingHistoryResponse,
  type PricingHistoryRoomType,
  type PricingRate,
  compactVnd,
  formatSignedPercent,
  money,
} from './admin-helpers'

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
    onError: (e) => toast.error(errorMessage(e)),
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
