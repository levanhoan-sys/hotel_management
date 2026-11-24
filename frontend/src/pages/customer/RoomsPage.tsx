import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BedDouble, Check, ChevronLeft, ChevronRight, CircleAlert, MapPin, Plus, Search, ShieldCheck, Users } from 'lucide-react'
import { api, request } from '../../lib/api'
import type { ApiResponse, Room, RoomType } from '../../lib/types'
import { uniqueRoomIds } from '../../lib/booking-utils'
import { MoneyInput } from '../../components/MoneyInput'
import { HgSelect } from '../../components/HgSelect'
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../../components/shared'
import { DateSearch, fmtDate, getRoomImages, money, roomDescription, RoomImage, RoomRecommendationSection } from './customer-helpers'

function RoomCardThumb({ room, isReady }: { room: Room; isReady: boolean }) {
  const images = getRoomImages(room)
  const [index, setIndex] = useState(0)
  const safeIndex = images.length ? index % images.length : 0

  return (
    <div className="hg-room-card-thumb">
      <Link className="hg-room-card-thumb-link" to={`/rooms/${room.id}`}>
        {images.length > 0 ? (
          <div className="hg-room-media">
            <img
              src={images[safeIndex]}
              alt={`${room.roomTypeName || `Phòng ${room.roomNumber}`} - Ảnh ${safeIndex + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <RoomImage room={room} />
        )}
      </Link>

      <div className="hg-room-card-status">
        <StatusBadge
          tone={isReady ? 'green' : 'amber'}
          label={isReady ? 'Sẵn sàng đón bạn' : 'Cần kiểm tra tình trạng'}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="hg-card-gallery-btn is-prev"
            aria-label={`Ảnh trước phòng ${room.roomNumber}`}
            onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
          >
            <ChevronLeft size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hg-card-gallery-btn is-next"
            aria-label={`Ảnh tiếp theo phòng ${room.roomNumber}`}
            onClick={() => setIndex((prev) => (prev + 1) % images.length)}
          >
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          <div className="hg-card-gallery-bars" aria-hidden="true">
            {images.map((url, idx) => (
              <span key={url} className={idx === safeIndex ? 'is-active' : ''} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function RoomsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState(params.get('q') || '')
  const checkIn = params.get('checkIn') || ''
  const checkOut = params.get('checkOut') || ''
  const roomTypeId = params.get('roomTypeId') || ''
  const guests = params.get('guests') || ''
  const selectedIds = uniqueRoomIds(params.get('selected'))
  const minPrice = params.get('minPrice') || ''
  const maxPrice = params.get('maxPrice') || ''
  const sort = params.get('sort') || 'price-asc'
  const [draftType, setDraftType] = useState(roomTypeId)
  const [draftMin, setDraftMin] = useState(minPrice)
  const [draftMax, setDraftMax] = useState(maxPrice)
  const appliedSearch = params.get('q') || ''

  const dateRangeError =
    checkIn && !checkOut
      ? 'Vui lòng chọn đầy đủ ngày nhận phòng và ngày trả phòng.'
      : checkOut && !checkIn
        ? 'Vui lòng chọn đầy đủ ngày nhận phòng và ngày trả phòng.'
        : checkIn && checkOut && checkOut <= checkIn
          ? 'Ngày trả phòng phải sau ngày nhận phòng.'
          : ''

  const rooms = useQuery({
    queryKey: ['rooms', checkIn, checkOut, roomTypeId, guests, minPrice, maxPrice],
    queryFn: () =>
      request(
        api.get<ApiResponse<Room[]>>('/rooms', {
          params: {
            ...(checkIn && { checkIn }),
            ...(checkOut && { checkOut }),
            ...(roomTypeId && { roomTypeId }),
            ...(guests && { minCapacity: guests }),
            ...(minPrice && { minPrice }),
            ...(maxPrice && { maxPrice }),
          },
        }),
      ),
    enabled: !dateRangeError,
  })

  const types = useQuery({
    queryKey: ['room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/room-types')),
  })

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const toggleRoom = (id: number) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id]
    setFilter('selected', nextIds.join(','))
  }

  const visibleRooms = useMemo(
    () =>
      (rooms.data || [])
        .filter(
          (r) =>
            !appliedSearch ||
            `${r.roomNumber} ${r.roomTypeName}`.toLowerCase().includes(appliedSearch.toLowerCase()),
        )
        .sort((a, b) => (sort === 'price-desc' ? b.basePrice - a.basePrice : a.basePrice - b.basePrice)),
    [rooms.data, appliedSearch, sort],
  )

  const applyFilters = () => {
    const next = new URLSearchParams(params)
    for (const [key, value] of [
      ['q', search],
      ['roomTypeId', draftType],
      ['minPrice', draftMin],
      ['maxPrice', draftMax],
    ]) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

  const clearFilters = () => {
    setSearch('')
    setDraftType('')
    setDraftMin('')
    setDraftMax('')
    const next = new URLSearchParams(params)
    ;['q', 'roomTypeId', 'minPrice', 'maxPrice', 'checkIn', 'checkOut', 'guests'].forEach((key) => next.delete(key))
    setParams(next)
  }

  const preservedFilters = new URLSearchParams(
    [
      ['q', search],
      ['minPrice', minPrice],
      ['maxPrice', maxPrice],
    ].filter(([, value]) => Boolean(value)),
  ).toString()

  return (
    <main className="hg-rooms-page">
      <section className="hg-page-banner">
        <div className="hg-container hg-page-banner-inner">
          <div className="hg-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span>Phòng nghỉ</span>
          </div>
          <span className="hg-kicker">PHÒNG NGHỈ HOÀNG GIA HOTEL</span>
          <h1 className="hg-serif-em">
            Hạng phòng <em>tại Hoàng Gia</em>
          </h1>
          <p>Chọn không gian phù hợp cho kỳ nghỉ của bạn.</p>
        </div>
      </section>

      <div className="hg-container hg-rooms-controls">
        <DateSearch
          compact
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests || '2'}
          initialTypeId={roomTypeId}
          selectedRooms={selectedIds.join(',')}
          preservedFilters={preservedFilters}
        />

        <div className="hg-filter-card">
          <div className="hg-filter-top">
            <div className="hg-result-summary">
              <b>{visibleRooms.length}</b>
              <span>phòng phù hợp với lựa chọn hiện tại</span>
            </div>
            <div className="hg-sort-control">
              <span>Sắp xếp</span>
              <HgSelect
                variant="filter"
                align="right"
                ariaLabel="Sắp xếp giá phòng"
                value={sort}
                onChange={(value) => setFilter('sort', value)}
                options={[
                  { value: 'price-asc', label: 'Giá thấp đến cao' },
                  { value: 'price-desc', label: 'Giá cao đến thấp' },
                ]}
              />
            </div>
          </div>

          <div className="hg-filter-grid">
            <label className="hg-filter-input-box">
              <Search size={16} aria-hidden="true" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tên hạng phòng hoặc số phòng"
                aria-label="Tìm theo hạng hoặc số phòng"
              />
            </label>

            <HgSelect
              variant="filter"
              ariaLabel="Lọc theo hạng phòng"
              value={draftType}
              onChange={setDraftType}
              options={[
                { value: '', label: 'Tất cả hạng phòng' },
                ...(types.data?.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                  hint: `Tối đa ${t.capacity} khách`,
                })) || []),
              ]}
            />

            <label className="hg-filter-input-box">
              <span>Từ</span>
              <MoneyInput
                value={draftMin}
                onChange={setDraftMin}
                aria-label="Giá tối thiểu mỗi đêm"
                placeholder="0"
              />
              <span>₫</span>
            </label>

            <label className="hg-filter-input-box">
              <span>Đến</span>
              <MoneyInput
                value={draftMax}
                onChange={setDraftMax}
                aria-label="Giá tối đa mỗi đêm"
                placeholder="Không giới hạn"
              />
              <span>₫</span>
            </label>
          </div>

          <div className="hg-filter-actions">
            <button type="button" className="hg-btn hg-btn-primary" onClick={applyFilters}>
              Áp dụng bộ lọc
            </button>
            <button type="button" className="hg-btn hg-btn-outline" onClick={clearFilters}>
              Xem tất cả phòng
            </button>
          </div>
        </div>
      </div>

      <div className="hg-container">
        {dateRangeError ? (
          <div className="hg-inline-alert" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{dateRangeError}</span>
          </div>
        ) : rooms.isPending ? (
          <LoadingSkeleton variant="cards" count={3} />
        ) : rooms.isError ? (
          <ErrorState error={rooms.error} retry={() => void rooms.refetch()} />
        ) : visibleRooms.length === 0 ? (
          <>
            <EmptyState
              title="Chưa tìm thấy phòng phù hợp"
              detail="Bạn thử đổi ngày lưu trú, hạng phòng hoặc số khách nhé."
            />
            {roomTypeId && (
              <>
                {(minPrice || maxPrice || search) && (
                  <p className="hg-recommendation-note">
                    Các gợi ý bên dưới có thể nằm ngoài bộ lọc giá hoặc tên phòng bạn vừa chọn.
                  </p>
                )}
                <RoomRecommendationSection
                  roomTypeId={Number(roomTypeId)}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guests={Number(guests || 1)}
                  roomQuantity={Number(params.get('roomQuantity') || 1)}
                  alternatives
                />
              </>
            )}
          </>
        ) : (
          <div className="hg-room-list">
            {visibleRooms.map((room) => {
              const isReady = room.operational && room.status === 'AVAILABLE'
              const isSelected = selectedIds.includes(room.id)
              return (
                <article className="hg-room-card" key={room.id}>
                  <RoomCardThumb room={room} isReady={isReady} />

                  <div className="hg-room-card-body">
                    <div className="hg-room-card-top">
                      <div>
                        <span className="hg-kicker hg-room-code">
                          Phòng {room.roomNumber}
                        </span>
                        <h2>
                          <Link to={`/rooms/${room.id}`}>{room.roomTypeName}</Link>
                        </h2>
                      </div>
                      <div className="hg-room-specs">
                        <span>
                          <Users size={15} aria-hidden="true" /> {room.capacity} khách
                        </span>
                        <span>
                          <MapPin size={15} aria-hidden="true" /> Tầng {room.floor}
                        </span>
                        {room.areaSqm && (
                          <span>
                            <BedDouble size={15} aria-hidden="true" /> {room.areaSqm} m²
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="hg-room-desc">{roomDescription(room.description)}</p>

                    <div className="hg-room-card-footer">
                      <div className="hg-price-display">
                        <b>{money(room.basePrice)}</b>
                        <span>/ đêm</span>
                      </div>
                      <div className="hg-room-card-actions">
                        <Link className="hg-btn hg-btn-outline" to={`/rooms/${room.id}`}>
                          Chi tiết phòng
                        </Link>
                        <button
                          type="button"
                          className={isSelected ? 'hg-btn hg-btn-primary' : 'hg-btn hg-btn-gold'}
                          onClick={() => toggleRoom(room.id)}
                        >
                          {isSelected ? (
                            <>
                              <Check size={15} aria-hidden="true" /> Đã chọn
                            </>
                          ) : (
                            <>
                              <Plus size={15} aria-hidden="true" /> Chọn phòng
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="hg-selection-bar">
            <div className="hg-selection-info">
              <b>{selectedIds.length} phòng đã chọn</b>
              <span>
                {checkIn && checkOut ? `${fmtDate(checkIn)} — ${fmtDate(checkOut)}` : 'Chọn ngày lưu trú để tiếp tục'}
              </span>
            </div>
            <button
              type="button"
              className="hg-btn hg-btn-gold"
              disabled={!checkIn || !checkOut || checkOut <= checkIn}
              onClick={() => {
                const next = new URLSearchParams()
                next.set('roomIds', selectedIds.join(','))
                next.set('checkIn', checkIn)
                next.set('checkOut', checkOut)
                next.set('guests', guests || '1')
                navigate(`/booking?${next.toString()}`)
              }}
            >
              Tiếp tục đặt phòng <ArrowRight size={15} aria-hidden="true" />
            </button>
            <button type="button" className="hg-selection-clear" onClick={() => setFilter('selected', '')}>
              Bỏ chọn
            </button>
          </div>
        )}

        <div className="hg-notice-banner">
          <ShieldCheck size={18} aria-hidden="true" />
          <span>Tình trạng phòng được xác nhận lần cuối bởi hệ thống khi bạn gửi yêu cầu đặt phòng.</span>
        </div>
      </div>
    </main>
  )
}
