import { Dialog } from '../ui/dialog'

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  tone = 'primary',
  pending = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger' | 'gold'
  pending?: boolean
  onConfirm: () => void
}) {
  const confirmClass =
    tone === 'danger' ? 'hg-btn hg-btn-danger' : tone === 'gold' ? 'hg-btn hg-btn-gold' : 'hg-btn hg-btn-primary'

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <div className="hg-confirm-body">
        <p className="hg-confirm-message">{message}</p>
        <div className="hg-confirm-actions">
          <button
            type="button"
            className="hg-btn hg-btn-outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={confirmClass}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
