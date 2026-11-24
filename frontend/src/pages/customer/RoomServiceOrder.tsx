import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Check, ConciergeBell, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Booking, Room } from '../../lib/types'
import { EmptyState, ErrorState, LoadingSkeleton, StatusBadge } from '../../components/shared'
import { money } from './customer-helpers'

const serviceApprovalMeta: Record<
  'PENDING' | 'APPROVED' | 'REJECTED',
  { label: string; tone: 'amber' | 'green' | 'red' }
> = {
  PENDING: { label: 'Chờ lễ tân duyệt', tone: 'amber' },
  APPROVED: { label: 'Đã duyệt · Đang tính phí', tone: 'green' },
  REJECTED: { label: 'Yêu cầu bị từ chối', tone: 'red' },
}

export function RoomServiceOrder({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient()
  const [roomId, setRoomId] = useState(booking.rooms?.[0]?.roomId || 0)
  const [serviceId, setServiceId] = useState(0)
  const [quantity, setQuantity] = useState(1)

  const offerings = useQuery({
    queryKey: ['booking-room-offerings', booking.id],
    queryFn: async () =>
      Promise.all(booking.rooms.map((room) => request(api.get<ApiResponse<Room>>(`/rooms/${room.roomId}`)))),
    enabled: booking.status === 'CHECKED_IN',
  })

  const selectedRoom = booking.rooms.find((room) => room.roomId === roomId)
  const services =
    offerings.data?.find((room) => room.id === roomId)?.services?.filter((service) => service.active) || []
  const selectedService = services.find((service) => service.id === serviceId)
  const existingOrders = booking.serviceOrders?.filter((item) => !item.cancelled) || []

  const order = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<Booking>>(`/bookings/${booking.id}/services`, {
          bookingRoomId: selectedRoom?.bookingRoomId,
          serviceItemId: serviceId,
          quantity,
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã gửi yêu cầu dịch vụ cho phòng.')
      setServiceId(0)
      setQuantity(1)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking', String(booking.id)] }),
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['booking-invoice', String(booking.id)] }),
      ])
    },
    onError: (error) => toast.error(errorMessage(error, 'Chưa thể đặt dịch vụ.')),
  })

  if (booking.status !== 'CHECKED_IN') return null

  return (
    <article className="hg-panel hg-detail-section-card hg-service-card" aria-label="Đặt dịch vụ trong kỳ lưu trú">
      <div className="hg-detail-card-head">
        <div>
          <span className="hg-kicker">DỊCH VỤ TRONG KỲ LƯU TRÚ</span>
          <h2>Gọi dịch vụ cho phòng</h2>
          <p className="hg-service-lead">
            Chọn đúng phòng và dịch vụ bạn cần. Chi phí chỉ được cộng vào hóa đơn sau khi lễ tân duyệt yêu cầu.
          </p>
        </div>
        <ConciergeBell size={20} aria-hidden="true" />
      </div>

      {existingOrders.length > 0 && (
        <section className="hg-service-orders-block" aria-label="Danh sách dịch vụ đã yêu cầu">
          <h3>Dịch vụ đã yêu cầu ({existingOrders.length})</h3>
          <div className="hg-service-orders-list">
            {existingOrders.map((item, index) => {
              const statusKey = item.approvalStatus || 'APPROVED'
              const statusMeta = serviceApprovalMeta[statusKey]
              return (
                <div className="hg-service-order-row" key={item.id || `${item.name}-${index}`}>
                  <div className="hg-service-order-info">
                    <strong>
                      {item.roomNumber ? `Phòng ${item.roomNumber} · ` : ''}
                      {item.name}
                    </strong>
                    <span>
                      Số lượng: {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="hg-service-order-right">
                    <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
                    {statusKey === 'APPROVED' ? (
                      <b className="hg-service-order-price">{money(item.subTotal)}</b>
                    ) : (
                      <small className="hg-service-order-muted">
                        {statusKey === 'PENDING' ? 'Chưa tính vào hóa đơn' : 'Không tính phí'}
                      </small>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {offerings.isPending ? (
        <LoadingSkeleton variant="rows" count={3} />
      ) : offerings.isError ? (
        <ErrorState error={offerings.error} retry={() => void offerings.refetch()} />
      ) : (
        <div className="hg-service-composer">
          <div className="hg-service-room-select-row">
            <label className="hg-field hg-service-room-field">
              <span>Phòng áp dụng</span>
              <div className="hg-input-wrap">
                <select
                  aria-label="Chọn phòng áp dụng dịch vụ"
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(Number(e.target.value))
                    setServiceId(0)
                  }}
                >
                  {booking.rooms.map((room) => (
                    <option key={room.roomId} value={room.roomId}>
                      Phòng {room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          {!services.length ? (
            <EmptyState
              icon={<ConciergeBell size={22} strokeWidth={1.7} />}
              title="Phòng này chưa có dịch vụ được mở"
              detail="Hiện chưa có dịch vụ đang hoạt động cho phòng đã chọn."
            />
          ) : (
            <>
              <div className="hg-service-catalog" role="group" aria-label="Danh sách dịch vụ khả dụng">
                {services.map((service) => {
                  const selected = service.id === serviceId
                  return (
                    <button
                      type="button"
                      key={service.id}
                      aria-pressed={selected}
                      className={`hg-service-option ${selected ? 'is-selected' : ''}`}
                      onClick={() => setServiceId(service.id)}
                    >
                      <div className="hg-service-option-top">
                        <strong>{service.name}</strong>
                        {selected && (
                          <span className="hg-service-check" aria-hidden="true">
                            <Check size={14} />
                          </span>
                        )}
                      </div>
                      <div className="hg-service-option-price">
                        <b>{service.unitPrice === 0 ? 'Miễn phí' : money(service.unitPrice)}</b>
                        {service.unit && <span>/ {service.unit}</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="hg-service-order-bar">
                <div className="hg-service-qty-group">
                  <span>Số lượng</span>
                  <div className="hg-qty-stepper">
                    <button
                      type="button"
                      aria-label="Giảm số lượng dịch vụ"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      aria-label="Số lượng dịch vụ"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        if (Number.isNaN(next)) return
                        setQuantity(Math.min(99, Math.max(1, Math.trunc(next))))
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Tăng số lượng dịch vụ"
                      disabled={quantity >= 99}
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="hg-service-total-preview">
                  <span>Tạm tính</span>
                  <b>
                    {!selectedService
                      ? 'Chưa chọn dịch vụ'
                      : selectedService.unitPrice === 0
                        ? 'Miễn phí'
                        : money(selectedService.unitPrice * quantity)}
                  </b>
                </div>

                <button
                  type="button"
                  className="hg-btn hg-btn-primary"
                  disabled={!selectedRoom?.bookingRoomId || !selectedService || quantity < 1 || quantity > 99 || order.isPending}
                  onClick={() => order.mutate()}
                >
                  {order.isPending ? 'Đang gửi…' : 'Đặt dịch vụ'} <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </article>
  )
}
