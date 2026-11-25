import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Booking, Room } from '../../lib/types'
import {
  ErrorPanel,
  LoadingRows,
  PageTitle,
  bookingNames,
  date,
  dateValue,
  useOpsData,
  useSixRowCalendarScroll,
} from './reception-helpers'

function CalendarRoom({ room, days, bookings }: { room: Room; days: string[]; bookings: Booking[] }) {
  const booking = bookings.find(
    (b) =>
      ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status) &&
      b.checkInDate <= days[13] &&
      b.checkOutDate > days[0] &&
      b.rooms?.some((r) => r.roomId === room.id),
  )
  return (
    <>
      <div className="calendar-room-label">
        <b>{room.roomNumber}</b>
        <small>{room.roomTypeName}</small>
      </div>
      {days.map((day, i) => {
        const occupied = Boolean(booking && day >= booking.checkInDate && day < booking.checkOutDate)
        const begins = occupied && day === booking?.checkInDate
        const ends = occupied && days[i + 1] === booking?.checkOutDate
        return (
          <div className={`calendar-cell ${occupied ? `booking-${booking?.status.toLowerCase()}` : ''}`} key={day}>
            <span
              className={occupied ? `calendar-booking-bar ${begins ? 'begins' : ''} ${ends ? 'ends' : ''}` : ''}
              title={occupied ? `${booking?.bookingCode} — ${bookingNames[booking!.status]}` : ''}
            />
          </div>
        )
      })}
    </>
  )
}

export function RoomCalendar() {
  const { bookings, rooms } = useOpsData()
  const [start, setStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return dateValue(d)
  })
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + i)
    return dateValue(d)
  })
  const previous = (by: number) => {
    const d = new Date(`${start}T12:00:00`)
    d.setDate(d.getDate() + by)
    setStart(dateValue(d))
  }
  const calendarScrollRef = useSixRowCalendarScroll(rooms.data?.length ?? 0)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="KẾ HOẠCH LƯU TRÚ"
        title="Lịch phòng"
        detail="Theo dõi tình trạng phòng và lịch lưu trú theo từng ngày"
        action={
          <div className="calendar-controls">
            <button className="icon-action" onClick={() => previous(-14)} aria-label="Hai tuần trước">
              <ChevronLeft size={16} />
            </button>
            <span>
              {date(days[0])} — {date(days[13])}
            </span>
            <button className="icon-action" onClick={() => previous(14)} aria-label="Hai tuần sau">
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      {rooms.isPending || bookings.isPending ? (
        <LoadingRows />
      ) : rooms.isError ? (
        <ErrorPanel error={rooms.error} retry={() => void rooms.refetch()} />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <section className="panel calendar-panel">
          <div className="calendar-legend">
            <span>
              <i className="legend-confirmed" /> Đã xác nhận
            </span>
            <span>
              <i className="legend-staying" /> Đang lưu trú
            </span>
            <span>
              <i className="legend-pending" /> Chờ xác nhận
            </span>
          </div>
          <div ref={calendarScrollRef} className="calendar-scroll calendar-scroll-6">
            <div className="calendar-grid" style={{ gridTemplateColumns: '150px repeat(14, minmax(48px, 1fr))' }}>
              <div className="calendar-head room-head">PHÒNG</div>
              {days.map((day) => (
                <div className="calendar-head" key={day}>
                  <small>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(`${day}T00:00:00`))}</small>
                  <b>{day.slice(8, 10)}</b>
                </div>
              ))}
              {(rooms.data || []).map((room) => (
                <CalendarRoom key={room.id} room={room} days={days} bookings={bookings.data || []} />
              ))}
            </div>
          </div>
          {rooms.data?.length === 0 && <div className="empty-table">Chưa có phòng để hiển thị</div>}
        </section>
      )}
    </div>
  )
}
