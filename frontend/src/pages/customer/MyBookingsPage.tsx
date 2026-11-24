import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarDays, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking } from '../../lib/types'
import { ConfirmDialog, EmptyState, ErrorState, LoadingSkeleton, PageHeader, StatusBadge } from '../../components/shared'
import { bookingStatusLabel, bookingStatusTone, fmtDate, money } from './customer-helpers'

type CancellationPreview = {
  depositPaid: number
  refundRate: number
  refundAmount: number
}

type BookingSort = 'NEWEST' | 'CHECKIN_ASC' | 'TOTAL_DESC' | 'TOTAL_ASC'

const STATUS_TABS = [
  ['ALL', 'Tất cả'],
  ['UPCOMING', 'Sắp tới'],
  ['STAYING', 'Đang lưu trú'],
  ['COMPLETED', 'Đã hoàn thành'],
  ['CANCELLED', 'Đã hủy'],
] as const

function matchesTabFilter(status: string, filter: string) {
  if (filter === 'ALL') return true
  if (status === filter) return true
  if (filter === 'UPCOMING') {
    return ['PENDING_DEPOSIT', 'PENDING_VERIFICATION', 'PENDING', 'CONFIRMED'].includes(status)
  }
  if (filter === 'STAYING') return status === 'CHECKED_IN'
  if (filter === 'COMPLETED') return ['CHECKED_OUT', 'COMPLETED'].includes(status)
  if (filter === 'CANCELLED') return ['CANCELLED', 'REJECTED', 'EXPIRED', 'NO_SHOW'].includes(status)
  return false
}

