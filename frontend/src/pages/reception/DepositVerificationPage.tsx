import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { MoneyInput } from '../../components/MoneyInput'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking } from '../../lib/types'
import { ErrorPanel, LoadingRows, PageTitle, money } from './reception-helpers'

export function DepositVerificationPage() {
  type Qr = {
    amount: number
    transferContent: string
    bankBin: string
    accountNumber: string
    accountName: string
    qrUrl: string
  }
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedBookingId = Number(searchParams.get('bookingId'))
  const pending = useQuery({
    queryKey: ['reception-deposits'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/deposits/pending')),
    refetchOnMount: 'always',
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
  const [selectedId, setSelectedId] = useState<number | null>(() =>
    Number.isInteger(requestedBookingId) && requestedBookingId > 0 ? requestedBookingId : null,
  )
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [dialogAction, setDialogAction] = useState<'confirm' | 'reject' | null>(null)

  useEffect(() => {
    if (Number.isInteger(requestedBookingId) && requestedBookingId > 0) {
      setSelectedId(requestedBookingId)
    }
  }, [requestedBookingId])

  const selected = pending.data?.find((item) => item.id === selectedId) || pending.data?.[0]

  useEffect(() => {
    if (selected) setAmount(String(selected.depositAmount ?? ''))
  }, [selected?.id, selected?.depositAmount])

  const qr = useQuery({
    queryKey: ['reception-deposit-qr', selected?.id],
    queryFn: () => request(api.get<ApiResponse<Qr>>(`/bookings/${selected!.id}/deposit/qr`)),
    enabled: Boolean(selected),
  })

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['reception-deposits'] }),
      qc.invalidateQueries({ queryKey: ['ops-bookings'] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
    ])
  }

  const confirm = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<unknown>>(`/reception/deposits/${selected!.id}/confirm`, {
          actualReceivedAmount: Number(amount),
          transactionReference: reference.trim(),
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã xác nhận cọc sau khi đối chiếu')
      setDialogAction(null)
      setReference('')
      setAmount('')
      await refresh()
    },
    onError: (e) => {
      setDialogAction(null)
      toast.error(errorMessage(e))
    },
  })

  const reject = useMutation({
    mutationFn: () => request(api.post<ApiResponse<unknown>>(`/reception/deposits/${selected!.id}/reject`)),
    onSuccess: async () => {
      toast.success('Đã từ chối xác minh')
      setDialogAction(null)
      await refresh()
    },
    onError: (e) => {
      setDialogAction(null)
      toast.error(errorMessage(e))
    },
  })

  return (
    <div className="ops-page">
      <PageTitle
        kicker="ĐỐI SOÁT CHUYỂN KHOẢN"
        title="Xác nhận tiền cọc"
        detail="Đối chiếu giao dịch trong tài khoản ngân hàng trước khi xác nhận đặt phòng"
      />
      {pending.isPending ? (
        <LoadingRows />
      ) : pending.isError ? (
        <ErrorPanel error={pending.error} retry={() => void pending.refetch()} />
      ) : (
        <div className="invoice-layout">
          <section className="panel invoice-booking-list">
            <span className="section-kicker invoice-list-label">Chờ xác minh ({pending.data?.length || 0})</span>
            {pending.data?.map((item) => (
              <button
                className={`invoice-booking-row ${selected?.id === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => {
                  setSelectedId(item.id)
                  setAmount(String(item.depositAmount ?? ''))
                  setReference('')
                }}
              >
                <span className="booking-result-icon">
                  <ShieldCheck size={18} />
                </span>
                <span>
                  <b>{item.customerName}</b>
                  <small>
                    {item.bookingCode} —{' '}
                    {item.depositReportedAt ? new Date(item.depositReportedAt).toLocaleString('vi-VN') : '—'}
                  </small>
                </span>
                <b>{money(item.depositAmount || 0)}</b>
              </button>
            ))}
            {!pending.data?.length && <div className="empty-compact">Không có khoản cọc đang chờ</div>}
          </section>

          <section className="panel invoice-detail">
            {selected ? (
              <>
                <div className="invoice-head">
                  <div>
                    <span className="section-kicker">{selected.bookingCode}</span>
                    <h3>{selected.customerName}</h3>
                    <p>
                      Giữ phòng đến{' '}
                      {selected.verificationDeadline
                        ? new Date(selected.verificationDeadline).toLocaleString('vi-VN')
                        : '—'}
                    </p>
                  </div>
                  <span className="status-badge amber">Chờ xác minh</span>
                </div>
                <p>
                  Tiền cọc cần đối chiếu: <strong>{money(selected.depositAmount || 0)}</strong>
                </p>
                {qr.data && (
                  <div className="deposit-transfer">
                    <img width="180" src={qr.data.qrUrl} alt="VietQR của booking" />
                    <div>
                      <p>{qr.data.accountName}</p>
                      <p>{qr.data.accountNumber}</p>
                      <p>
                        Nội dung: <strong>{qr.data.transferContent}</strong>
                      </p>
                    </div>
                  </div>
                )}
                <form
                  className="payment-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (Number(amount) !== selected.depositAmount) {
                      return toast.error('Số tiền thực nhận phải khớp chính xác tiền cọc')
                    }
                    if (!reference.trim()) {
                      return toast.error('Nhập mã giao dịch ngân hàng sau khi đối chiếu')
                    }
                    setDialogAction('confirm')
                  }}
                >
                  <label className="form-field">
                    <span>Số tiền thực nhận (VND)</span>
                    <MoneyInput value={amount} onChange={setAmount} required />
                  </label>
                  <label className="form-field">
                    <span>Mã giao dịch ngân hàng</span>
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ví dụ: FT241124001"
                      maxLength={255}
                      required
                    />
                  </label>
                  <button className="button button-dark full-button" disabled={confirm.isPending || reject.isPending}>
                    {confirm.isPending ? 'Đang xác nhận…' : 'Xác nhận đã nhận tiền'}
                  </button>
                  <button
                    type="button"
                    className="button button-outline full-button"
                    disabled={confirm.isPending || reject.isPending}
                    onClick={() => setDialogAction('reject')}
                  >
                    {reject.isPending ? 'Đang xử lý…' : 'Từ chối xác minh'}
                  </button>
                </form>
              </>
            ) : (
              <div className="lifecycle-empty">
                <ShieldCheck size={28} />
                <h3>Chọn khoản cọc</h3>
                <p>Chi tiết giao dịch sẽ hiển thị tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={dialogAction !== null}
        onOpenChange={(open) => {
          if (!open && !confirm.isPending && !reject.isPending) setDialogAction(null)
        }}
        title={dialogAction === 'reject' ? 'Từ chối xác minh tiền cọc' : 'Xác nhận đã nhận tiền cọc'}
        message={
          dialogAction === 'reject'
            ? 'Từ chối xác minh giao dịch này? Booking sẽ hết hiệu lực giữ phòng.'
            : `Xác nhận đã đối chiếu tài khoản ngân hàng và nhận đủ ${money(Number(amount) || 0)} cho đơn ${selected?.bookingCode || ''} (Mã GD: ${reference.trim()})?`
        }
        confirmLabel={dialogAction === 'reject' ? 'Xác nhận từ chối' : 'Xác nhận đã nhận tiền'}
        tone={dialogAction === 'reject' ? 'danger' : 'primary'}
        pending={confirm.isPending || reject.isPending}
        onConfirm={() => {
          if (dialogAction === 'reject') reject.mutate()
          else confirm.mutate()
        }}
      />
    </div>
  )
}
