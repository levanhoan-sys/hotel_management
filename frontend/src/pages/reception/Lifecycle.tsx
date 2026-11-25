import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronRight, CircleAlert, ClipboardCheck, DoorOpen, KeyRound, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/shared/ConfirmDialog'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking, Invoice } from '../../lib/types'
import {
  ErrorPanel,
  LoadingRows,
  PageTitle,
  RoomThumbnail,
  bookingNames,
  date,
  money,
  roomNames,
  statusTone,
  useInvalidate,
  useOpsData,
} from './reception-helpers'

export function Lifecycle({ kind }: { kind: 'check-in' | 'check-out' }) {
  const { bookings, rooms } = useOpsData()
  const [searchParams] = useSearchParams()
  const requestedBookingId = Number(searchParams.get('bookingId'))
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Booking | null>(null)
  const [confirmCheckInOpen, setConfirmCheckInOpen] = useState(false)
  const invalidate = useInvalidate()
  const eligible = (bookings.data || []).filter((b) =>
    kind === 'check-in' ? b.status === 'CONFIRMED' : b.status === 'CHECKED_IN',
  )

  useEffect(() => {
    if (!Number.isInteger(requestedBookingId) || requestedBookingId <= 0) return
    const list = (bookings.data || []).filter((b) =>
      kind === 'check-in' ? b.status === 'CONFIRMED' : b.status === 'CHECKED_IN',
    )
    const match = list.find((b) => b.id === requestedBookingId)
    if (match) setSelected(match)
  }, [requestedBookingId, bookings.data, kind])
  const matches = eligible.filter((b) =>
    `${b.bookingCode} ${b.customerName}`.toLowerCase().includes(search.toLowerCase()),
  )
  const roomById = new Map((rooms.data || []).map((room) => [room.id, room]))
  const roomIssues =
    selected?.rooms?.filter((bookingRoom) => {
      const room = roomById.get(bookingRoom.roomId)
      return !room || !room.operational || room.status !== 'AVAILABLE'
    }) || []

  const mutation = useMutation({
    mutationFn: (id: number) => request(api.post<ApiResponse<Booking | Invoice>>(`/reception/bookings/${id}/${kind}`)),
    onSuccess: async () => {
      toast.success(kind === 'check-in' ? 'Đã hoàn tất nhận phòng' : 'Đã hoàn tất trả phòng')
      setConfirmCheckInOpen(false)
      setSelected(null)
      setSearch('')
      await invalidate()
    },
    onError: (e) => {
      setConfirmCheckInOpen(false)
      toast.error(errorMessage(e, 'Không thể hoàn tất thao tác này'))
    },
  })

  return (
    <div className="ops-page">
      <PageTitle
        kicker={kind === 'check-in' ? 'CHÀO ĐÓN KHÁCH' : 'HOÀN TẤT KỲ LƯU TRÚ'}
        title={kind === 'check-in' ? 'Nhận phòng' : 'Trả phòng'}
        detail={
          kind === 'check-in'
            ? 'Chỉ booking đã xác nhận mới xuất hiện trong danh sách'
            : 'Chọn khách đang lưu trú để lập hóa đơn và hoàn tất trả phòng'
        }
      />

      {bookings.isPending ? (
        <LoadingRows />
      ) : bookings.isError ? (
        <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <div className="lifecycle-layout">
          <section className="panel lifecycle-search">
            <label className="table-search lifecycle-input">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã đặt phòng hoặc tên khách…"
              />
            </label>
            <span className="section-kicker">
              {kind === 'check-in' ? 'Sẵn sàng nhận phòng' : 'Đang lưu trú'} ({matches.length})
            </span>
            {matches.length ? (
              <div className="lifecycle-results">
                {matches.map((b) => (
                  <button
                    className={`lifecycle-result ${selected?.id === b.id ? 'selected' : ''}`}
                    key={b.id}
                    onClick={() => setSelected(b)}
                  >
                    <span className="booking-result-icon">
                      {kind === 'check-in' ? <KeyRound size={17} /> : <DoorOpen size={17} />}
                    </span>
                    <span>
                      <b>{b.customerName}</b>
                      <small className="booking-code-display">
                        {b.bookingCode} — {b.roomNumbers?.map((n) => `#${n}`).join(', ') || 'Chưa gán phòng'}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-compact">Không có booking phù hợp</div>
            )}
          </section>

          <section className="panel lifecycle-detail">
            {selected ? (
              <>
                <div className="detail-header">
                  <div>
                    <span className="section-kicker">MÃ ĐẶT PHÒNG</span>
                    <h3 className="booking-code-display">{selected.bookingCode}</h3>
                  </div>
                  <span className={`status-badge ${statusTone(selected.status)}`}>
                    {bookingNames[selected.status]}
                  </span>
                </div>

                <div className="detail-customer">
                  <div className="avatar large-avatar" aria-hidden="true">
                    <img src="/images/avatar-default.png" alt="" width={1536} height={1024} />
                  </div>
                  <div>
                    <b>{selected.customerName}</b>
                    <span>Khách hàng</span>
                  </div>
                </div>

                <div className="lifecycle-info">
                  <div>
                    <span>NGÀY NHẬN</span>
                    <b>{date(selected.checkInDate)}</b>
                  </div>
                  <div>
                    <span>NGÀY TRẢ</span>
                    <b>{date(selected.checkOutDate)}</b>
                  </div>
                  <div>
                    <span>SỐ ĐÊM</span>
                    <b>{selected.numberOfNights} đêm</b>
                  </div>
                </div>

                <div className="lifecycle-room-block">
                  <span className="section-kicker">PHÒNG TRONG ĐẶT CHỖ</span>
                  {selected.rooms?.map((r, idx) => {
                    const actual = roomById.get(r.roomId)
                    const roomThumb = actual?.imageUrl || actual?.imageUrls?.[0] || selected.roomImageUrls?.[idx]
                    return (
                      <div key={r.roomId}>
                        <RoomThumbnail
                          src={roomThumb}
                          alt={`Phòng ${r.roomNumber}`}
                          className="lifecycle-room-thumb"
                          iconSize={16}
                        />
                        <span>
                          <b>Phòng {r.roomNumber}</b>
                          <small>
                            {r.guestCount}/{r.capacity} khách, {money(r.pricePerNight)}/đêm
                          </small>
                        </span>
                        <span className={`status-badge room-${actual?.status.toLowerCase() || 'maintenance'}`}>
                          {actual
                            ? `${roomNames[actual.status]}${actual.operational ? '' : ' (ngừng hoạt động)'}`
                            : 'Không tìm thấy phòng'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {kind === 'check-in' &&
                  (rooms.isPending ? (
                    <div className="inline-warning">
                      <CircleAlert size={15} /> Đang kiểm tra tình trạng phòng…
                    </div>
                  ) : (
                    roomIssues.length > 0 && (
                      <div className="inline-warning">
                        <CircleAlert size={15} /> Một hoặc nhiều phòng chưa sẵn sàng — kiểm tra trạng thái phòng trước
                        khi nhận khách
                      </div>
                    )
                  ))}

                {kind === 'check-out' ? (
                  <Link className="button button-gold full-button" to={`/reception/invoices?bookingId=${selected.id}`}>
                    Mở hóa đơn và trả phòng <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="button button-dark full-button"
                    disabled={mutation.isPending || rooms.isPending || rooms.isError || roomIssues.length > 0}
                    onClick={() => setConfirmCheckInOpen(true)}
                  >
                    {mutation.isPending ? 'Đang xử lý…' : 'Xác nhận nhận phòng'} <Check size={16} />
                  </button>
                )}

                <p className="summary-terms">
                  <ShieldCheck size={14} /> Trạng thái phòng được kiểm tra trước khi nhận khách
                </p>
              </>
            ) : (
              <div className="lifecycle-empty">
                <ClipboardCheck size={27} />
                <h3>Chọn một booking</h3>
                <p>Thông tin khách lưu trú sẽ xuất hiện tại đây</p>
              </div>
            )}
          </section>
        </div>
      )}
      <ConfirmDialog
        open={confirmCheckInOpen && selected !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setConfirmCheckInOpen(false)
        }}
        title="Xác nhận nhận phòng"
        message={`Xác nhận nhận phòng cho ${selected?.customerName || ''} (đơn ${selected?.bookingCode || ''})?`}
        confirmLabel="Xác nhận nhận phòng"
        tone="primary"
        pending={mutation.isPending}
        onConfirm={() => {
          if (selected) mutation.mutate(selected.id)
        }}
      />
    </div>
  )
}
