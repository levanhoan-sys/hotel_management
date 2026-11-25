import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Download, FileText, Printer, ReceiptText, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from '../../components/ui/dialog'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { MoneyInput } from '../../components/MoneyInput'
import { api, errorMessage, request } from '../../lib/api'
import { downloadPrintableInvoice, localizeInvoiceItemDescription, tryNativePrint } from '../../lib/invoice-print'
import type { ApiResponse, Invoice } from '../../lib/types'
import {
  ErrorPanel,
  LoadingRows,
  PageTitle,
  bookingNames,
  date,
  dateTime,
  money,
  statusTone,
  useInvalidate,
  useOpsData,
} from './reception-helpers'

export function InvoicesManagement() {
  const [searchParams] = useSearchParams()
  const { bookings } = useOpsData()
  const [search, setSearch] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [amount, setAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false)
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false)
  const requestedBookingId = Number(searchParams.get('bookingId')) || null
  const requestHandled = useRef<number | null>(null)
  const invalidate = useInvalidate()

  const eligible = (bookings.data || []).filter((b) => ['CHECKED_IN', 'COMPLETED', 'CHECKED_OUT'].includes(b.status))

  const paymentDateMatches = useQuery({
    queryKey: ['ops-invoice-payment-dates', searchDate, eligible.map((b) => b.id)],
    queryFn: async () => {
      const matches = await Promise.all(
        eligible.map(async (booking) => {
          try {
            const inv = await request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${booking.id}`))
            const paymentDates = [
              inv.paidAt,
              ...(inv.payments || []).filter((p) => p.status === 'SUCCESSFUL').map((p) => p.paidAt),
            ]
            return paymentDates.some((paidAt) => paidAt?.slice(0, 10) === searchDate) ? booking.id : null
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) return null
            throw error
          }
        }),
      )
      return matches.filter((id): id is number => id !== null)
    },
    enabled: Boolean(searchDate) && bookings.data !== undefined,
  })

  const visible = eligible.filter(
    (b) =>
      `${b.bookingCode} ${b.customerName}`.toLowerCase().includes(search.toLowerCase()) &&
      (!searchDate || b.depositPaidAt?.slice(0, 10) === searchDate || paymentDateMatches.data?.includes(b.id)),
  )

  const invoiceQuery = useQuery({
    queryKey: ['ops-invoice', invoice?.bookingId],
    queryFn: () => request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${invoice?.bookingId}`)),
    enabled: Boolean(invoice?.bookingId),
  })

  const create = useMutation({
    mutationFn: (bookingId: number) => request(api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/invoice`, {})),
    onSuccess: async (value) => {
      setInvoice(value)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const updateDraft = useMutation({
    mutationFn: () => {
      if (!invoice) throw new Error('Chưa có hóa đơn dự thảo để cập nhật')
      const discount = Number(discountAmount)
      if (!Number.isFinite(discount) || discount < 0) throw new Error('Số tiền giảm giá phải bằng hoặc lớn hơn 0')
      return request(
        api.put<ApiResponse<Invoice>>(`/reception/invoices/${invoice.id}/draft`, {
          surcharge: invoice.surcharge,
          discount,
        }),
      )
    },
    onSuccess: async (value) => {
      setInvoice(value)
      toast.success('Đã cập nhật giảm giá và tổng tiền hóa đơn')
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const issue = useMutation({
    mutationFn: (id: number) => request(api.post<ApiResponse<Invoice>>(`/reception/invoices/${id}/issue`)),
    onSuccess: async (value) => {
      setInvoice(value)
      toast.success('Hóa đơn đã phát hành')
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const payment = useMutation({
    mutationFn: () => {
      if (!invoiceQuery.data) throw new Error('Chưa có hóa đơn để ghi nhận thanh toán')
      return request(
        api.post<ApiResponse<{ id: number }>>(`/reception/invoices/${invoiceQuery.data.id}/payments`, {
          amount: Number(amount),
          method: 'CASH',
          idempotencyKey: crypto.randomUUID(),
          reference: 'Thu tiền mặt tại quầy',
        }),
      )
    },
    onSuccess: async () => {
      toast.success('Đã ghi nhận thanh toán tiền mặt')
      setAmount('')
      await invoiceQuery.refetch()
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const completeCheckout = useMutation({
    mutationFn: (bookingId: number) =>
      request(api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/check-out`)),
    onSuccess: async (value) => {
      setConfirmCheckoutOpen(false)
      setInvoice(value)
      toast.success('Trả phòng đã được hoàn tất')
      await invalidate()
      await invoiceQuery.refetch()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const openInvoice = async (bookingId: number) => {
    try {
      const current = await request(api.get<ApiResponse<Invoice>>(`/invoices/booking/${bookingId}`))
      if (current.status === 'DRAFT') {
        setInvoice(
          await request(
            api.post<ApiResponse<Invoice>>(`/reception/bookings/${bookingId}/invoice`, {
              surcharge: current.surcharge,
              discount: current.discount,
            }),
          ),
        )
      } else {
        setInvoice(current)
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) create.mutate(bookingId)
      else toast.error(errorMessage(error))
    }
  }

  useEffect(() => {
    if (requestedBookingId && bookings.data && requestHandled.current !== requestedBookingId) {
      requestHandled.current = requestedBookingId
      void openInvoice(requestedBookingId)
    }
  }, [requestedBookingId, bookings.data])

  const shown = invoiceQuery.data || invoice
  const selectedBooking = bookings.data?.find((booking) => booking.id === shown?.bookingId)
  const isCheckedOut =
    selectedBooking?.status === 'COMPLETED' ||
    selectedBooking?.status === 'CHECKED_OUT' ||
    Boolean(selectedBooking?.checkedOutAt)

  useEffect(() => {
    if (!invoiceQuery.data) return
    setAmount(String(invoiceQuery.data.balanceDue))
    if (invoiceQuery.data.status === 'DRAFT') setDiscountAmount(String(invoiceQuery.data.discount))
  }, [invoiceQuery.data])

  return (
    <div className="ops-page">
      <PageTitle
        kicker="HÓA ĐƠN & THANH TOÁN"
        title="Thu ngân"
        detail="Xem hóa đơn, chi phí phát sinh và ghi nhận thanh toán tại quầy"
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <div className="invoice-layout">
          <section className="panel invoice-booking-list">
            <div className="table-tools invoice-search-tools">
              <div className="invoice-search-field">
                <span>Tìm đơn / khách</span>
                <label className="table-search">
                  <Search size={16} />
                  <input
                    placeholder="Mã booking hoặc tên khách…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <label className="invoice-date-filter">
                <span>Ngày thanh toán</span>
                <input
                  type="date"
                  aria-label="Lọc hóa đơn theo ngày thanh toán"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </label>
            </div>

            <span className="section-kicker invoice-list-label">Booking cần hóa đơn ({visible.length})</span>

            {searchDate && paymentDateMatches.isPending ? (
              <div className="empty-compact">Đang tìm giao dịch thanh toán…</div>
            ) : paymentDateMatches.isError ? (
              <ErrorPanel error={paymentDateMatches.error} retry={() => void paymentDateMatches.refetch()} />
            ) : visible.length ? (
              <div className="invoice-booking-scroll">
                {visible.map((b) => (
                  <button
                    type="button"
                    className={`invoice-booking-row ${invoice?.bookingId === b.id ? 'selected' : ''}`}
                    key={b.id}
                    onClick={() => void openInvoice(b.id)}
                  >
                    <span className="booking-result-icon">
                      <FileText size={17} />
                    </span>
                    <span>
                      <b>{b.customerName}</b>
                      <small>
                        {b.bookingCode} — {searchDate ? `Thanh toán ${date(searchDate)}` : date(b.checkInDate)}
                      </small>
                    </span>
                    <span className={`status-badge ${statusTone(b.status)}`}>{bookingNames[b.status]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-compact">Không có booking phù hợp với bộ lọc</div>
            )}
          </section>

          <section className="panel invoice-detail">
            {invoiceQuery.isFetching || create.isPending ? (
              <div className="lifecycle-empty">
                <span className="spinner" /> Đang tải hóa đơn…
              </div>
            ) : invoiceQuery.isError && !shown ? (
              <ErrorPanel error={invoiceQuery.error} />
            ) : shown ? (
              <>
                <div className="invoice-head">
                  <div>
                    <span className="section-kicker">Hóa đơn #HG-{shown.id}</span>
                    <h3>{shown.customerName}</h3>
                    <p>
                      Mã đặt phòng: <strong>{selectedBooking?.bookingCode || `#${shown.bookingId}`}</strong>
                      {selectedBooking?.roomNumbers?.length
                        ? ` · ${selectedBooking.roomNumbers.map((r) => `Phòng ${r}`).join(', ')}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`status-badge ${shown.isPaid || shown.status === 'PAID' ? 'green' : shown.status === 'ISSUED' ? 'amber' : 'gray'}`}
                  >
                    {shown.isPaid || shown.status === 'PAID'
                      ? 'Đã thanh toán'
                      : shown.status === 'DRAFT'
                        ? 'Bản nháp'
                        : 'Chờ thanh toán'}
                  </span>
                </div>

                <div className="invoice-booking-dates">
                  <div>
                    <span>NGÀY NHẬN DỰ KIẾN</span>
                    <b>{selectedBooking ? date(selectedBooking.checkInDate) : '—'}</b>
                  </div>
                  <div>
                    <span>NGÀY TRẢ DỰ KIẾN</span>
                    <b>{selectedBooking ? date(selectedBooking.checkOutDate) : '—'}</b>
                  </div>
                  <div>
                    <span>CHECK-IN THỰC TẾ</span>
                    <b>{dateTime(selectedBooking?.checkedInAt)}</b>
                  </div>
                  <div>
                    <span>CHECK-OUT THỰC TẾ</span>
                    <b>{dateTime(selectedBooking?.checkedOutAt)}</b>
                  </div>
                </div>

                {shown.status === 'DRAFT' && (
                  <form
                    className="invoice-discount-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateDraft.mutate()
                    }}
                  >
                    <label className="form-field">
                      <span>Số tiền giảm giá (VND)</span>
                      <MoneyInput value={discountAmount} onChange={setDiscountAmount} required />
                    </label>
                    <button type="submit" className="button button-outline full-button" disabled={updateDraft.isPending}>
                      {updateDraft.isPending ? 'Đang cập nhật…' : 'Cập nhật giá hóa đơn'}
                    </button>
                    <small className="muted">Lưu mức giảm giá để cập nhật tổng tiền cuối cùng trước khi phát hành</small>
                  </form>
                )}

                {shown.items?.length > 0 && (
                  <div className="invoice-section-block">
                    <span className="section-kicker">Chi tiết khoản mục</span>
                    <div className="invoice-item-list">
                      {shown.items.map((item) => (
                        <div key={item.id}>
                          <span>
                            {localizeInvoiceItemDescription(item.description)}
                            <small>
                              {item.quantity} × {money(item.unitPrice)}
                            </small>
                          </span>
                          <b>{money(item.lineTotal)}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="invoice-section-block">
                  <span className="section-kicker">Tổng hợp thanh toán</span>
                  <div className="invoice-lines">
                    <div>
                      <span>Tiền phòng</span>
                      <b>{money(shown.roomAmount)}</b>
                    </div>
                    <div>
                      <span>Dịch vụ</span>
                      <b>{money(shown.serviceAmount)}</b>
                    </div>
                    <div>
                      <span>Thuế VAT</span>
                      <b>{money(shown.tax)}</b>
                    </div>
                    {shown.surcharge > 0 && (
                      <div>
                        <span>Phụ thu</span>
                        <b>{money(shown.surcharge)}</b>
                      </div>
                    )}
                    {shown.discount > 0 && (
                      <div>
                        <span>Giảm giá</span>
                        <b>−{money(shown.discount)}</b>
                      </div>
                    )}
                  </div>
                </div>

                <div className="invoice-grand">
                  <span>Tổng thanh toán</span>
                  <b>{money(shown.totalAmount)}</b>
                </div>

                <div className="invoice-balance">
                  <div>
                    <span>Đã thanh toán</span>
                    <b>{money(shown.successfulPayments)}</b>
                  </div>
                  <div>
                    <span>Còn lại</span>
                    <b>{money(shown.balanceDue)}</b>
                  </div>
                </div>

                {shown.status === 'DRAFT' && (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={issue.isPending}
                    onClick={() => issue.mutate(shown.id)}
                  >
                    {issue.isPending ? 'Đang phát hành…' : 'Phát hành hóa đơn'} <Check size={15} />
                  </button>
                )}

                {shown.balanceDue > 0 && shown.status === 'ISSUED' && (
                  <form
                    className="payment-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (Number(amount) <= 0 || Number(amount) > shown.balanceDue) {
                        return toast.error('Nhập số tiền dương không vượt quá số dư')
                      }
                      payment.mutate()
                    }}
                  >
                    <label className="form-field">
                      <span>Thu tiền mặt (VND)</span>
                      <MoneyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder={String(shown.balanceDue)}
                        required
                      />
                    </label>
                    <button type="submit" className="button button-dark full-button" disabled={payment.isPending}>
                      {payment.isPending ? 'Đang ghi nhận…' : 'Ghi nhận tiền mặt'} <Check size={15} />
                    </button>
                    <small className="muted">Chỉ hỗ trợ ghi nhận tiền mặt tại quầy</small>
                  </form>
                )}

                {shown.status === 'PAID' && shown.balanceDue === 0 && !isCheckedOut && (
                  <button
                    type="button"
                    className="button button-gold full-button"
                    disabled={completeCheckout.isPending}
                    onClick={() => setConfirmCheckoutOpen(true)}
                  >
                    {completeCheckout.isPending ? 'Đang hoàn tất…' : 'Hoàn tất trả phòng'} <ArrowRight size={15} />
                  </button>
                )}

                {isCheckedOut && (
                  <div className="invoice-checkout-done">
                    <Check size={16} />
                    <span>
                      Đã hoàn tất trả phòng
                      {selectedBooking?.checkedOutAt ? ` lúc ${dateTime(selectedBooking.checkedOutAt)}` : ''}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="print-button"
                  onClick={() => setPrintPreviewOpen(true)}
                >
                  <ReceiptText size={15} /> In / lưu trang hóa đơn
                </button>
              </>
            ) : (
              <div className="lifecycle-empty">
                <FileText size={28} />
                <h3>Chọn booking</h3>
                <p>Chi tiết hóa đơn sẽ hiển thị tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmCheckoutOpen && Boolean(shown)}
        onOpenChange={(open) => {
          if (!open && !completeCheckout.isPending) setConfirmCheckoutOpen(false)
        }}
        title="Hoàn tất trả phòng"
        message={`Xác nhận hoàn tất trả phòng cho ${shown?.customerName || ''} (Hóa đơn #HG-${shown?.id || ''})? Phòng sẽ chuyển sang trạng thái Đang dọn dẹp.`}
        confirmLabel="Hoàn tất trả phòng"
        tone="gold"
        pending={completeCheckout.isPending}
        onConfirm={() => {
          if (shown) completeCheckout.mutate(shown.bookingId)
        }}
      />

      <Dialog
        open={printPreviewOpen && Boolean(shown)}
        onOpenChange={setPrintPreviewOpen}
        title={shown ? `Bản in & Lưu hóa đơn #HG-${shown.id}` : 'Hóa đơn'}
        description="Tải về tệp hóa đơn để lưu trữ hoặc mở trên trình duyệt để in / lưu PDF."
        size="md"
      >
        {shown && (
          <div className="ops-modal-body invoice-print-preview">
            <div className="invoice-print-sheet">
              <div className="invoice-print-head">
                <div>
                  <span className="section-kicker">HOÀNG GIA HOTEL</span>
                  <h4>Hóa đơn #HG-{shown.id}</h4>
                  <p>
                    Khách hàng: <strong>{shown.customerName}</strong> · Mã đơn:{' '}
                    <strong>{selectedBooking?.bookingCode || `#${shown.bookingId}`}</strong>
                  </p>
                </div>
                <span
                  className={`status-badge ${shown.status === 'PAID' ? 'green' : shown.status === 'ISSUED' ? 'blue' : 'gray'}`}
                >
                  {shown.status === 'PAID'
                    ? 'Đã thanh toán'
                    : shown.status === 'ISSUED'
                      ? 'Đã phát hành'
                      : 'Bản nháp'}
                </span>
              </div>

              <div className="invoice-print-meta">
                <div>
                  <span>PHÒNG</span>
                  <b>{selectedBooking?.roomNumbers?.length ? selectedBooking.roomNumbers.map((r) => `Phòng ${r}`).join(', ') : '—'}</b>
                </div>
                <div>
                  <span>NHẬN — TRẢ</span>
                  <b>
                    {selectedBooking ? `${date(selectedBooking.checkInDate)} → ${date(selectedBooking.checkOutDate)}` : '—'}
                  </b>
                </div>
                <div>
                  <span>CHECK-IN THỰC TẾ</span>
                  <b>{dateTime(selectedBooking?.checkedInAt)}</b>
                </div>
                <div>
                  <span>CHECK-OUT / THANH TOÁN</span>
                  <b>{dateTime(selectedBooking?.checkedOutAt || shown.paidAt)}</b>
                </div>
              </div>

              {shown.items?.length > 0 && (
                <div className="invoice-item-list">
                  {shown.items.map((item) => (
                    <div key={item.id}>
                      <span>
                        {localizeInvoiceItemDescription(item.description)}
                        <small>
                          {item.quantity} × {money(item.unitPrice)}
                        </small>
                      </span>
                      <b>{money(item.lineTotal)}</b>
                    </div>
                  ))}
                </div>
              )}

              <div className="invoice-lines">
                <div>
                  <span>Tiền phòng</span>
                  <b>{money(shown.roomAmount)}</b>
                </div>
                <div>
                  <span>Dịch vụ</span>
                  <b>{money(shown.serviceAmount)}</b>
                </div>
                <div>
                  <span>Thuế VAT</span>
                  <b>{money(shown.tax)}</b>
                </div>
                {shown.surcharge > 0 && (
                  <div>
                    <span>Phụ thu</span>
                    <b>{money(shown.surcharge)}</b>
                  </div>
                )}
                {shown.discount > 0 && (
                  <div>
                    <span>Giảm giá</span>
                    <b>−{money(shown.discount)}</b>
                  </div>
                )}
              </div>

              <div className="invoice-grand">
                <span>Tổng thanh toán</span>
                <b>{money(shown.totalAmount)}</b>
              </div>
              <div className="invoice-balance">
                <span>
                  Đã thanh toán <b>{money(shown.successfulPayments)}</b>
                </span>
                <span>
                  Còn lại <b>{money(shown.balanceDue)}</b>
                </span>
              </div>
            </div>

            <div className="ops-modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => {
                  const res = tryNativePrint()
                  if (res.threw || res.inIframe) {
                    toast.info(
                      'Nếu trình duyệt nhúng chặn hộp thoại in tự động, hãy nhấn Ctrl+P hoặc dùng nút "Tải hóa đơn (.html)".',
                    )
                  }
                }}
              >
                <Printer size={15} /> In trực tiếp
              </button>
              <button
                type="button"
                className="button button-dark"
                onClick={() => {
                  downloadPrintableInvoice(shown, selectedBooking)
                  toast.success('Đã tải tệp hóa đơn. Mở tệp trên trình duyệt để in hoặc lưu PDF.')
                }}
              >
                <Download size={15} /> Tải hóa đơn (.html)
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
