import { BedDouble, CircleAlert, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { errorMessage } from '../../lib/api'

export function LoadingSkeleton({
  variant = 'rows',
  count = 3,
}: {
  variant?: 'rows' | 'cards'
  count?: number
}) {
  if (variant === 'cards') {
    return (
      <div className="hg-skeleton-grid" aria-busy="true" aria-label="Đang tải dữ liệu">
        {Array.from({ length: count }, (_, idx) => (
          <div key={idx} className="hg-skeleton-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="hg-skeleton-stack" aria-busy="true" aria-label="Đang tải dữ liệu">
      {Array.from({ length: count }, (_, idx) => (
        <div key={idx} className="hg-skeleton-bar" />
      ))}
    </div>
  )
}

export function ErrorState({
  error,
  title = 'Chưa thể tải dữ liệu',
  retry,
}: {
  error: unknown
  title?: string
  retry?: () => void
}) {
  return (
    <div className="hg-state-notice is-error" role="alert">
      <div className="hg-state-icon" aria-hidden="true">
        <CircleAlert size={22} strokeWidth={1.8} />
      </div>
      <h3>{title}</h3>
      <p>{errorMessage(error, 'Đã xảy ra sự cố kết nối. Vui lòng thử lại sau.')}</p>
      {retry && (
        <button type="button" className="hg-btn hg-btn-outline" onClick={retry}>
          <RefreshCw size={15} aria-hidden="true" /> Thử lại
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  icon,
  action,
}: {
  title: string
  detail: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="hg-state-notice">
      <div className="hg-state-icon" aria-hidden="true">
        {icon ?? <BedDouble size={22} strokeWidth={1.7} />}
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}
