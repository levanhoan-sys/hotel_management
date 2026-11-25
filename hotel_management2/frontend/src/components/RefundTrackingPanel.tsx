import { useQuery } from '@tanstack/react-query'
import { api, request } from '../lib/api'
import type { ApiResponse } from '../lib/types'

type Refund = { id: number; code: string; amount: number; status: string; completedAt: string | null }
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export function RefundTrackingPanel({ bookingId }: { bookingId: number }) {
  const refunds = useQuery({ queryKey: ['booking-refunds', bookingId], queryFn: () => request(api.get<ApiResponse<Refund[]>>(`/bookings/${bookingId}/refunds`)) })
  if (refunds.isPending || refunds.isError || !refunds.data?.length) return null
  return <article className="booking-detail-card"><span className="section-kicker">HOÀN TIỀN CỌC</span><h2>Theo dõi hoàn tiền</h2>{refunds.data.map(refund => <div className="invoice-total-row" key={refund.id}><span>{refund.code} · {refund.status === 'COMPLETED' ? 'Đã hoàn' : 'Đang chờ xử lý'}</span><b>{money(refund.amount)}</b></div>)}</article>
}
