export type StatusTone = 'green' | 'amber' | 'blue' | 'red' | 'gray'

const STATUS_MAP: Record<string, { label: string; tone: StatusTone }> = {
  // Booking statuses
  PENDING_DEPOSIT: { label: 'Chờ đặt cọc', tone: 'amber' },
  PENDING_VERIFICATION: { label: 'Chờ xác minh cọc', tone: 'amber' },
  PENDING: { label: 'Chờ xác nhận', tone: 'amber' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'green' },
  CHECKED_IN: { label: 'Đang lưu trú', tone: 'blue' },
  COMPLETED: { label: 'Đã trả phòng', tone: 'gray' },
  CHECKED_OUT: { label: 'Đã trả phòng', tone: 'gray' },
  CANCELLED: { label: 'Đã hủy', tone: 'gray' },
  REJECTED: { label: 'Từ chối', tone: 'red' },
  EXPIRED: { label: 'Hết hạn', tone: 'gray' },
  NO_SHOW: { label: 'Không đến', tone: 'gray' },

  // Room statuses
  AVAILABLE: { label: 'Sẵn sàng', tone: 'green' },
  BOOKED: { label: 'Đã đặt', tone: 'green' },
  OCCUPIED: { label: 'Đang có khách', tone: 'blue' },
  CLEANING: { label: 'Đang dọn', tone: 'amber' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'red' },

  // Account & service statuses
  ACTIVE: { label: 'Đang hoạt động', tone: 'green' },
  LOCKED: { label: 'Đã khóa', tone: 'gray' },
  APPROVED: { label: 'Đã duyệt', tone: 'green' },
  DRAFT: { label: 'Bản nháp', tone: 'gray' },
  ISSUED: { label: 'Đã phát hành', tone: 'amber' },
  PAID: { label: 'Đã thanh toán', tone: 'green' },
}

export function getStatusMeta(status: string): { label: string; tone: StatusTone } {
  return STATUS_MAP[status] ?? { label: status, tone: 'gray' }
}

export function StatusBadge({
  status,
  label,
  tone,
  showDot = true,
  className = '',
}: {
  status?: string
  label?: string
  tone?: StatusTone
  showDot?: boolean
  className?: string
}) {
  const resolved = status ? getStatusMeta(status) : { label: '', tone: 'gray' as StatusTone }
  const finalLabel = label ?? resolved.label
  const finalTone = tone ?? resolved.tone

  return (
    <span className={`hg-status-badge ${className}`.trim()} data-tone={finalTone}>
      {showDot && <span className="hg-status-badge-dot" aria-hidden="true" />}
      <span>{finalLabel}</span>
    </span>
  )
}
