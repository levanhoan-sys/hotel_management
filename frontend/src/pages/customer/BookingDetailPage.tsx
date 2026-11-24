import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Printer,
  ReceiptText,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import { downloadPrintableInvoice, localizeInvoiceItemDescription, tryNativePrint } from '../../lib/invoice-print'
import type { ApiResponse, Booking, Invoice } from '../../lib/types'
import { DepositPaymentPanel } from '../../components/DepositPaymentPanel'
import { RefundTrackingPanel } from '../../components/RefundTrackingPanel'
import { ConfirmDialog, ErrorState, LoadingSkeleton, StatusBadge } from '../../components/shared'
import { bookingStatusLabel, bookingStatusTone, fmtDate, fmtDateTime, money, RoomImage } from './customer-helpers'
import { RoomServiceOrder } from './RoomServiceOrder'

type CancellationPreview = {
  depositPaid: number
  refundRate: number
  refundAmount: number
}

function fmtWeekday(date: string) {
  const raw = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function BookingPaymentTimeline({ booking }: { booking: Booking }) {
  const terminal = ['CANCELLED', 'REJECTED', 'EXPIRED', 'NO_SHOW'].includes(booking.status)
  if (terminal) {
    return (
      <div className="hg-panel hg-timeline-terminal">
        <div>
          <span className="hg-kicker">Tiến trình đơn đặt phòng</span>
          <p>
            Đơn đặt phòng hiện ở trạng thái{' '}
            <strong>{bookingStatusLabel[booking.status] || booking.status}</strong>
          </p>
        </div>
        <StatusBadge
          tone={bookingStatusTone[booking.status] || 'gray'}
          label={bookingStatusLabel[booking.status] || booking.status}
          showDot={false}
        />
      </div>
    )
  }

  const depositDone = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(booking.status)
  const depositActive = booking.status === 'PENDING_DEPOSIT' || booking.status === 'PENDING_VERIFICATION'
  const confirmDone = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(booking.status)
  const confirmActive = booking.status === 'PENDING'
  const stayDone = ['COMPLETED', 'CHECKED_OUT'].includes(booking.status)
  const stayActive = booking.status === 'CHECKED_IN'

  const steps = [
    {
      num: '01',
      title: 'Tạo yêu cầu',
      detail: 'Đã giữ phòng tạm thời',
      state: 'done' as const,
    },
    {
      num: '02',
      title: 'Đặt cọc VietQR',
      detail:
        booking.status === 'PENDING_VERIFICATION'
          ? 'Đang chờ lễ tân xác minh'
          : booking.status === 'PENDING_DEPOSIT'
            ? 'Chờ thanh toán cọc'
            : booking.depositPaidAt
              ? `Đã nhận ${fmtDateTime(booking.depositPaidAt)}`
              : 'Đã hoàn tất bước cọc',
      state: depositDone ? ('done' as const) : depositActive ? ('active' as const) : ('done' as const),
    },
    {
      num: '03',
      title: 'Xác nhận phòng',
      detail: booking.confirmedAt
        ? fmtDateTime(booking.confirmedAt)
        : confirmDone
          ? 'Đã xác nhận'
          : 'Đang chờ lễ tân xác nhận',
      state: confirmDone ? ('done' as const) : confirmActive ? ('active' as const) : ('upcoming' as const),
    },
    {
      num: '04',
      title: 'Lưu trú & trả phòng',
      detail: stayDone
        ? 'Đã hoàn tất lưu trú'
        : stayActive
          ? 'Đang lưu trú tại khách sạn'
          : 'Sẵn sàng đón khách',
      state: stayDone ? ('done' as const) : stayActive ? ('active' as const) : ('upcoming' as const),
    },
  ]

  return (
    <section className="hg-panel hg-timeline-card" aria-label="Tiến trình đặt phòng và thanh toán">
      <div className="hg-timeline-head">
        <span className="hg-kicker">Tiến trình đặt phòng và thanh toán</span>
        <StatusBadge
          tone={bookingStatusTone[booking.status] || 'gray'}
          label={bookingStatusLabel[booking.status] || booking.status}
          showDot={false}
        />
      </div>
      <ol className="hg-timeline-steps">
        {steps.map((step) => (
          <li key={step.num} className={`is-${step.state}`}>
            <div className="hg-timeline-marker" aria-hidden="true">
              {step.state === 'done' ? <Check size={14} /> : step.num}
            </div>
            <div>
              <b>{step.title}</b>
              <small>{step.detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function BookingDetailPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const booking = useQuery({
    queryKey: ['booking', id],
    queryFn: () => request(api.get<ApiResponse<Booking>>(`/bookings/${id}`)),
    enabled: Boolean(id),
    refetchInterval: 15000,
  })

  const invoice = useQuery({
    queryKey: ['booking-invoice', id],
    queryFn: () => request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${id}`)),
    enabled: Boolean(booking.data && ['CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(booking.data.status)),
    retry: false,
  })

  const serviceSyncKey = booking.data?.serviceOrders
    ?.map((item) => `${item.id}:${item.approvalStatus}`)
    .join('|')

  useEffect(() => {
    if (booking.data?.status === 'CHECKED_IN') {
      void queryClient.invalidateQueries({ queryKey: ['booking-invoice', String(booking.data.id)] })
    }
  }, [booking.data?.status, booking.data?.id, serviceSyncKey, queryClient])

  const cancel = useMutation({
    mutationFn: () =>
      request(api.patch<ApiResponse<null>>(`/bookings/${id}/cancel`, { reason: 'Khách hàng yêu cầu hủy' })),
    onSuccess: async () => {
      setCancelPreview(null)
      toast.success('Đã gửi yêu cầu hủy đặt phòng.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', id] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-refunds', Number(id)] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể hủy đơn đặt phòng.')),
  })

  const openCancelDialog = async (bookingId: number) => {
    setLoadingPreview(true)
    try {
      const preview = await request(
        api.get<ApiResponse<CancellationPreview>>(`/bookings/${bookingId}/cancellation-preview`),
      )
      setCancelPreview(preview)
    } catch (error) {
      toast.error(errorMessage(error, 'Chưa thể xem chính sách hủy.'))
    } finally {
      setLoadingPreview(false)
    }
  }

  if (booking.isPending) {
    return (
      <main className="hg-detail-account-page">
        <div className="hg-container">
          <LoadingSkeleton variant="cards" count={2} />
        </div>
      </main>
    )
  }

  if (booking.isError) {
    return (
      <main className="hg-detail-account-page">
        <div className="hg-container">
          <ErrorState error={booking.error} retry={() => void booking.refetch()} />
        </div>
      </main>
    )
  }

  const b = booking.data
  const canCancel = ['PENDING_DEPOSIT', 'PENDING_VERIFICATION', 'PENDING', 'CONFIRMED'].includes(b.status)
  const canInvoice = ['CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(b.status)
  const roomCount = b.rooms?.length || b.roomNumbers?.length || 0
  const totalGuests = b.rooms?.reduce((sum, room) => sum + (room.guestCount || 0), 0) || 0
  const approvedServices =
    b.serviceOrders?.filter((service) => !service.cancelled && (service.approvalStatus || 'APPROVED') === 'APPROVED') ||
    []

  return (
    <main className="hg-detail-account-page">
      <div className="hg-container">
        <div className="hg-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <Link to="/my-bookings">Đơn đặt phòng</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{b.bookingCode}</span>
        </div>

        <header className="hg-panel hg-booking-detail-head">
          <div className="hg-booking-head-copy">
            <span className="hg-kicker">Chi tiết đặt phòng</span>
            <h1 className="hg-serif-em">
              Kỳ nghỉ <em>của bạn</em>
            </h1>
            <p className="hg-booking-head-meta">
              <span className="hg-head-meta-item">
                <span className="hg-head-meta-label">Mã đặt phòng</span>
                <strong className="hg-head-code">{b.bookingCode}</strong>
              </span>
              <span className="hg-head-meta-item">
                <span className="hg-head-meta-label">Thời gian</span>
                <strong>{b.numberOfNights} đêm</strong>
              </span>
              <span className="hg-head-meta-item">
                <span className="hg-head-meta-label">Quy mô</span>
                <strong>
                  {roomCount} phòng{totalGuests > 0 ? `, ${totalGuests} khách` : ''}
                </strong>
              </span>
            </p>
          </div>
          <div className="hg-booking-head-status">
            <span className="hg-head-status-label">Trạng thái đơn</span>
            <StatusBadge
              tone={bookingStatusTone[b.status] || 'gray'}
              label={bookingStatusLabel[b.status] || b.status}
              showDot={false}
            />
          </div>
        </header>

        <BookingPaymentTimeline booking={b} />

        <div className="hg-booking-detail-layout">
          <section className="hg-booking-detail-main">
            <DepositPaymentPanel booking={b} />
            <RefundTrackingPanel bookingId={b.id} bookingStatus={b.status} />
            <RoomServiceOrder booking={b} />

            <article className="hg-panel hg-detail-section-card hg-stay-itinerary-card">
              <div className="hg-detail-card-head">
                <div>
                  <span className="hg-kicker">Lịch trình lưu trú</span>
                  <h2>Nhận phòng và trả phòng</h2>
                </div>
                <CalendarDays size={20} aria-hidden="true" />
              </div>

              <div className="hg-stay-itinerary">
                <div className="hg-stay-slot">
                  <span className="hg-stay-slot-label">Nhận phòng</span>
                  <strong className="hg-stay-slot-date">{fmtDate(b.checkInDate)}</strong>
                  <span className="hg-stay-slot-sub">
                    {b.checkedInAt ? `Đã nhận lúc ${fmtDateTime(b.checkedInAt)}` : `${fmtWeekday(b.checkInDate)}, từ 14:00`}
                  </span>
                </div>

                <div className="hg-stay-slot is-checkout">
                  <span className="hg-stay-slot-label">Trả phòng</span>
                  <strong className="hg-stay-slot-date">{fmtDate(b.checkOutDate)}</strong>
                  <span className="hg-stay-slot-sub">
                    {b.checkedOutAt
                      ? `Đã trả lúc ${fmtDateTime(b.checkedOutAt)}`
                      : `${fmtWeekday(b.checkOutDate)}, trước 12:00`}
                  </span>
                </div>
              </div>

              <div className="hg-stay-foot">
                <span>
                  Thời gian: <strong>{b.numberOfNights} đêm</strong>
                </span>
                <span>
                  Khách lưu trú: <strong>{totalGuests > 0 ? `${totalGuests} khách` : 'Theo tiêu chuẩn phòng'}</strong>
                </span>
                <span>
                  Số lượng phòng: <strong>{roomCount} phòng</strong>
                </span>
              </div>
            </article>

            <article className="hg-panel hg-detail-section-card">
              <div className="hg-detail-card-head">
                <div>
                  <span className="hg-kicker">Không gian lưu trú</span>
                  <h2>{roomCount} phòng đã đặt</h2>
                </div>
                <BedDouble size={20} aria-hidden="true" />
              </div>

              <div className="hg-booked-rooms-list">
                {b.rooms?.map((room, index) => (
                  <div className="hg-booked-room-row" key={room.roomId}>
                    <div className="hg-booked-room-thumb">
                      <RoomImage
                        room={{ imageUrl: b.roomImageUrls?.[index] || null, name: `Phòng ${room.roomNumber}` }}
                      />
                    </div>
                    <div className="hg-booked-room-info">
                      <Link
                        className="hg-booked-room-link"
                        to={`/rooms/${room.roomId}`}
                        aria-label={`Xem chi tiết phòng ${room.roomNumber}`}
                      >
                        Phòng {room.roomNumber}
                      </Link>
                      <span>
                        {room.guestCount} khách, tối đa {room.capacity} khách
                      </span>
                      <small>
                        {money(room.pricePerNight)} / đêm × {b.numberOfNights} đêm
                      </small>
                    </div>
                    <strong className="hg-booked-room-total">
                      {money(room.pricePerNight * b.numberOfNights)}
                    </strong>
                  </div>
                ))}
              </div>
            </article>

            {(b.cancellationReason || b.rejectionReason) && (
              <article className="hg-panel hg-detail-section-card hg-reason-card">
                <div className="hg-detail-card-head">
                  <div>
                    <span className="hg-kicker">Cập nhật từ khách sạn</span>
                    <h2>Thông tin trạng thái</h2>
                  </div>
                  <CircleAlert size={20} aria-hidden="true" />
                </div>
                {b.cancellationReason && <p className="hg-reason-line">Lý do hủy: {b.cancellationReason}</p>}
                {b.rejectionReason && <p className="hg-reason-line">Lý do từ chối: {b.rejectionReason}</p>}
              </article>
            )}

            {canInvoice && (
              <article className="hg-panel hg-detail-section-card hg-invoice-card">
                <div className="hg-detail-card-head">
                  <div>
                    <span className="hg-kicker">Tổng kết chi phí</span>
                    <h2>Hóa đơn lưu trú</h2>
                    <p className="hg-invoice-code">
                      Mã đặt phòng: <strong className="hg-head-code">{b.bookingCode}</strong>
                    </p>
                  </div>
                  <ReceiptText size={20} aria-hidden="true" />
                </div>

                <div className="hg-invoice-stay-dates">
                  <div>
                    <span>Đặt phòng từ ngày</span>
                    <b>{fmtDate(b.checkInDate)}</b>
                  </div>
                  <div>
                    <span>Đến ngày</span>
                    <b>{fmtDate(b.checkOutDate)}</b>
                  </div>
                  <div>
                    <span>Check-in thực tế</span>
                    <b>{fmtDateTime(b.checkedInAt)}</b>
                  </div>
                  <div>
                    <span>Check-out thực tế</span>
                    <b>{fmtDateTime(b.checkedOutAt)}</b>
                  </div>
                </div>

                {!invoice.data ? (
                  <div className="hg-invoice-empty-actions">
                    <button
                      type="button"
                      className="hg-btn hg-btn-outline"
                      disabled={invoice.isFetching}
                      onClick={() => void invoice.refetch()}
                    >
                      {invoice.isFetching ? 'Đang tải hóa đơn…' : 'Xem hóa đơn'}{' '}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                    {invoice.isError && (
                      <p className="hg-invoice-unavailable">
                        {errorMessage(invoice.error, 'Hóa đơn chưa sẵn sàng.')}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="hg-invoice-details">
                    <div className="hg-invoice-row">
                      <span>Tiền phòng</span>
                      <b>{money(invoice.data.roomAmount)}</b>
                    </div>
                    <div className="hg-invoice-row">
                      <span>Dịch vụ</span>
                      <b>{money(invoice.data.serviceAmount)}</b>
                    </div>
                    <div className="hg-invoice-row">
                      <span>Thuế và phụ thu</span>
                      <b>{money(invoice.data.tax + invoice.data.surcharge)}</b>
                    </div>
                    <div className="hg-invoice-row">
                      <span>Giảm trừ</span>
                      <b>− {money(invoice.data.discount)}</b>
                    </div>
                    <div className="hg-invoice-row is-grand">
                      <span>Tổng hóa đơn</span>
                      <b>{money(invoice.data.totalAmount)}</b>
                    </div>
                    <div className="hg-invoice-row">
                      <span>Đã thanh toán</span>
                      <b>{money(invoice.data.successfulPayments)}</b>
                    </div>
                    <div className="hg-invoice-row is-due">
                      <span>Còn phải thanh toán</span>
                      <b>{money(invoice.data.balanceDue)}</b>
                    </div>

                    {invoice.data.items?.length > 0 && (
                      <div className="hg-invoice-items">
                        {invoice.data.items.map((item) => (
                          <div key={item.id}>
                            <span>
                              {localizeInvoiceItemDescription(item.description)} × {item.quantity}
                            </span>
                            <b>{money(item.lineTotal)}</b>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="hg-invoice-foot">
                      <StatusBadge
                        tone={
                          invoice.data.status === 'PAID'
                            ? 'green'
                            : invoice.data.status === 'ISSUED'
                              ? 'blue'
                              : 'gray'
                        }
                        label={
                          invoice.data.status === 'PAID'
                            ? 'Đã thanh toán'
                            : invoice.data.status === 'ISSUED'
                              ? 'Đã phát hành'
                              : 'Bản nháp'
                        }
                        showDot={false}
                      />
                      <button
                        type="button"
                        className="hg-btn hg-btn-outline hg-print-invoice-btn"
                        onClick={() => {
                          downloadPrintableInvoice(invoice.data, b)
                          const res = tryNativePrint()
                          toast.success(
                            res.inIframe || res.threw
                              ? 'Đã tải tệp hóa đơn. Mở tệp để in hoặc lưu PDF.'
                              : 'Đã mở hộp thoại in và tải tệp hóa đơn.',
                          )
                        }}
                      >
                        <Printer size={15} aria-hidden="true" /> In hóa đơn
                      </button>
                    </div>
                  </div>
                )}
              </article>
            )}
          </section>

          <aside className="hg-panel hg-booking-detail-aside">
            <span className="hg-kicker">Tóm tắt chi phí</span>
            <div className="hg-detail-aside-total">
              <b>{money(b.estimatedTotal)}</b>
              <span>Chi phí dự kiến theo đơn</span>
            </div>

            <div className="hg-detail-aside-rows">
              <div>
                <span>Tiền phòng</span>
                <b>{money(b.totalRoomCharge)}</b>
              </div>
              {b.totalServiceCharge > 0 && (
                <div>
                  <span>Dịch vụ</span>
                  <b>{money(b.totalServiceCharge)}</b>
                </div>
              )}
              {typeof b.depositAmount === 'number' && b.depositAmount > 0 && (
                <div>
                  <span>Tiền cọc theo đơn</span>
                  <b>{money(b.depositAmount)}</b>
                </div>
              )}
              <div className="is-total">
                <span>Tổng dự kiến</span>
                <b>{money(b.estimatedTotal)}</b>
              </div>
            </div>

            {approvedServices.length > 0 && (
              <div className="hg-detail-aside-services">
                <h3>Dịch vụ đang tính phí</h3>
                {approvedServices.map((service, index) => (
                  <div key={service.id || `${service.name}-${index}`}>
                    <span>
                      {service.roomNumber ? `Phòng ${service.roomNumber} — ` : ''}
                      {service.name} × {service.quantity} {service.unit}
                    </span>
                    <b>{money(service.subTotal)}</b>
                  </div>
                ))}
              </div>
            )}

            <p className="hg-summary-note">Hóa đơn và khoản thanh toán cuối cùng do khách sạn cập nhật</p>

            {canCancel && (
              <button
                type="button"
                className="hg-btn hg-btn-outline hg-cancel-booking-btn full-button"
                disabled={cancel.isPending || loadingPreview}
                onClick={() => void openCancelDialog(b.id)}
              >
                {loadingPreview
                  ? 'Đang kiểm tra chính sách hủy…'
                  : cancel.isPending
                    ? 'Đang gửi yêu cầu…'
                    : 'Yêu cầu hủy đặt phòng'}
              </button>
            )}

            <Link className="hg-editorial-link hg-back-link" to="/my-bookings">
              <ArrowLeft size={15} aria-hidden="true" /> Quay lại danh sách đơn
            </Link>
          </aside>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(cancelPreview)}
        onOpenChange={(open) => {
          if (!open) setCancelPreview(null)
        }}
        title={`Xác nhận hủy đơn ${b.bookingCode}`}
        message={
          cancelPreview
            ? `Cọc đã thanh toán: ${money(cancelPreview.depositPaid)}. Tỷ lệ hoàn dự kiến: ${Math.round(
                cancelPreview.refundRate * 100,
              )}%. Số tiền dự kiến hoàn: ${money(cancelPreview.refundAmount)}. Bạn có chắc chắn muốn gửi yêu cầu hủy đơn này?`
            : ''
        }
        confirmLabel="Xác nhận hủy đơn"
        cancelLabel="Giữ lại đơn"
        tone="danger"
        pending={cancel.isPending}
        onConfirm={() => cancel.mutate()}
      />
    </main>
  )
}
