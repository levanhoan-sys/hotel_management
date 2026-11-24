import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, Clock, Copy, QrCode, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../lib/api'
import type { ApiResponse, Booking } from '../lib/types'
import { ErrorState, LoadingSkeleton, StatusBadge } from './shared'

type VietQr = {
  bookingId: number
  amount: number
  transferContent: string
  bankBin: string
  accountNumber: string
  accountName: string
  qrUrl: string
  depositDeadline: string
  verificationDeadline: string | null
}

type DepositState = {
  bookingId: number
  paymentStatus: string | null
  reportedAt: string | null
  verificationDeadline: string | null
}

type CopyableField = 'accountNumber' | 'amount' | 'transferContent'

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

const formatDeadline = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fallback below if clipboard permission is denied
    }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
  } catch {
    return false
  }
}

export function DepositPaymentPanel({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient()
  const [imageFailed, setImageFailed] = useState(false)
  const [copiedField, setCopiedField] = useState<CopyableField | null>(null)
  const resetTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current)
    }
  }, [])

  const qr = useQuery({
    queryKey: ['deposit-qr', booking.id],
    queryFn: () => request(api.get<ApiResponse<VietQr>>(`/bookings/${booking.id}/deposit/qr`)),
    enabled: booking.status === 'PENDING_DEPOSIT' || booking.status === 'PENDING_VERIFICATION',
  })

  const state = useQuery({
    queryKey: ['deposit-status', booking.id],
    queryFn: () => request(api.get<ApiResponse<DepositState>>(`/bookings/${booking.id}/deposit`)),
    enabled: booking.status === 'PENDING_VERIFICATION',
    refetchInterval: 10000,
  })

  const report = useMutation({
    mutationFn: () => request(api.post<ApiResponse<DepositState>>(`/bookings/${booking.id}/deposit/report`)),
    onSuccess: async () => {
      toast.success('Đã báo chuyển khoản. Lễ tân sẽ kiểm tra tài khoản ngân hàng.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', String(booking.id)] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['deposit-status', booking.id] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error, 'Chưa thể gửi thông báo chuyển khoản.')),
  })

  if (booking.status !== 'PENDING_DEPOSIT' && booking.status !== 'PENDING_VERIFICATION') return null

  const reported = booking.status === 'PENDING_VERIFICATION' || state.data?.paymentStatus === 'REPORTED'
  const data = qr.data

  const handleCopy = async (field: CopyableField, value: string, label: string) => {
    const ok = await copyTextToClipboard(value)
    if (!ok) {
      toast.error(`Không thể tự động sao chép ${label.toLowerCase()}. Vui lòng sao chép thủ công.`)
      return
    }
    setCopiedField(field)
    toast.success(`Đã sao chép ${label.toLowerCase()}.`)
    if (resetTimer.current) window.clearTimeout(resetTimer.current)
    resetTimer.current = window.setTimeout(() => setCopiedField(null), 2500)
  }

  return (
    <article className="hg-panel hg-deposit-card" aria-labelledby={`deposit-title-${booking.id}`}>
      <div className="hg-deposit-head">
        <div>
          <span className="hg-kicker">THANH TOÁN ĐẶT CỌC VIETQR</span>
          <h2 id={`deposit-title-${booking.id}`}>
            {reported ? 'Đang chờ lễ tân xác minh giao dịch' : 'Chuyển khoản đặt cọc để giữ phòng'}
          </h2>
          <p className="hg-deposit-lead">
            Tiền cọc theo đơn ({booking.depositRate ? `${Math.round(booking.depositRate * 100)}%` : '30%'} tiền phòng):{' '}
            <strong>{money(booking.depositAmount ?? data?.amount ?? 0)}</strong>
          </p>
        </div>
        <StatusBadge
          tone="amber"
          label={reported ? 'Chờ lễ tân xác minh' : 'Chờ thanh toán cọc'}
        />
      </div>

      {qr.isPending ? (
        <LoadingSkeleton variant="rows" count={3} />
      ) : qr.isError ? (
        <ErrorState error={qr.error} retry={() => void qr.refetch()} />
      ) : data ? (
        <div className="hg-deposit-transfer">
          <div className="hg-deposit-qr-box">
            <div className="hg-deposit-qr-frame">
              {!imageFailed ? (
                <img
                  src={data.qrUrl}
                  alt="Mã VietQR thanh toán đặt cọc"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div className="hg-deposit-qr-fallback">
                  <QrCode size={32} strokeWidth={1.5} aria-hidden="true" />
                  <p>Ảnh QR chưa tải được. Bạn hãy dùng thông tin chuyển khoản bên cạnh.</p>
                </div>
              )}
            </div>
            <span className="hg-deposit-qr-caption">Quét bằng ứng dụng ngân hàng hỗ trợ VietQR</span>
          </div>

          <div className="hg-deposit-details">
            <dl className="hg-deposit-dl">
              <div className="hg-deposit-row">
                <dt>Ngân hàng (BIN)</dt>
                <dd className="hg-mono">{data.bankBin}</dd>
              </div>

              <div className="hg-deposit-row">
                <dt>Chủ tài khoản</dt>
                <dd>{data.accountName}</dd>
              </div>

              <div className="hg-deposit-row is-copyable">
                <div>
                  <dt>Số tài khoản</dt>
                  <dd className="hg-mono hg-deposit-strong">{data.accountNumber}</dd>
                </div>
                <button
                  type="button"
                  className={`hg-copy-btn ${copiedField === 'accountNumber' ? 'is-copied' : ''}`}
                  aria-label="Sao chép số tài khoản"
                  onClick={() => void handleCopy('accountNumber', data.accountNumber, 'Số tài khoản')}
                >
                  {copiedField === 'accountNumber' ? (
                    <>
                      <Check size={14} aria-hidden="true" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy size={14} aria-hidden="true" /> Sao chép
                    </>
                  )}
                </button>
              </div>

              <div className="hg-deposit-row is-copyable">
                <div>
                  <dt>Số tiền chuyển khoản</dt>
                  <dd className="hg-deposit-amount">{money(data.amount)}</dd>
                </div>
                <button
                  type="button"
                  className={`hg-copy-btn ${copiedField === 'amount' ? 'is-copied' : ''}`}
                  aria-label="Sao chép số tiền"
                  onClick={() => void handleCopy('amount', String(data.amount), 'Số tiền')}
                >
                  {copiedField === 'amount' ? (
                    <>
                      <Check size={14} aria-hidden="true" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy size={14} aria-hidden="true" /> Sao chép
                    </>
                  )}
                </button>
              </div>

              <div className="hg-deposit-row is-copyable is-highlight">
                <div>
                  <dt>Nội dung chuyển khoản</dt>
                  <dd className="hg-mono hg-deposit-strong">{data.transferContent}</dd>
                </div>
                <button
                  type="button"
                  className={`hg-copy-btn ${copiedField === 'transferContent' ? 'is-copied' : ''}`}
                  aria-label="Sao chép nội dung chuyển khoản"
                  onClick={() => void handleCopy('transferContent', data.transferContent, 'Nội dung chuyển khoản')}
                >
                  {copiedField === 'transferContent' ? (
                    <>
                      <Check size={14} aria-hidden="true" /> Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy size={14} aria-hidden="true" /> Sao chép
                    </>
                  )}
                </button>
              </div>
            </dl>

            <div className="hg-deposit-deadlines">
              <span>
                <Clock size={14} aria-hidden="true" /> Hạn giữ phòng:{' '}
                <strong>{formatDeadline(data.depositDeadline)}</strong>
              </span>
              {data.verificationDeadline && (
                <span>
                  <Clock size={14} aria-hidden="true" /> Hạn xác minh:{' '}
                  <strong>{formatDeadline(data.verificationDeadline)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="hg-deposit-notice" role="status" aria-live="polite">
        {copiedField
          ? 'Thông tin chuyển khoản đã được sao chép vào bộ nhớ tạm. Sau khi hoàn tất giao dịch trên ngân hàng, vui lòng nhấn “Tôi đã chuyển khoản”.'
          : 'Sao chép thông tin chỉ để hỗ trợ điền nhanh trên ứng dụng ngân hàng. Hệ thống chỉ ghi nhận xác nhận sau khi bạn gửi báo chuyển khoản và lễ tân đối chiếu tiền thực nhận.'}
      </div>

      <div className="hg-deposit-actions">
        {!reported ? (
          <button
            type="button"
            className="hg-btn hg-btn-gold"
            disabled={report.isPending || !data}
            onClick={() => report.mutate()}
          >
            {report.isPending ? 'Đang gửi thông báo…' : 'Tôi đã chuyển khoản'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        ) : (
          <p className="hg-deposit-reported-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>
              Bạn đã báo chuyển khoản. Thời hạn giữ phòng được gia hạn tối đa 30 phút để lễ tân xác minh; vui lòng không
              tạo thêm giao dịch khác nếu chưa trao đổi với lễ tân.
            </span>
          </p>
        )}
      </div>
    </article>
  )
}
