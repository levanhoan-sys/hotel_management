import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking } from '../../lib/types'
import {
  ErrorPanel,
  LoadingRows,
  Modal,
  PageTitle,
  bookingNames,
  date,
  money,
  statusTone,
  useFourRowTableScroll,
  useInvalidate,
  useOpsData,
} from './reception-helpers'

export function BookingsManagement() {
  const { bookings, customers, rooms } = useOpsData()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlSearch = searchParams.get('search') || ''
  const [search, setSearch] = useState(urlSearch)
  const [status, setStatus] = useState('')
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [walkIn, setWalkIn] = useState({ customerId: '', checkInDate: '', checkOutDate: '', roomIds: [] as number[] })
  const [confirmAction, setConfirmAction] = useState<{
    booking: Booking
    action: 'cancel' | 'reject'
    reason: string
  } | null>(null)
  const invalidate = useInvalidate()

  const verifyDeposit = useMutation({
    mutationFn: async (b: Booking) => {
      if (b.status === 'PENDING_DEPOSIT') {
        await request(api.post<ApiResponse<unknown>>(`/bookings/${b.id}/deposit/report`))
      }
      return b.id
    },
    onSuccess: async (bookingId) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['reception-deposits'] }), invalidate()])
      navigate(`/reception/deposits?bookingId=${bookingId}`)
    },
    onError: async (e) => {
      toast.error(errorMessage(e))
      await invalidate()
    },
  })

  useEffect(() => {
    if (urlSearch) setSearch(urlSearch)
  }, [urlSearch])

  const mutation = useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: 'confirm' | 'reject' | 'cancel'; reason?: string }) =>
      request(
        api.patch<ApiResponse<Booking>>(
          `/reception/bookings/${id}/${action}`,
          action === 'reject' || action === 'cancel'
            ? {
                reason:
                  reason?.trim() ||
                  (action === 'reject' ? 'Không thể xác nhận ở thời điểm hiện tại' : 'Hủy bởi lễ tân'),
              }
            : undefined,
        ),
      ),
    onSuccess: async (_, vars) => {
      toast.success(
        vars.action === 'cancel'
          ? 'Đã hủy đặt phòng và mở lại phòng trống'
          : vars.action === 'reject'
            ? 'Đã từ chối yêu cầu đặt phòng'
            : 'Đã xác nhận đặt phòng',
      )
      setConfirmAction(null)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const createWalkIn = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<Booking>>('/reception/bookings', {
          customerId: Number(walkIn.customerId),
          checkInDate: walkIn.checkInDate,
          checkOutDate: walkIn.checkOutDate,
          roomIds: walkIn.roomIds,
          pricingType: 'STANDARD',
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã tạo đặt phòng tại quầy')
      setWalkInOpen(false)
      setWalkIn({ customerId: '', checkInDate: '', checkOutDate: '', roomIds: [] })
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allBookings = bookings.data || []
  const bookingTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['PENDING', 'Chờ xác nhận'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['CHECKED_IN', 'Đang lưu trú'],
    ['COMPLETED', 'Hoàn tất'],
    ['CANCELLED', 'Đã hủy'],
  ]

  const filtered = allBookings.filter((b) => {
    const matchesStatus = !status || b.status === status
    const q = search.trim().toLowerCase()
    const matchesQuery =
      !q || `${b.bookingCode} ${b.customerName} ${b.roomNumbers?.join(' ')}`.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const hasBookingFilters = Boolean(search.trim() || status)
  const bookingTableScrollRef = useFourRowTableScroll(filtered.length)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="YÊU CẦU LƯU TRÚ"
        title="Đặt phòng"
        detail="Quản lý yêu cầu và cập nhật trạng thái đặt phòng"
        action={
          <button className="button button-dark" onClick={() => setWalkInOpen(true)}>
            <Plus size={15} /> Tạo tại quầy
          </button>
        }
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm đơn đặt phòng">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc nhanh trạng thái đặt phòng">
                {bookingTabs.map(([value, label]) => (
                  <button
                    key={value || 'ALL'}
                    type="button"
                    className={status === value ? 'is-active' : ''}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="ops-result-count">
                <b>{filtered.length}</b> đặt phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm mã đặt phòng, tên khách hoặc số phòng"
                  placeholder="Tìm mã đặt phòng, tên khách, số phòng…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="ops-clear-btn"
                    aria-label="Xóa từ khóa tìm kiếm"
                    onClick={() => setSearch('')}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>

              <label className="ops-select-box">
                <span>TRẠNG THÁI</span>
                <select aria-label="Lọc theo trạng thái đặt phòng" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(bookingNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              {hasBookingFilters && (
                <button
                  type="button"
                  className="ops-reset-btn"
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </section>

          <section className="panel table-panel">
            <div ref={bookingTableScrollRef} className="table-scroll table-scroll-4">
              <table>
                <thead>
                  <tr>
                    <th>MÃ ĐƠN / KHÁCH</th>
                    <th>THỜI GIAN</th>
                    <th>PHÒNG</th>
                    <th>TỔNG TIỀN</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const totalGuests = b.rooms?.reduce((sum, r) => sum + (r.guestCount || 0), 0) || 0
                    const totalChargeSummary = [
                      b.depositAmount ? `Cọc: ${money(b.depositAmount)}` : '',
                      b.totalServiceCharge > 0 ? `DV: ${money(b.totalServiceCharge)}` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <tr key={b.id}>
                        <td>
                          <b className="booking-code">{b.bookingCode}</b>
                          <small className="cell-sub">{b.customerName}</small>
                        </td>
                        <td>
                          {date(b.checkInDate)}
                          <small className="cell-sub">
                            đến {date(b.checkOutDate)}
                            {b.numberOfNights > 0 ? ` (${b.numberOfNights} đêm)` : ''}
                          </small>
                        </td>
                        <td>
                          {b.roomNumbers?.map((n) => `#${n}`).join(', ') || '—'}
                          <small className="cell-sub">
                            {b.rooms?.length || 0} phòng{totalGuests > 0 ? ` · ${totalGuests} khách` : ''}
                          </small>
                        </td>
                        <td>
                          <b>{money(b.estimatedTotal)}</b>
                          {totalChargeSummary && <small className="cell-sub">{totalChargeSummary}</small>}
                        </td>
                        <td>
                          <span className={`status-badge ${statusTone(b.status)}`}>
                            {bookingNames[b.status] || b.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions-inline">
                            {b.status === 'PENDING' && (
                              <>
                                <button
                                  className="icon-action success"
                                  title="Xác nhận"
                                  disabled={mutation.isPending}
                                  onClick={() => mutation.mutate({ id: b.id, action: 'confirm' })}
                                >
                                  <Check size={15} />
                                </button>
                                <button
                                  className="icon-action danger"
                                  title="Từ chối"
                                  disabled={mutation.isPending}
                                  onClick={() => setConfirmAction({ booking: b, action: 'reject', reason: '' })}
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                            {b.status === 'PENDING_DEPOSIT' && (
                              <>
                                <button
                                  type="button"
                                  className="table-action"
                                  disabled={verifyDeposit.isPending || mutation.isPending}
                                  onClick={() => verifyDeposit.mutate(b)}
                                >
                                  Xác minh cọc
                                </button>
                                <button
                                  type="button"
                                  className="table-action danger-outline"
                                  disabled={mutation.isPending || verifyDeposit.isPending}
                                  onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                                >
                                  <X size={14} /> Hủy
                                </button>
                              </>
                            )}
                            {b.status === 'PENDING_VERIFICATION' && (
                              <>
                                <Link className="table-action" to={`/reception/deposits?bookingId=${b.id}`}>
                                  Xác minh cọc
                                </Link>
                                <button
                                  type="button"
                                  className="table-action danger-outline"
                                  disabled={mutation.isPending}
                                  onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                                >
                                  <X size={14} /> Hủy
                                </button>
                              </>
                            )}
                            {b.status === 'CONFIRMED' && (
                              <button
                                type="button"
                                className="table-action danger-outline"
                                disabled={mutation.isPending}
                                onClick={() => setConfirmAction({ booking: b, action: 'cancel', reason: '' })}
                              >
                                <X size={14} /> Hủy
                              </button>
                            )}
                            {!['PENDING', 'CONFIRMED', 'PENDING_DEPOSIT', 'PENDING_VERIFICATION'].includes(b.status) && (
                              <span className="muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty-table">Không có đặt phòng phù hợp</div>}
            </div>
          </section>
        </>
      )}

      {confirmAction && (
        <Modal
          title={
            confirmAction.action === 'cancel'
              ? `Hủy đặt phòng ${confirmAction.booking.bookingCode}`
              : `Từ chối yêu cầu ${confirmAction.booking.bookingCode}`
          }
          close={() => setConfirmAction(null)}
        >
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.mutate({
                id: confirmAction.booking.id,
                action: confirmAction.action,
                reason: confirmAction.reason,
              })
            }}
          >
            <div className="ops-confirm-summary">
              <div>
                <span>Khách hàng</span>
                <b>{confirmAction.booking.customerName}</b>
              </div>
              <div>
                <span>Thời gian</span>
                <b>
                  {date(confirmAction.booking.checkInDate)} đến {date(confirmAction.booking.checkOutDate)}
                </b>
              </div>
              <div>
                <span>Phòng giữ chỗ</span>
                <b>{confirmAction.booking.roomNumbers?.map((n) => `#${n}`).join(', ') || '—'}</b>
              </div>
              <div>
                <span>Tổng tiền ước tính</span>
                <b>{money(confirmAction.booking.estimatedTotal)}</b>
              </div>
            </div>

            <p className="inline-warning">
              <CircleAlert size={15} />
              {confirmAction.action === 'cancel'
                ? 'Đơn đã xác nhận nhưng chưa nhận phòng có thể được lễ tân hủy khi khách đổi kế hoạch. Thao tác này sẽ chuyển đơn sang Đã hủy và giải phóng phòng để khách khác đặt.'
                : 'Yêu cầu đặt phòng sẽ chuyển sang trạng thái Từ chối và giải phóng phòng giữ chỗ.'}
            </p>

            <label className="form-field">
              <span>{confirmAction.action === 'cancel' ? 'Lý do hủy đơn (tùy chọn)' : 'Lý do từ chối (tùy chọn)'}</span>
              <textarea
                placeholder={
                  confirmAction.action === 'cancel'
                    ? 'Ví dụ: Khách liên hệ báo hủy lịch hoặc đổi ngày lưu trú…'
                    : 'Ví dụ: Phòng đang bảo trì đột xuất…'
                }
                value={confirmAction.reason}
                onChange={(e) => setConfirmAction({ ...confirmAction, reason: e.target.value })}
              />
            </label>

            <div className="ops-modal-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={mutation.isPending}
                onClick={() => setConfirmAction(null)}
              >
                Giữ lại
              </button>
              <button type="submit" className="button button-danger" disabled={mutation.isPending}>
                {mutation.isPending
                  ? 'Đang xử lý…'
                  : confirmAction.action === 'cancel'
                    ? 'Xác nhận hủy đơn'
                    : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {walkInOpen && (
        <Modal title="Tạo đặt phòng tại quầy" close={() => setWalkInOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!walkIn.customerId || !walkIn.checkInDate || walkIn.checkOutDate <= walkIn.checkInDate || !walkIn.roomIds.length) {
                return toast.error('Kiểm tra khách hàng, ngày lưu trú và ít nhất một phòng')
              }
              createWalkIn.mutate()
            }}
          >
            <label className="form-field">
              <span>Khách hàng</span>
              <select
                value={walkIn.customerId}
                onChange={(e) => setWalkIn({ ...walkIn, customerId: e.target.value })}
                required
              >
                <option value="">Chọn khách hàng</option>
                {customers.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.username})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Ngày nhận phòng</span>
              <input
                type="date"
                value={walkIn.checkInDate}
                onChange={(e) => setWalkIn({ ...walkIn, checkInDate: e.target.value })}
                required
              />
            </label>
            <label className="form-field">
              <span>Ngày trả phòng</span>
              <input
                type="date"
                min={walkIn.checkInDate}
                value={walkIn.checkOutDate}
                onChange={(e) => setWalkIn({ ...walkIn, checkOutDate: e.target.value })}
                required
              />
            </label>
            <fieldset className="room-choice-list">
              <legend>Chọn phòng</legend>
              {rooms.data
                ?.filter((r) => r.operational && r.status === 'AVAILABLE')
                .map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      checked={walkIn.roomIds.includes(r.id)}
                      onChange={(e) =>
                        setWalkIn({
                          ...walkIn,
                          roomIds: e.target.checked
                            ? [...walkIn.roomIds, r.id]
                            : walkIn.roomIds.filter((id) => id !== r.id),
                        })
                      }
                    />
                    <span>
                      Phòng {r.roomNumber} — {r.roomTypeName}
                    </span>
                    <b>{money(r.basePrice)}/đêm</b>
                  </label>
                ))}
            </fieldset>
            <button
              className="button button-dark full-button"
              disabled={createWalkIn.isPending || customers.isPending || rooms.isPending}
            >
              {createWalkIn.isPending ? 'Đang tạo…' : 'Tạo đặt phòng'} <Check size={15} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
