import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarDays, ChevronDown, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api, request } from '../../lib/api'
import type { ApiResponse, RoomRecommendation, RoomType } from '../../lib/types'
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../../components/shared'

export const dateInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return dateInput(d)
}

export const fmtDate = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )

export const fmtDateTime = (dateTime?: string | null) =>
  dateTime
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateTime))
    : 'Chưa cập nhật'

export const money = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)

export const bookingStatusLabel: Record<string, string> = {
  PENDING_DEPOSIT: 'Chờ đặt cọc',
  PENDING_VERIFICATION: 'Chờ xác minh cọc',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Từ chối',
  CHECKED_IN: 'Đang lưu trú',
  COMPLETED: 'Đã trả phòng',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  NO_SHOW: 'Không đến',
}

export const bookingStatusTone: Record<string, 'green' | 'amber' | 'blue' | 'red' | 'gray'> = {
  PENDING_DEPOSIT: 'amber',
  PENDING_VERIFICATION: 'amber',
  PENDING: 'amber',
  CONFIRMED: 'green',
  REJECTED: 'red',
  CHECKED_IN: 'blue',
  COMPLETED: 'gray',
  CHECKED_OUT: 'gray',
  CANCELLED: 'gray',
  EXPIRED: 'gray',
  NO_SHOW: 'gray',
}

export function cleanRoomCopy(text: string) {
  return text
    .replace(/(?:có\s+)?ban công\s+(?:có\s+)?(?:view|nhìn(?:\s+ra)?|hướng(?:\s+ra)?)\s+biển\b/gi, 'có ban công')
    .replace(/\s*(?:,?\s*)?(?:có\s+)?(?:hướng(?:\s+ra)?|view)\s+biển\b/gi, '')
    .replace(/\s*(?:with\s+)?(?:sea|ocean)\s+view\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/^[,.;]\s*|[,.;]\s*$/g, '')
    .trim()
}

export function roomDescription(description?: string | null) {
  const cleaned = cleanRoomCopy(description || '')
  return (
    cleaned ||
    'Được thiết kế với chất liệu tự nhiên và bảng màu dịu nhẹ, căn phòng mang đến cảm giác thư thái, riêng tư cho mỗi kỳ nghỉ.'
  )
}

export function RoomImage({
  room,
}: {
  room: { imageUrl: string | null; roomTypeName?: string; name?: string }
  large?: boolean
}) {
  const src = room.imageUrl
  const illustrative = Boolean(src && /images\.unsplash\.com/.test(src))

  return (
    <div className="hg-room-media">
      {src ? (
        <>
          <img
            src={src}
            alt={`${illustrative ? 'Ảnh minh họa: ' : ''}${room.roomTypeName || room.name || 'phòng nghỉ'}`}
            loading="lazy"
          />
          {illustrative && <span className="hg-photo-tag">Ảnh minh họa</span>}
        </>
      ) : (
        <div className="hg-room-fallback">
          <span>HOÀNG GIA</span>
          <small>Hình ảnh phòng đang cập nhật</small>
        </div>
      )}
    </div>
  )
}

