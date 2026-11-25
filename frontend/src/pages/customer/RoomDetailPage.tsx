import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, Check, ChevronRight, MapPin, Minus, Plus, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api, request } from '../../lib/api'
import type { ApiResponse, Room, RoomDay } from '../../lib/types'
import { calculateNights } from '../../lib/booking-utils'
import { ErrorState, LoadingSkeleton } from '../../components/shared'
import {
  cleanRoomCopy,
  dateInput,
  fmtDate,
  money,
  roomDescription,
  RoomGallery,
  RoomRecommendationSection,
} from './customer-helpers'

function RoomCalendar({ roomId, guests }: { roomId: number; guests: number }) {
  const nav = useNavigate()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const from = dateInput(month)
  const to = dateInput(new Date(month.getFullYear(), month.getMonth() + 2, 0))

  const days = useQuery({
    queryKey: ['room-calendar', roomId, from],
    queryFn: () => request(api.get<ApiResponse<RoomDay[]>>(`/rooms/${roomId}/calendar`, { params: { from, to } })),
  })

  const labels: Record<RoomDay['status'], string> = {
    AVAILABLE: 'Còn trống',
    BOOKED: 'Đã đặt',
    BLOCKED: 'Tạm khóa',
    UNAVAILABLE: 'Không phục vụ',
  }

  const chooseDay = (day: RoomDay) => {
    if (guests < 1) return
    if (day.date < dateInput(new Date())) return
    if (!checkIn || checkOut || day.date <= checkIn) {
      if (day.status !== 'AVAILABLE') return
      setCheckIn(day.date)
      setCheckOut('')
      return
    }
    const stay = days.data?.filter((d) => d.date >= checkIn && d.date < day.date) || []
    if (stay.length !== calculateNights(checkIn, day.date) || stay.some((d) => d.status !== 'AVAILABLE')) {
      toast.error('Khoảng ngày này có ngày đã được đặt hoặc tạm khóa. Vui lòng chọn lại.')
      return
    }
    setCheckOut(day.date)
  }

  const changeMonth = (offset: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + offset, 1))
    setCheckIn('')
    setCheckOut('')
  }

  const renderMonth = (value: Date) => {
    const prefix = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
    return (
      <div className="hg-calendar-month" key={prefix}>
        <h3>
          Tháng {value.getMonth() + 1}/{value.getFullYear()}
        </h3>
        <div className="hg-calendar-grid">
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label) => (
            <b className="hg-calendar-weekday" key={label}>
              {label}
            </b>
          ))}
          {Array.from({ length: (value.getDay() + 6) % 7 }, (_, i) => (
            <span key={`blank-${i}`} />
          ))}
          {days.data
            ?.filter((d) => d.date.startsWith(prefix))
            .map((day) => {
              const past = day.date < dateInput(new Date())
              const selectable =
                guests > 0 &&
                !past &&
                (day.status === 'AVAILABLE' || Boolean(checkIn && !checkOut && day.date > checkIn))
              const selected = guests > 0 && (day.date === checkIn || day.date === checkOut)
              const inRange = guests > 0 && Boolean(checkIn && checkOut && day.date > checkIn && day.date < checkOut)
              return (
                <button
                  type="button"
                  disabled={!selectable}
                  onClick={() => chooseDay(day)}
                  className={`hg-calendar-day ${day.status.toLowerCase()} ${selected ? 'selected' : ''} ${
                    inRange ? 'in-range' : ''
                  }`}
                  title={`${fmtDate(day.date)} — ${labels[day.status]}`}
                  aria-label={`${fmtDate(day.date)}, ${labels[day.status]}`}
                  key={day.date}
                >
                  <b>{Number(day.date.slice(-2))}</b>
                  <small>{labels[day.status]}</small>
                </button>
              )
            })}
        </div>
      </div>
    )
  }

  return (
    <section className="hg-calendar-card" id="room-calendar">
      <div className="hg-calendar-head">
        <div>
          <span className="hg-kicker">LỊCH PHÒNG &amp; ĐẶT PHÒNG</span>
          <h2>Chọn ngày lưu trú</h2>
          <p>Chọn ngày nhận phòng, sau đó chọn ngày trả phòng. Ngày trả phòng có thể là ngày bắt đầu một đơn khác.</p>
        </div>
        <div className="hg-calendar-nav">
          <button type="button" aria-label="Tháng trước" onClick={() => changeMonth(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Tháng sau" onClick={() => changeMonth(1)}>
            ›
          </button>
        </div>
      </div>

      {days.isPending ? (
        <LoadingSkeleton variant="rows" count={3} />
      ) : days.isError ? (
        <ErrorState error={days.error} retry={() => void days.refetch()} />
      ) : (
        <div className="hg-calendar-months">
          {renderMonth(month)}
          {renderMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
        </div>
      )}

      <div className="hg-calendar-legend">
        {Object.entries(labels).map(([status, label]) => (
          <span key={status} className={status.toLowerCase()}>
            <i aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      <div className="hg-calendar-footer">
        {guests < 1 ? (
          <p className="hg-calendar-zero-note">Vui lòng chọn ít nhất 1 khách để chọn ngày đặt phòng</p>
        ) : (
          <>
            <div className="hg-calendar-summary">
              <span>
                Ngày nhận: <b>{checkIn ? fmtDate(checkIn) : 'Chưa chọn'}</b>
              </span>
              <span>
                Ngày trả: <b>{checkOut ? fmtDate(checkOut) : 'Chưa chọn'}</b>
              </span>
              {checkIn && checkOut && (
                <strong className="hg-calendar-stay-meta">
                  <span>{calculateNights(checkIn, checkOut)} đêm</span>
                  <span>{guests} khách</span>
                </strong>
              )}
            </div>
            <button
              type="button"
              className="hg-btn hg-btn-gold"
              disabled={!checkIn || !checkOut}
              onClick={() => nav(`/booking?roomIds=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`)}
            >
              Tiếp tục đặt phòng <ArrowRight size={17} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </section>
  )
}

export function RoomDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const checkIn = searchParams.get('checkIn') || undefined
  const checkOut = searchParams.get('checkOut') || undefined
  const requestedGuestsParam = searchParams.get('guests')
  const requestedGuests = requestedGuestsParam !== null ? Number(requestedGuestsParam) : 1
  const room = useQuery({
    queryKey: ['room', id],
    queryFn: () => request(api.get<ApiResponse<Room>>(`/rooms/${id}`)),
    enabled: Boolean(id),
  })
  const [guests, setGuests] = useState(() => (Number.isFinite(requestedGuests) ? Math.max(0, requestedGuests) : 1))

  if (room.isPending) {
    return (
      <main className="hg-detail-page">
        <div className="hg-container">
          <LoadingSkeleton variant="cards" count={2} />
        </div>
      </main>
    )
  }

  if (room.isError) {
    return (
      <main className="hg-detail-page">
        <div className="hg-container">
          <ErrorState error={room.error} retry={() => void room.refetch()} />
        </div>
      </main>
    )
  }

  const r = room.data
  const activeGuests = Math.max(0, Math.min(guests, r.capacity))
  const amenities =
    r.amenities
      ?.split(',')
      .map((item) => cleanRoomCopy(item.trim()))
      .filter(Boolean) || []

  return (
    <main className="hg-detail-page">
      <div className="hg-container">
        <div className="hg-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <Link to="/rooms">Phòng nghỉ</Link>
          <ChevronRight size={14} aria-hidden="true" />
          <span>{r.roomTypeName}</span>
        </div>

        <div className="hg-detail-layout">
          <div>
            <RoomGallery room={r} />
            <div className="hg-detail-intro">
              <span className="hg-kicker">KHÔNG GIAN RIÊNG CỦA BẠN</span>
              <h1 className="hg-serif-em">
                {r.roomTypeName}
                <br />
                <em>mang hơi thở an yên</em>
              </h1>
              <p>{roomDescription(r.description)}</p>
              <div className="hg-detail-perks">
                <span>
                  <Users size={16} aria-hidden="true" /> Tối đa {r.capacity} khách
                </span>
                <span>
                  <BedDouble size={16} aria-hidden="true" /> Phòng {r.roomNumber}
                </span>
                <span>
                  <MapPin size={16} aria-hidden="true" /> Tầng {r.floor}
                </span>
              </div>
            </div>
          </div>

          <aside className="hg-booking-aside">
            <span className="hg-kicker">MÃ PHÒNG {r.roomNumber}</span>
            <div className="hg-aside-price">
              <b>{money(r.basePrice)}</b>
              <span>/ đêm</span>
            </div>
            <p className="hg-aside-hint">Giá tham khảo theo biểu phí hiện tại của khách sạn.</p>

            <div className="hg-guest-stepper">
              <span>Số khách</span>
              <div className="hg-stepper-controls">
                <button
                  type="button"
                  aria-label="Bớt khách"
                  disabled={activeGuests <= 0}
                  onClick={() => setGuests(Math.max(0, activeGuests - 1))}
                >
                  <Minus size={14} />
                </button>
                <b>{activeGuests}</b>
                <button
                  type="button"
                  aria-label="Thêm khách"
                  disabled={activeGuests >= r.capacity}
                  onClick={() => setGuests(Math.min(r.capacity, activeGuests + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {activeGuests > 0 ? (
              <a className="hg-btn hg-btn-gold full-button" href="#room-calendar">
                Chọn ngày trên lịch <ArrowRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <p className="hg-aside-zero-note">Vui lòng chọn ít nhất 1 khách để đặt phòng</p>
            )}

            <p className="hg-aside-trust">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Yêu cầu của bạn sẽ được khách sạn kiểm tra và xác nhận.</span>
            </p>
          </aside>
        </div>

        <section className="hg-facts-grid">
          <div className="hg-fact-card">
            <span className="hg-kicker">THÔNG TIN PHÒNG</span>
            <h2>Không gian &amp; tiện nghi</h2>
            <div className="hg-fact-list">
              <p>
                <span>Giá mỗi đêm</span>
                <strong>{money(r.basePrice)}</strong>
              </p>
              <p>
                <span>Sức chứa</span>
                <strong>Tối đa {r.capacity} khách</strong>
              </p>
              <p>
                <span>Diện tích</span>
                <strong>{r.areaSqm ? `${r.areaSqm} m²` : 'Đang cập nhật'}</strong>
              </p>
            </div>
            <div className="hg-amenity-grid">
              {amenities.length ? (
                amenities.map((item) => (
                  <span className="hg-amenity-item" key={item}>
                    <Check size={15} aria-hidden="true" /> {item}
                  </span>
                ))
              ) : (
                <span className="hg-amenity-item">Tiện nghi đang được cập nhật.</span>
              )}
            </div>
          </div>

          <div className="hg-fact-card">
            <span className="hg-kicker">DỊCH VỤ THEO PHÒNG</span>
            <h2>Dịch vụ có thể sử dụng</h2>
            {r.services?.length ? (
              <div className="hg-room-services">
                {r.services.map((service) => (
                  <div className="hg-room-service-item" key={service.id}>
                    <b>{service.name}</b>
                    <span>
                      {service.unitPrice === 0 ? 'Miễn phí' : money(service.unitPrice)}
                      {service.unit ? ` / ${service.unit}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hg-aside-hint">Hiện chưa có dịch vụ riêng cho phòng này.</p>
            )}
          </div>
        </section>

        <RoomCalendar roomId={r.id} guests={activeGuests} />

        <RoomRecommendationSection
          referenceRoomId={r.id}
          checkIn={checkIn}
          checkOut={checkOut}
          guests={requestedGuests}
        />

        <section className="hg-detail-foot">
          <h2 className="hg-serif-em">
            Một kỳ nghỉ <em>đúng nghĩa</em>
          </h2>
          <Link to="/rooms" className="hg-editorial-link">
            Khám phá thêm phòng <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>
  )
}
