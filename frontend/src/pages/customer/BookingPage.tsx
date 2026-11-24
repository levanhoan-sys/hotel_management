import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleAlert, ShieldCheck, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import type { ApiResponse, Booking, Room } from '../../lib/types'
import { calculateNights, uniqueRoomIds, validStay } from '../../lib/booking-utils'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/shared'
import { dateInput, fmtDate, money, RoomImage, RoomRecommendationSection } from './customer-helpers'

function BookingProgress({ confirmed = false }: { confirmed?: boolean }) {
  const steps = ['Chọn phòng', 'Thông tin khách', 'Xem lại', 'Xác nhận']
  return (
    <ol className="hg-booking-progress" aria-label="Các bước đặt phòng">
      {steps.map((step, index) => (
        <li key={step} className={confirmed || index < 3 ? 'is-complete' : 'is-upcoming'}>
          <span aria-hidden="true">
            {confirmed ? <Check size={14} /> : String(index + 1).padStart(2, '0')}
          </span>
          <b>{step}</b>
        </li>
      ))}
    </ol>
  )
}

export function BookingPage() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const ids = uniqueRoomIds(params.get('roomIds'))
  const checkIn = params.get('checkIn') || ''
  const checkOut = params.get('checkOut') || ''
  const guests = Number(params.get('guests') || 1)

  const rooms = useQuery({
    queryKey: ['booking-rooms', ids],
    queryFn: async () => Promise.all(ids.map((id) => request(api.get<ApiResponse<Room>>(`/rooms/${id}`)))),
    enabled: ids.length > 0,
  })

  const nav = useNavigate()
  const queryClient = useQueryClient()
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [bookingFailed, setBookingFailed] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<Booking>>('/bookings', {
          checkInDate: checkIn,
          checkOutDate: checkOut,
          roomIds: ids,
          guestCounts: Object.fromEntries(
            (rooms.data || []).map((r) => [r.id, Math.min(r.capacity, counts[r.id] || Math.min(guests, r.capacity))]),
          ),
          pricingType: 'STANDARD',
        }),
      ),
    onSuccess: async (b) => {
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      toast.success('Đã giữ phòng 15 phút. Vui lòng thanh toán cọc.')
      nav(`/my-bookings/${b.id}`)
    },
    onError: (e) => {
      setBookingFailed(true)
      toast.error(errorMessage(e, 'Không thể tạo đặt phòng. Hãy kiểm tra lại tình trạng phòng.'))
    },
  })

  const nights = calculateNights(checkIn, checkOut)
  const total = (rooms.data || []).reduce((sum, r) => sum + r.basePrice * nights, 0)
  const dateValid = validStay(checkIn, checkOut, dateInput(new Date()))

  const removeRoom = (id: number) => {
    const next = ids.filter((roomId) => roomId !== id)
    const updated = new URLSearchParams(params)
    if (next.length) updated.set('roomIds', next.join(','))
    else updated.delete('roomIds')
    setParams(updated)
  }

  return (
    <main className="hg-booking-page">
      <section className="hg-page-banner">
        <div className="hg-container hg-page-banner-inner">
          <div className="hg-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to="/rooms">Phòng nghỉ</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span>Thông tin đặt phòng</span>
          </div>
          <span className="hg-kicker">BƯỚC CUỐI TRƯỚC KỲ NGHỈ</span>
          <h1 className="hg-serif-em">
            Xác nhận <em>lựa chọn.</em>
          </h1>
          <p>Kiểm tra ngày lưu trú, số khách từng phòng và thông tin liên hệ trước khi gửi yêu cầu.</p>
        </div>
      </section>

      <div className="hg-container hg-booking-shell">
        <BookingProgress />

        {rooms.isPending && ids.length > 0 ? (
          <LoadingSkeleton variant="cards" count={2} />
        ) : rooms.isError ? (
          <ErrorState error={rooms.error} retry={() => void rooms.refetch()} />
        ) : ids.length === 0 ? (
          <EmptyState
            title="Bạn chưa chọn phòng"
            detail="Chọn một hoặc nhiều phòng để xem lại thông tin đặt phòng."
            action={
              <Link className="hg-btn hg-btn-gold" to="/rooms">
                Khám phá phòng nghỉ <ArrowRight size={16} aria-hidden="true" />
              </Link>
            }
          />
        ) : (
          <div className="hg-booking-layout">
            <section className="hg-booking-main">
              <div className="hg-panel hg-booking-section">
                <div className="hg-section-num-head">
                  <span className="hg-step-num">01</span>
                  <div>
                    <h2>Chi tiết lưu trú</h2>
                    <p>Vui lòng xác nhận ngày nhận phòng và ngày trả phòng của bạn.</p>
                  </div>
                </div>

                <div className="hg-date-summary">
                  <div>
                    <span>NHẬN PHÒNG</span>
                    <b>{checkIn ? fmtDate(checkIn) : 'Chưa chọn'}</b>
                  </div>
                  <ArrowRight size={17} aria-hidden="true" />
                  <div>
                    <span>TRẢ PHÒNG</span>
                    <b>{checkOut ? fmtDate(checkOut) : 'Chưa chọn'}</b>
                  </div>
                  <div>
                    <span>THỜI GIAN</span>
                    <b>{nights} đêm</b>
                  </div>
                </div>

                {!dateValid && (
                  <div className="hg-inline-alert" role="alert">
                    <CircleAlert size={17} aria-hidden="true" />
                    <span>Ngày lưu trú chưa hợp lệ. Vui lòng quay lại tìm phòng và chọn ngày phù hợp.</span>
                  </div>
                )}
              </div>

              <div className="hg-panel hg-booking-section">
                <div className="hg-section-num-head">
                  <span className="hg-step-num">02</span>
                  <div>
                    <h2>
                      Phòng đã chọn <small>({rooms.data?.length || 0})</small>
                    </h2>
                    <p>Kiểm tra sức chứa, chọn số khách phù hợp và xem đơn giá mỗi đêm.</p>
                  </div>
                </div>

                <div className="hg-selected-room-list">
                  {rooms.data?.map((r) => {
                    const selectedGuests = counts[r.id] || Math.min(guests, r.capacity)
                    return (
                      <div className="hg-selected-room" key={r.id}>
                        <div className="hg-selected-room-thumb">
                          <RoomImage room={r} />
                        </div>

                        <div className="hg-selected-room-copy">
                          <span className="hg-kicker">PHÒNG {r.roomNumber}</span>
                          <h3>{r.roomTypeName}</h3>
                          <p>
                            <Users size={14} aria-hidden="true" /> Tối đa {r.capacity} khách · Tầng {r.floor}
                          </p>
                          <label className="hg-guest-select-inline">
                            <span>Số khách</span>
                            <select
                              value={selectedGuests}
                              onChange={(e) => setCounts((c) => ({ ...c, [r.id]: Number(e.target.value) }))}
                            >
                              {Array.from({ length: r.capacity }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                  {n} khách
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="hg-selected-room-right">
                          <div className="hg-selected-room-price">
                            <b>{money(r.basePrice)}</b>
                            <small>/ đêm</small>
                          </div>
                          <button
                            type="button"
                            className="hg-remove-room-btn"
                            aria-label={`Bỏ phòng ${r.roomNumber}`}
                            onClick={() => removeRoom(r.id)}
                          >
                            <X size={15} aria-hidden="true" /> Bỏ phòng
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="hg-panel hg-booking-section">
                <div className="hg-section-num-head">
                  <span className="hg-step-num">03</span>
                  <div>
                    <h2>Thông tin khách</h2>
                    <p>Thông tin liên hệ dùng để tiếp nhận xác nhận và hướng dẫn nhận phòng.</p>
                  </div>
                </div>

                <div className="hg-guest-preview">
                  <div>
                    <span>HỌ VÀ TÊN</span>
                    <b>{profile?.fullName || 'Chưa cập nhật'}</b>
                  </div>
                  <div>
                    <span>EMAIL</span>
                    <b>{profile?.email || 'Chưa cập nhật'}</b>
                  </div>
                  <div>
                    <span>SỐ ĐIỆN THOẠI</span>
                    <b>{profile?.phone || 'Chưa cập nhật'}</b>
                  </div>
                </div>

                <div className="hg-guest-preview-foot">
                  <p>Bạn sẽ gửi yêu cầu đặt phòng trước khi chuyển sang bước thanh toán đặt cọc VietQR.</p>
                  <Link to="/profile" className="hg-editorial-link">
                    Cập nhật thông tin <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {bookingFailed && rooms.data && rooms.data.length > 0 && (
                <RoomRecommendationSection
                  referenceRoomId={rooms.data[0].id}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guests={guests}
                  roomQuantity={ids.length}
                  alternatives
                />
              )}
            </section>

            <aside className="hg-panel hg-booking-summary">
              <div className="hg-summary-head">
                <span className="hg-kicker">TÓM TẮT ĐẶT PHÒNG</span>
                <h3>Kỳ nghỉ của bạn</h3>
              </div>

              <div className="hg-summary-dates">
                <CalendarDays size={18} aria-hidden="true" />
                <div>
                  <b>
                    {checkIn ? fmtDate(checkIn) : 'Chưa chọn'} — {checkOut ? fmtDate(checkOut) : 'Chưa chọn'}
                  </b>
                  <span>
                    {nights} đêm · {rooms.data?.length || 0} phòng
                  </span>
                </div>
              </div>

              <div className="hg-summary-lines">
                {rooms.data?.map((r) => (
                  <div className="hg-summary-line" key={r.id}>
                    <span>
                      {r.roomTypeName} · P.{r.roomNumber}
                      <small>
                        {money(r.basePrice)} × {nights} đêm
                      </small>
                    </span>
                    <b>{money(r.basePrice * nights)}</b>
                  </div>
                ))}
              </div>

              <div className="hg-summary-total">
                <span>Tổng tiền phòng dự kiến</span>
                <b>{money(total)}</b>
              </div>

              <p className="hg-summary-note">
                Giá cuối cùng và mã VietQR đặt cọc sẽ được hệ thống tạo ngay sau khi gửi yêu cầu đặt phòng.
              </p>

              <button
                type="button"
                className="hg-btn hg-btn-gold full-button"
                disabled={
                  !dateValid ||
                  !ids.length ||
                  mutation.isPending ||
                  rooms.data?.some((r) => (counts[r.id] || Math.min(guests, r.capacity)) > r.capacity)
                }
                onClick={() => {
                  setBookingFailed(false)
                  mutation.mutate()
                }}
              >
                {mutation.isPending ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt phòng'}{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              <p className="hg-summary-trust">
                <ShieldCheck size={15} aria-hidden="true" />
                <span>Không thu tiền trực tiếp tại bước này.</span>
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
