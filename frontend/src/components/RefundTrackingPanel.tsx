import { useQuery } from '@tanstack/react-query'
import { Check, Clock, RotateCcw } from 'lucide-react'
import { api, request } from '../lib/api'
import type { ApiResponse } from '../lib/types'
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from './shared'
import { fmtDateTime, money } from '../pages/customer/customer-helpers'

export type RefundRecord = {
  id: number
  code: string
  amount: number
  status: string
  completedAt: string | null
  createdAt?: string | null
  reference?: string | null
}

function refundStatusMeta(status: string): { label: string; tone: 'green' | 'amber' | 'red' | 'gray' } {
  if (status === 'COMPLETED') return { label: 'Đã hoàn tiền', tone: 'green' }
  if (status === 'FAILED' || status === 'REJECTED') return { label: 'Chưa thể hoàn tiền', tone: 'red' }
  if (status === 'PENDING') return { label: 'Đang chờ xử lý', tone: 'amber' }
  return { label: status, tone: 'gray' }
}

export function RefundTrackingPanel({
  bookingId,
  bookingStatus,
  showEmpty = false,
}: {
  bookingId: number
  bookingStatus?: string
  showEmpty?: boolean
}) {
  const refunds = useQuery({
    queryKey: ['booking-refunds', bookingId],
    queryFn: () => request(api.get<ApiResponse<RefundRecord[]>>(`/bookings/${bookingId}/refunds`)),
  })

  const shouldAlwaysRender = showEmpty || bookingStatus === 'CANCELLED'

  if (refunds.isPending) {
    if (!shouldAlwaysRender) return null
    return (
      <article className="hg-panel hg-detail-section-card hg-refund-card" aria-label="Theo dõi hoàn tiền">
        <div className="hg-detail-card-head">
          <div>
            <span className="hg-kicker">HOÀN TIỀN CỌC</span>
            <h2>Theo dõi hoàn tiền</h2>
          </div>
          <RotateCcw size={20} aria-hidden="true" />
        </div>
        <LoadingSkeleton variant="rows" count={2} />
      </article>
    )
  }

  if (refunds.isError) {
    if (!shouldAlwaysRender) return null
    return (
      <article className="hg-panel hg-detail-section-card hg-refund-card" aria-label="Theo dõi hoàn tiền">
        <div className="hg-detail-card-head">
          <div>
            <span className="hg-kicker">HOÀN TIỀN CỌC</span>
            <h2>Theo dõi hoàn tiền</h2>
          </div>
          <RotateCcw size={20} aria-hidden="true" />
        </div>
        <ErrorState error={refunds.error} retry={() => void refunds.refetch()} />
      </article>
    )
  }

  if (!refunds.data?.length) {
    if (!shouldAlwaysRender) return null
    return (
      <article className="hg-panel hg-detail-section-card hg-refund-card" aria-label="Theo dõi hoàn tiền">
        <div className="hg-detail-card-head">
          <div>
            <span className="hg-kicker">HOÀN TIỀN CỌC</span>
            <h2>Theo dõi hoàn tiền</h2>
          </div>
          <RotateCcw size={20} aria-hidden="true" />
        </div>
        <EmptyState
          icon={<RotateCcw size={22} strokeWidth={1.7} />}
          title="Chưa có giao dịch hoàn tiền"
          detail="Đơn đặt phòng này hiện chưa phát sinh khoản hoàn tiền cọc từ hệ thống."
        />
      </article>
    )
  }

  return (
    <article className="hg-panel hg-detail-section-card hg-refund-card" aria-label="Theo dõi hoàn tiền">
      <div className="hg-detail-card-head">
        <div>
          <span className="hg-kicker">HOÀN TIỀN CỌC</span>
          <h2>Theo dõi hoàn tiền</h2>
          <p className="hg-refund-sub">
            Trạng thái và mốc thời gian hiển thị trực tiếp theo dữ liệu ghi nhận từ khách sạn.
          </p>
        </div>
        <RotateCcw size={20} aria-hidden="true" />
      </div>

      <div className="hg-refund-list">
        {refunds.data.map((refund) => {
          const meta = refundStatusMeta(refund.status)
          const completed = refund.status === 'COMPLETED'
          const failed = refund.status === 'FAILED' || refund.status === 'REJECTED'

          const steps = [
            {
              num: '01',
              title: 'Ghi nhận yêu cầu hoàn cọc',
              detail: refund.createdAt ? fmtDateTime(refund.createdAt) : 'Đã ghi nhận trên hệ thống',
              state: 'done' as const,
            },
            {
              num: '02',
              title: 'Lễ tân đối chiếu & xử lý',
              detail: completed
                ? 'Đã xác nhận xử lý hoàn tiền'
                : failed
                  ? 'Cần liên hệ lễ tân để kiểm tra lại'
                  : 'Đang chờ bộ phận lễ tân xử lý',
              state: completed ? ('done' as const) : ('active' as const),
            },
            {
              num: '03',
              title: 'Hoàn tất chuyển hoàn',
              detail: completed
                ? refund.completedAt
                  ? fmtDateTime(refund.completedAt)
                  : 'Đã hoàn tất (hệ thống chưa cung cấp mốc giờ)'
                : refund.completedAt
                  ? fmtDateTime(refund.completedAt)
                  : 'Chưa có thời gian hoàn tất từ hệ thống',
              state: completed ? ('done' as const) : ('upcoming' as const),
            },
          ]

          return (
            <section className="hg-refund-item" key={refund.id} aria-label={`Khoản hoàn tiền ${refund.code}`}>
              <div className="hg-refund-item-head">
                <div>
                  <span className="hg-kicker">MÃ HOÀN TIỀN</span>
                  <strong className="hg-mono hg-refund-code">{refund.code}</strong>
                </div>
                <div className="hg-refund-head-right">
                  <strong className="hg-refund-amount">{money(refund.amount)}</strong>
                  <StatusBadge tone={meta.tone} label={meta.label} />
                </div>
              </div>

              <ol className="hg-refund-timeline" aria-label={`Tiến trình hoàn tiền ${refund.code}`}>
                {steps.map((step) => (
                  <li key={step.num} className={`is-${step.state}`}>
                    <div className="hg-timeline-marker" aria-hidden="true">
                      {step.state === 'done' ? <Check size={14} /> : step.state === 'active' ? <Clock size={14} /> : step.num}
                    </div>
                    <div>
                      <b>{step.title}</b>
                      <small>{step.detail}</small>
                    </div>
                  </li>
                ))}
              </ol>

              <dl className="hg-refund-meta">
                <div>
                  <dt>Số tiền hoàn</dt>
                  <dd className="hg-refund-meta-strong">{money(refund.amount)}</dd>
                </div>
                <div>
                  <dt>Mã tham chiếu</dt>
                  <dd className={refund.reference ? 'hg-mono' : ''}>
                    {refund.reference || 'Chưa cập nhật'}
                  </dd>
                </div>
                <div>
                  <dt>Thời gian hoàn tất</dt>
                  <dd>{refund.completedAt ? fmtDateTime(refund.completedAt) : 'Chưa cập nhật'}</dd>
                </div>
              </dl>
            </section>
          )
        })}
      </div>
    </article>
  )
}