export function MyBookingsPage() {
  const [params, setParams] = useSearchParams()
  const focusId = params.get('booking')
  const filter = params.get('status') || 'ALL'
  const search = params.get('q') || ''
  const [sortBy, setSortBy] = useState<BookingSort>('NEWEST')
  const [pendingCancel, setPendingCancel] = useState<{
    booking: Booking
    preview: CancellationPreview
  } | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const bookings = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/bookings/me')),
  })

  const cancel = useMutation({
    mutationFn: (id: number) =>
      request(api.patch<ApiResponse<null>>(`/bookings/${id}/cancel`, { reason: 'Khách hàng yêu cầu hủy' })),
    onSuccess: async (_data, id) => {
      setPendingCancel(null)
      toast.success('Đã gửi yêu cầu hủy đặt phòng.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['booking', String(id)] }),
        queryClient.invalidateQueries({ queryKey: ['booking-refunds', id] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error, 'Không thể hủy đơn đặt phòng.')),
  })

  const openCancelDialog = async (booking: Booking) => {
    setLoadingPreviewId(booking.id)
    try {
      const preview = await request(
        api.get<ApiResponse<CancellationPreview>>(`/bookings/${booking.id}/cancellation-preview`),
      )
      setPendingCancel({
        booking,
        preview: {
          depositPaid: Number.isFinite(preview?.depositPaid) ? preview.depositPaid : 0,
          refundRate: Number.isFinite(preview?.refundRate) ? preview.refundRate : 0,
          refundAmount: Number.isFinite(preview?.refundAmount) ? preview.refundAmount : 0,
        },
      })
    } catch (error) {
      toast.error(errorMessage(error, 'Chưa thể xem chính sách hủy.'))
    } finally {
      setLoadingPreviewId(null)
    }
  }

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    const next = new URLSearchParams(params)
    next.delete('status')
    next.delete('q')
    setParams(next, { replace: true })
  }

  const allBookings = bookings.data || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = allBookings.filter((b) => {
      const matchesStatus = matchesTabFilter(b.status, filter)
      const haystack = `${b.bookingCode} ${b.roomNumbers?.join(' ') || ''} ${b.customerName || ''}`.toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'CHECKIN_ASC') return a.checkInDate.localeCompare(b.checkInDate)
      if (sortBy === 'TOTAL_DESC') return b.estimatedTotal - a.estimatedTotal
      if (sortBy === 'TOTAL_ASC') return a.estimatedTotal - b.estimatedTotal
      return b.id - a.id
    })
  }, [allBookings, filter, search, sortBy])

  const hasActiveFilters = filter !== 'ALL' || search.trim() !== ''

  return (
    <main className="hg-account-page">
      <div className="hg-container">
        <PageHeader
          kicker="HỒ SƠ CỦA BẠN"
          title="Những kỳ nghỉ đã chọn."
          detail="Theo dõi trạng thái thanh toán, lịch nhận phòng và chi tiết những lần lưu trú của bạn tại Hoàng Gia."
          action={
            <Link className="hg-btn hg-btn-primary" to="/rooms">
              Tìm phòng <ArrowRight size={16} aria-hidden="true" />
            </Link>
          }
        />

        <section className="hg-panel hg-account-toolbar" aria-label="Bộ lọc và tìm kiếm đơn đặt phòng">
          <div className="hg-account-toolbar-top">
            <div className="hg-status-tabs" role="group" aria-label="Lọc đơn đặt phòng">
              {STATUS_TABS.map(([value, label]) => {
                const count = bookings.data
                  ? allBookings.filter((item) => matchesTabFilter(item.status, value)).length
                  : null
                return (
                  <button
                    key={value}
                    type="button"
                    className={filter === value ? 'is-active' : ''}
                    aria-pressed={filter === value}
                    onClick={() => updateFilter('status', value === 'ALL' ? '' : value)}
                  >
                    <span>{label}</span>
                    {count !== null && <small>{count}</small>}
                  </button>
                )
              })}
            </div>

            <div className="hg-booking-count">
              <b>{bookings.isPending ? '…' : filtered.length}</b> đơn đặt phòng
            </div>
          </div>

          <div className="hg-mybooking-filters">
            <label className="hg-filter-input-box hg-mybooking-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="Tìm mã đặt phòng hoặc số phòng"
                placeholder="Tìm mã đặt phòng hoặc số phòng"
                value={search}
                onChange={(e) => updateFilter('q', e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="hg-clear-input-btn"
                  aria-label="Xóa từ khóa tìm kiếm"
                  onClick={() => updateFilter('q', '')}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </label>

            <label className="hg-mybooking-select-field">
              <span>TRẠNG THÁI</span>
              <select
                aria-label="Lọc theo trạng thái chi tiết"
                value={filter}
                onChange={(e) => updateFilter('status', e.target.value === 'ALL' ? '' : e.target.value)}
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(bookingStatusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} · {value}
                  </option>
                ))}
              </select>
            </label>

            <label className="hg-mybooking-select-field">
              <span>SẮP XẾP</span>
              <select
                aria-label="Sắp xếp đơn đặt phòng"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BookingSort)}
              >
                <option value="NEWEST">Mới nhất</option>
                <option value="CHECKIN_ASC">Ngày nhận phòng gần nhất</option>
                <option value="TOTAL_DESC">Tổng tiền cao đến thấp</option>
                <option value="TOTAL_ASC">Tổng tiền thấp đến cao</option>
              </select>
            </label>
          </div>
        </section>

        {bookings.isPending ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : bookings.isError ? (
          <ErrorState error={bookings.error} retry={() => void bookings.refetch()} />
        ) : filtered.length ? (
          <div className="hg-mybooking-list">
            {filtered.map((b) => {
              const canCancel = ['PENDING_DEPOSIT', 'PENDING_VERIFICATION', 'PENDING', 'CONFIRMED'].includes(b.status)
              const highlighted = String(b.id) === focusId
              return (
                <article
                  className={`hg-panel hg-mybooking-card ${highlighted ? 'is-highlighted' : ''}`.trim()}
                  key={b.id}
                >
                  <div className="hg-mybooking-head">
                    <div className="hg-mybooking-code-group">
                      <span className="hg-kicker">MÃ ĐẶT PHÒNG</span>
                      <b className="hg-mono">{b.bookingCode}</b>
                    </div>
                    <StatusBadge
                      tone={bookingStatusTone[b.status] || 'gray'}
                      label={bookingStatusLabel[b.status] || b.status}
                    />
                  </div>

                  <div className="hg-mybooking-grid">
                    <div className="hg-mybooking-cell">
                      <span>THỜI GIAN LƯU TRÚ</span>
                      <b>
                        <CalendarDays size={14} aria-hidden="true" /> {fmtDate(b.checkInDate)} — {fmtDate(b.checkOutDate)}
                      </b>
                      <small>{b.numberOfNights} đêm</small>
                    </div>

                    <div className="hg-mybooking-cell">
                      <span>PHÒNG ĐÃ CHỌN</span>
                      <b>
                        <BedDouble size={14} aria-hidden="true" />{' '}
                        {b.roomNumbers?.map((n) => `Phòng ${n}`).join(', ') || '—'}
                      </b>
                      <small>{b.rooms?.length || b.roomNumbers?.length || 0} phòng</small>
                    </div>

                    <div className="hg-mybooking-cell is-total">
                      <span>TỔNG TIỀN DỰ KIẾN</span>
                      <b className="hg-mybooking-total">{money(b.estimatedTotal)}</b>
                      <small>
                        {typeof b.depositAmount === 'number' && b.depositAmount > 0
                          ? `Tiền cọc: ${money(b.depositAmount)}`
                          : 'Giá tham khảo từ hệ thống'}
                      </small>
                    </div>
                  </div>

                  {(b.cancellationReason || b.rejectionReason) && (
                    <div className="hg-mybooking-notes">
                      {b.cancellationReason && <p className="hg-reason-line">Lý do hủy: {b.cancellationReason}</p>}
                      {b.rejectionReason && <p className="hg-reason-line">Lý do từ chối: {b.rejectionReason}</p>}
                    </div>
                  )}

                  <div className="hg-mybooking-actions">
                    <Link to={`/my-bookings/${b.id}`} className="hg-btn hg-btn-primary">
                      Xem chi tiết <ArrowRight size={15} aria-hidden="true" />
                    </Link>

                    {canCancel ? (
                      <button
                        type="button"
                        className="hg-btn hg-btn-outline hg-cancel-booking-btn"
                        disabled={cancel.isPending || loadingPreviewId === b.id}
                        onClick={() => void openCancelDialog(b)}
                      >
                        {loadingPreviewId === b.id ? 'Đang kiểm tra…' : 'Hủy đặt phòng'}
                      </button>
                    ) : (
                      <span className="hg-mybooking-hint">
                        {b.status === 'CHECKED_IN'
                          ? 'Chúc bạn có kỳ nghỉ vui vẻ.'
                          : 'Cảm ơn bạn đã chọn HOÀNG GIA.'}
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title={allBookings.length ? 'Không có đơn phù hợp' : 'Chưa có đặt phòng nào'}
            detail={
              allBookings.length
                ? 'Thử đổi từ khóa tìm kiếm hoặc trạng thái để xem các đơn đặt phòng khác.'
                : 'Không gian nghỉ dưỡng tiếp theo của bạn đang chờ được khám phá.'
            }
            action={
              hasActiveFilters && allBookings.length ? (
                <button type="button" className="hg-btn hg-btn-outline" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              ) : (
                <Link className="hg-btn hg-btn-primary" to="/rooms">
                  Khám phá phòng nghỉ <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )
            }
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null)
        }}
        title={pendingCancel ? `Xác nhận hủy đơn ${pendingCancel.booking.bookingCode}` : 'Xác nhận hủy đơn'}
        message={
          pendingCancel
            ? `Cọc đã thanh toán: ${money(pendingCancel.preview.depositPaid)}. Tỷ lệ hoàn dự kiến: ${Math.round(
                pendingCancel.preview.refundRate * 100,
              )}%. Số tiền dự kiến hoàn: ${money(pendingCancel.preview.refundAmount)}. Bạn có chắc chắn muốn gửi yêu cầu hủy đơn này?`
            : ''
        }
        confirmLabel="Xác nhận hủy đơn"
        cancelLabel="Giữ lại đơn"
        tone="danger"
        pending={cancel.isPending}
        onConfirm={() => {
          if (pendingCancel) cancel.mutate(pendingCancel.booking.id)
        }}
      />
    </main>
  )
}
