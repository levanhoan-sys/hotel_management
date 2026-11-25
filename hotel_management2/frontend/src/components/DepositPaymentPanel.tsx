import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../lib/api'
import type { ApiResponse, Booking } from '../lib/types'

type VietQr = { bookingId: number; amount: number; transferContent: string; bankBin: string; accountNumber: string; accountName: string; qrUrl: string; depositDeadline: string; verificationDeadline: string | null }
type DepositState = { bookingId: number; paymentStatus: string | null; reportedAt: string | null; verificationDeadline: string | null }
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export function DepositPaymentPanel({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient()
  const [imageFailed, setImageFailed] = useState(false)
  const qr = useQuery({ queryKey: ['deposit-qr', booking.id], queryFn: () => request(api.get<ApiResponse<VietQr>>(`/bookings/${booking.id}/deposit/qr`)), enabled: booking.status === 'PENDING_DEPOSIT' || booking.status === 'PENDING_VERIFICATION' })
  const state = useQuery({ queryKey: ['deposit-status', booking.id], queryFn: () => request(api.get<ApiResponse<DepositState>>(`/bookings/${booking.id}/deposit`)), enabled: booking.status === 'PENDING_VERIFICATION', refetchInterval: 10000 })
  const report = useMutation({
    mutationFn: () => request(api.post<ApiResponse<DepositState>>(`/bookings/${booking.id}/deposit/report`)),
    onSuccess: async () => { toast.success('Đã báo chuyển khoản. Lễ tân sẽ kiểm tra tài khoản ngân hàng.'); await Promise.all([queryClient.invalidateQueries({ queryKey: ['booking', String(booking.id)] }), queryClient.invalidateQueries({ queryKey: ['my-bookings'] }), queryClient.invalidateQueries({ queryKey: ['deposit-status', booking.id] })]) },
    onError: error => toast.error(errorMessage(error, 'Chưa thể gửi thông báo chuyển khoản.'))
  })
  if (booking.status !== 'PENDING_DEPOSIT' && booking.status !== 'PENDING_VERIFICATION') return null
  const reported = booking.status === 'PENDING_VERIFICATION' || state.data?.paymentStatus === 'REPORTED'
  const data = qr.data
  return <article className="booking-detail-card"><span className="section-kicker">THANH TOÁN ĐẶT CỌC</span><h2>{reported ? 'Đang chờ lễ tân xác minh' : 'Chuyển khoản để giữ phòng'}</h2><p>Tiền cọc 30% tiền phòng: <strong>{money(booking.depositAmount || 0)}</strong></p>
    {qr.isPending && <p>Đang tải thông tin QR…</p>}{qr.isError && <p className="invoice-unavailable">{errorMessage(qr.error, 'Chưa thể tải thông tin thanh toán.')}</p>}
    {data && <div className="deposit-transfer"><div className="deposit-qr">{!imageFailed ? <img src={data.qrUrl} alt="VietQR đặt cọc" onError={() => setImageFailed(true)} /> : <p>Ảnh QR không tải được. Dùng thông tin chuyển khoản bên dưới.</p>}</div><dl><dt>Ngân hàng BIN</dt><dd>{data.bankBin}</dd><dt>Số tài khoản</dt><dd>{data.accountNumber}</dd><dt>Chủ tài khoản</dt><dd>{data.accountName}</dd><dt>Số tiền</dt><dd>{money(data.amount)}</dd><dt>Nội dung chuyển khoản</dt><dd><strong>{data.transferContent}</strong></dd><dt>Hạn giữ phòng</dt><dd>{new Date(data.depositDeadline).toLocaleString('vi-VN')}</dd>{data.verificationDeadline && <><dt>Hạn xác minh</dt><dd>{new Date(data.verificationDeadline).toLocaleString('vi-VN')}</dd></>}</dl></div>}
    <p>Chuyển khoản bằng ứng dụng ngân hàng, sau đó chọn “Tôi đã chuyển khoản”. Hệ thống chỉ xác nhận sau khi lễ tân đối chiếu tiền thực nhận.</p>
    {!reported && <button className="button button-dark" disabled={report.isPending || !data} onClick={() => report.mutate()}>{report.isPending ? 'Đang gửi…' : 'Tôi đã chuyển khoản'}</button>}
    {reported && <p>Thời hạn giữ phòng bổ sung tối đa 30 phút sau khi bạn báo chuyển khoản. Không gửi thêm giao dịch khác nếu chưa trao đổi với lễ tân.</p>}
  </article>
}