export function DateSearch({
  compact = false,
  showRoomType = true,
  initialCheckIn = '',
  initialCheckOut = '',
  initialGuests = '2',
  initialTypeId = '',
  selectedRooms = '',
  preservedFilters = '',
}: {
  compact?: boolean
  showRoomType?: boolean
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: string
  initialTypeId?: string
  selectedRooms?: string
  preservedFilters?: string
}) {
  const defaultCheckIn = initialCheckIn || tomorrow()
  const defaultCheckOut =
    initialCheckOut ||
    (() => {
      const d = new Date(`${defaultCheckIn}T12:00:00`)
      d.setDate(d.getDate() + 1)
      return dateInput(d)
    })()

  const [checkIn, setCheckIn] = useState(defaultCheckIn)
  const [checkOut, setCheckOut] = useState(defaultCheckOut)
  const [guests, setGuests] = useState(initialGuests)
  const [typeId, setTypeId] = useState(initialTypeId)
  const types = useQuery({
    queryKey: ['room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/room-types')),
  })
  const nav = useNavigate()

  const persistDates = (nextCheckIn: string, nextCheckOut: string) => {
    if (!compact) return
    const next = new URLSearchParams(window.location.search)
    if (nextCheckIn) next.set('checkIn', nextCheckIn)
    else next.delete('checkIn')
    if (nextCheckOut) next.set('checkOut', nextCheckOut)
    else next.delete('checkOut')
    nav(`/rooms?${next.toString()}`, { replace: true })
  }

  const submit = () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      return toast.error('Ngày trả phòng phải sau ngày nhận phòng.')
    }
    nav(
      `/rooms?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}${typeId ? `&roomTypeId=${typeId}` : ''}${
        selectedRooms ? `&selected=${selectedRooms}` : ''
      }${preservedFilters ? `&${preservedFilters}` : ''}`,
    )
  }

  return (
    <div
      className={`hg-search-bar ${compact ? 'is-compact' : ''} ${!showRoomType ? 'no-type' : ''}`.trim()}
    >
      <label className="hg-search-cell">
        <span>NHẬN PHÒNG</span>
        <CalendarDays size={16} aria-hidden="true" />
        <input
          aria-label="Ngày nhận phòng"
          type="date"
          value={checkIn}
          min={tomorrow()}
          onChange={(e) => {
            setCheckIn(e.target.value)
            persistDates(e.target.value, checkOut)
          }}
        />
      </label>

      <label className="hg-search-cell">
        <span>TRẢ PHÒNG</span>
        <CalendarDays size={16} aria-hidden="true" />
        <input
          aria-label="Ngày trả phòng"
          type="date"
          value={checkOut}
          min={checkIn || tomorrow()}
          onChange={(e) => {
            setCheckOut(e.target.value)
            persistDates(checkIn, e.target.value)
          }}
        />
      </label>

      <label className="hg-search-cell">
        <span>SỐ KHÁCH</span>
        <Users size={16} aria-hidden="true" />
        <select aria-label="Số khách" value={guests} onChange={(e) => setGuests(e.target.value)}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} khách
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="hg-select-caret" aria-hidden="true" />
      </label>

      {showRoomType && (
        <label className="hg-search-cell">
          <span>HẠNG PHÒNG</span>
          <BedDouble size={16} aria-hidden="true" />
          <select aria-label="Hạng phòng" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            <option value="">Tất cả hạng phòng</option>
            {types.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="hg-select-caret" aria-hidden="true" />
        </label>
      )}

      <button type="button" className="hg-btn hg-btn-gold hg-search-submit" onClick={submit}>
        Tìm phòng <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export function RoomRecommendationSection({
  referenceRoomId,
  roomTypeId,
  checkIn,
  checkOut,
  guests,
  roomQuantity = 1,
  alternatives = false,
}: {
  referenceRoomId?: number
  roomTypeId?: number
  checkIn?: string
  checkOut?: string
  guests?: number
  roomQuantity?: number
  alternatives?: boolean
}) {
  const query = useQuery({
    queryKey: ['room-recommendations', referenceRoomId, roomTypeId, checkIn, checkOut, guests, roomQuantity, alternatives],
    queryFn: () =>
      request(
        api.get<ApiResponse<RoomRecommendation[]>>('/rooms/recommendations', {
          params: {
            ...(referenceRoomId && { referenceRoomId }),
            ...(roomTypeId && { roomTypeId }),
            ...(checkIn && { checkIn }),
            ...(checkOut && { checkOut }),
            ...(guests && { guests }),
            roomQuantity,
            alternatives,
            limit: 4,
          },
        }),
      ),
  })

  const heading = alternatives ? 'Phòng thay thế dành cho bạn' : 'Có thể bạn cũng thích'
  const context = new URLSearchParams()
  if (checkIn) context.set('checkIn', checkIn)
  if (checkOut) context.set('checkOut', checkOut)
  if (guests) context.set('guests', String(guests))
  const suffix = context.size ? `?${context}` : ''

  return (
    <section className="hg-recommendations">
      <div className="hg-section-head">
        <div>
          <span className="hg-kicker">GỢI Ý THEO NHU CẦU</span>
          <h2>{heading}</h2>
          <p>
            {alternatives
              ? 'Rất tiếc, phòng bạn chọn hiện không còn trống trong thời gian này. Hãy tham khảo những lựa chọn phù hợp khác.'
              : 'Khám phá thêm những lựa chọn lưu trú phù hợp với nhu cầu của bạn.'}
          </p>
        </div>
      </div>

      {query.isPending ? (
        <LoadingSkeleton variant="cards" count={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} retry={() => void query.refetch()} />
      ) : query.data?.length ? (
        <div className="hg-rec-grid">
          {query.data.map((item) => (
            <article className="hg-rec-card" key={item.room.id}>
              <Link className="hg-rec-thumb" to={`/rooms/${item.room.id}${suffix}`}>
                <RoomImage room={item.room} />
                <div className="hg-room-card-status">
                  <StatusBadge
                    tone={item.availabilityChecked && (item.availableQuantity ?? 0) === 0 ? 'amber' : 'green'}
                    label={item.availabilityChecked ? `${item.availableQuantity ?? 0} phòng còn trống` : 'Phù hợp về đặc điểm'}
                  />
                </div>
              </Link>
              <div className="hg-rec-body">
                <div className="hg-room-card-top">
                  <div>
                    <span className="hg-kicker">
                      {item.room.roomTypeName} · PHÒNG {item.room.roomNumber}
                    </span>
                    <h2>
                      <Link to={`/rooms/${item.room.id}${suffix}`}>{item.room.roomTypeName}</Link>
                    </h2>
                  </div>
                  <div className="hg-room-specs">
                    <span>
                      <Users size={15} aria-hidden="true" /> {item.room.capacity} khách
                    </span>
                  </div>
                </div>
                <div className="hg-rec-bottom">
                  <div>
                    <b>{money(item.room.basePrice)}</b>
                    <span>
                      {' '}
                      / đêm ·{' '}
                      {item.priceDifference === 0
                        ? 'cùng giá'
                        : `${item.priceDifference > 0 ? '+' : '−'}${money(Math.abs(item.priceDifference))}`}
                    </span>
                  </div>
                  <Link className="hg-btn hg-btn-outline" to={`/rooms/${item.room.id}${suffix}`}>
                    Xem phòng <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có lựa chọn phù hợp"
          detail="Hãy thử thay đổi ngày lưu trú hoặc xem danh sách phòng."
          action={
            <Link className="hg-btn hg-btn-outline" to={`/rooms${suffix}`}>
              Xem danh sách phòng
            </Link>
          }
        />
      )}
    </section>
  )
}
