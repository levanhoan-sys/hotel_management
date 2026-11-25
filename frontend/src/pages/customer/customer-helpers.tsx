import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, CalendarDays, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api, request } from '../../lib/api'
import type { ApiResponse, RoomRecommendation, RoomType } from '../../lib/types'
import { HgSelect } from '../../components/HgSelect'
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

export function getRoomImages(room: { imageUrl: string | null; imageUrls?: string[] }) {
  const list = (room.imageUrls || []).filter(Boolean)
  if (list.length > 0) return list
  return room.imageUrl ? [room.imageUrl] : []
}

export function RoomImage({
  room,
}: {
  room: { imageUrl: string | null; imageUrls?: string[]; roomTypeName?: string; name?: string }
  large?: boolean
}) {
  const src = getRoomImages(room)[0] ?? null

  return (
    <div className="hg-room-media">
      {src ? (
        <img
          src={src}
          alt={room.roomTypeName || room.name || 'Phòng nghỉ Hoàng Gia'}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="hg-room-fallback">
          <span>HOÀNG GIA</span>
          <small>Hình ảnh phòng đang cập nhật</small>
        </div>
      )}
    </div>
  )
}

export function RoomGallery({
  room,
}: {
  room: { imageUrl: string | null; imageUrls?: string[]; roomTypeName?: string; roomNumber?: string; name?: string }
}) {
  const images = getRoomImages(room)
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length <= 1) {
    return (
      <div className="hg-detail-hero-media">
        <RoomImage room={room} large />
      </div>
    )
  }

  const safeIndex = activeIndex % images.length
  const label = room.roomTypeName || room.name || 'Phòng nghỉ Hoàng Gia'
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  const goNext = () => setActiveIndex((prev) => (prev + 1) % images.length)

  return (
    <div className="hg-detail-gallery">
      <div className="hg-detail-hero-media">
        <div className="hg-room-media">
          <img
            key={images[safeIndex]}
            src={images[safeIndex]}
            alt={`${label} - Ảnh ${safeIndex + 1}`}
            referrerPolicy="no-referrer"
          />
        </div>
        <button type="button" className="hg-gallery-nav is-prev" aria-label="Ảnh trước" onClick={goPrev}>
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" className="hg-gallery-nav is-next" aria-label="Ảnh tiếp theo" onClick={goNext}>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <span className="hg-gallery-counter" aria-live="polite">
          {safeIndex + 1} / {images.length}
        </span>
      </div>

      <div className="hg-detail-thumbs" role="tablist" aria-label={`Bộ sưu tập ảnh ${label}`}>
        {images.map((url, idx) => (
          <button
            key={url}
            type="button"
            role="tab"
            aria-selected={idx === safeIndex}
            aria-label={`Xem ảnh ${idx + 1}`}
            className={`hg-detail-thumb ${idx === safeIndex ? 'is-active' : ''}`.trim()}
            onClick={() => setActiveIndex(idx)}
          >
            <img src={url} alt={`${label} - Thu nhỏ ${idx + 1}`} loading="lazy" referrerPolicy="no-referrer" />
          </button>
        ))}
      </div>
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

  const persistParams = (nextCheckIn: string, nextCheckOut: string, nextGuests = guests) => {
    if (!compact) return
    const next = new URLSearchParams(window.location.search)
    if (nextCheckIn) next.set('checkIn', nextCheckIn)
    else next.delete('checkIn')
    if (nextCheckOut) next.set('checkOut', nextCheckOut)
    else next.delete('checkOut')
    if (nextGuests) next.set('guests', nextGuests)
    else next.delete('guests')
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
            persistParams(e.target.value, checkOut)
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
            persistParams(checkIn, e.target.value)
          }}
        />
      </label>

      <div className="hg-search-cell hg-search-cell--select">
        <span>SỐ KHÁCH</span>
        <Users size={16} aria-hidden="true" />
        <HgSelect
          variant="search-cell"
          ariaLabel="Số khách"
          value={guests}
          onChange={(nextGuests) => {
            setGuests(nextGuests)
            persistParams(checkIn, checkOut, nextGuests)
          }}
          options={[1, 2, 3, 4, 5, 6].map((n) => ({
            value: String(n),
            label: `${n} khách`,
          }))}
        />
      </div>

      {showRoomType && (
        <div className="hg-search-cell hg-search-cell--select">
          <span>HẠNG PHÒNG</span>
          <BedDouble size={16} aria-hidden="true" />
          <HgSelect
            variant="search-cell"
            ariaLabel="Hạng phòng"
            value={typeId}
            onChange={setTypeId}
            options={[
              { value: '', label: 'Tất cả hạng phòng' },
              ...(types.data?.map((t) => ({
                value: String(t.id),
                label: t.name,
                hint: `Tối đa ${t.capacity} khách`,
              })) || []),
            ]}
          />
        </div>
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
                    <span className="hg-kicker hg-room-code">
                      Phòng {item.room.roomNumber}
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
                  <div className="hg-rec-price">
                    <div className="hg-price-display hg-price-display--sm">
                      <b>{money(item.room.basePrice)}</b>
                      <span>/ đêm</span>
                    </div>
                    <small className="hg-rec-diff">
                      {item.priceDifference === 0
                        ? 'Cùng mức giá'
                        : `${item.priceDifference > 0 ? '+' : '−'}${money(Math.abs(item.priceDifference))}`}
                    </small>
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
