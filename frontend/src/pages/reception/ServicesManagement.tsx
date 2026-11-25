import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, ServiceItem, ServiceUsage } from '../../lib/types'
import {
  ErrorPanel,
  Input,
  LoadingRows,
  Modal,
  PageTitle,
  money,
  useFourRowTableScroll,
  useOpsData,
} from './reception-helpers'

function PendingServiceRequests({
  items,
  loading,
  error,
  reviewing,
  retry,
  onReview,
}: {
  items?: ServiceUsage[]
  loading: boolean
  error: unknown
  reviewing: boolean
  retry: () => void
  onReview: (id: number, decision: 'approve' | 'reject') => void
}) {
  if (error) {
    return (
      <section className="panel">
        <div className="panel-heading">
          <h3>Yêu cầu dịch vụ</h3>
        </div>
        <ErrorPanel error={error} retry={retry} />
      </section>
    )
  }
  if (loading || !items?.length) return null
  return (
    <section className="panel pending-service-panel">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">CẦN XỬ LÝ</span>
          <h3>Yêu cầu dịch vụ ({items.length})</h3>
        </div>
        <span className="status-badge amber">Chờ duyệt</span>
      </div>
      <div className="pending-service-list">
        {items.map((item) => (
          <article className="pending-service-row" key={item.id}>
            <div>
              <b>
                {item.serviceName} × {item.quantity} {item.unit}
              </b>
              <span>
                {item.customerName} — {item.bookingCode} — Phòng {item.roomNumber || '—'}
              </span>
              <small>
                {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(item.orderedAt),
                )}
              </small>
            </div>
            <strong>{money(item.subTotal)}</strong>
            <div className="actions-inline">
              <button className="table-action" disabled={reviewing} onClick={() => onReview(item.id, 'approve')}>
                Duyệt
              </button>
              <button
                className="table-action danger-outline"
                disabled={reviewing}
                onClick={() =>
                  window.confirm(`Từ chối yêu cầu ${item.serviceName} của ${item.customerName}?`) &&
                  onReview(item.id, 'reject')
                }
              >
                Từ chối
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function ServicesManagement() {
  const queryClient = useQueryClient()
  const { bookings } = useOpsData()
  const services = useQuery({
    queryKey: ['ops-services'],
    queryFn: () => request(api.get<ApiResponse<ServiceItem[]>>('/reception/services')),
  })
  const pendingUsages = useQuery({
    queryKey: ['pending-service-requests'],
    queryFn: () => request(api.get<ApiResponse<ServiceUsage[]>>('/reception/service-usages/pending')),
  })
  const reviewUsage = useMutation({
    mutationFn: ({ id, decision }: { id: number; decision: 'approve' | 'reject' }) =>
      request(api.patch<ApiResponse<ServiceUsage>>(`/reception/service-usages/${id}/${decision}`, {})),
    onSuccess: async (_, variables) => {
      toast.success(variables.decision === 'approve' ? 'Đã duyệt yêu cầu dịch vụ' : 'Đã từ chối yêu cầu dịch vụ')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pending-service-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['ops-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['service-usages'] }),
      ])
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const [editing, setEditing] = useState<ServiceItem | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', unitPrice: '', unit: 'lần' })
  const [bookingId, setBookingId] = useState('')
  const [bookingRoomId, setBookingRoomId] = useState('')
  const [serviceItemId, setServiceItemId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const checkedInBookings = (bookings.data || []).filter((b) => b.status === 'CHECKED_IN')
  const activeBooking = checkedInBookings.find((b) => String(b.id) === bookingId)
  const activeRoomId = activeBooking?.rooms?.some((room) => String(room.roomId) === bookingRoomId)
    ? bookingRoomId
    : String(activeBooking?.rooms?.[0]?.roomId || '')
  const activeBookingRoom = activeBooking?.rooms?.find((room) => String(room.roomId) === activeRoomId)

  const usages = useQuery({
    queryKey: ['service-usages', bookingId],
    queryFn: () => request(api.get<ApiResponse<ServiceUsage[]>>(`/reception/bookings/${bookingId}/service-usages`)),
    enabled: Boolean(bookingId),
  })

  const openForm = (item?: ServiceItem) => {
    setEditing(item || null)
    setForm({ name: item?.name || '', unitPrice: String(item?.unitPrice || ''), unit: item?.unit || 'lần' })
    setOpen(true)
  }

  const save = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<ServiceItem>>({
          method: editing ? 'PUT' : 'POST',
          url: editing ? `/reception/services/${editing.id}` : '/reception/services',
          data: { ...form, unitPrice: Number(form.unitPrice) },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu dịch vụ')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ops-services'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const toggle = useMutation({
    mutationFn: (item: ServiceItem) =>
      request(
        api.patch<ApiResponse<ServiceItem>>(`/reception/services/${item.id}/active`, undefined, {
          params: { active: !item.active },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã cập nhật trạng thái dịch vụ')
      await queryClient.invalidateQueries({ queryKey: ['ops-services'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const addUsage = useMutation({
    mutationFn: () =>
      request(
        api.post<ApiResponse<ServiceUsage>>(`/reception/bookings/${bookingId}/service-usages`, {
          bookingRoomId: activeBookingRoom?.bookingRoomId,
          serviceItemId: Number(serviceItemId),
          quantity: Number(quantity),
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã thêm dịch vụ vào booking')
      setServiceItemId('')
      setQuantity('1')
      await queryClient.invalidateQueries({ queryKey: ['service-usages', bookingId] })
      await queryClient.invalidateQueries({ queryKey: ['ops-bookings'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cancelUsage = useMutation({
    mutationFn: (id: number) =>
      request(api.patch<ApiResponse<ServiceUsage>>(`/reception/service-usages/${id}/cancel`, { reason: 'Điều chỉnh tại quầy' })),
    onSuccess: async () => {
      toast.success('Đã hủy khoản dịch vụ')
      await queryClient.invalidateQueries({ queryKey: ['service-usages', bookingId] })
      await queryClient.invalidateQueries({ queryKey: ['ops-bookings'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const serviceTableScrollRef = useFourRowTableScroll(services.data?.length ?? 0, 6)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="TIỆN ÍCH & DỊCH VỤ"
        title="Dịch vụ khách sạn"
        detail="Quản lý danh mục dịch vụ và mức giá khách sạn cung cấp"
        action={
          <button className="button button-dark" onClick={() => openForm()}>
            <Plus size={16} /> Thêm dịch vụ
          </button>
        }
      />

      <PendingServiceRequests
        items={pendingUsages.data}
        loading={pendingUsages.isPending}
        error={pendingUsages.error}
        reviewing={reviewUsage.isPending}
        retry={() => void pendingUsages.refetch()}
        onReview={(id, decision) => reviewUsage.mutate({ id, decision })}
      />

      <section className="panel usage-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">PHÁT SINH TRONG KỲ LƯU TRÚ</span>
            <h3>Ghi nhận dịch vụ</h3>
            <p className="panel-sub-note">
              Thêm dịch vụ phát sinh (giặt ủi, ăn uống, đưa đón…) trực tiếp vào hóa đơn của khách đang lưu trú.
            </p>
          </div>
          <span className="live-pill">
            {bookings.isPending ? 'Đang tải booking…' : `${checkedInBookings.length} booking đang lưu trú`}
          </span>
        </div>

        {bookings.isError ? (
          <ErrorPanel error={bookings.error} retry={() => void bookings.refetch()} />
        ) : (
          <>
            <form
              className="usage-form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (!checkedInBookings.length) {
                  return toast.error('Hiện chưa có booking nào đang lưu trú (đã nhận phòng).')
                }
                if (!bookingId || !activeBookingRoom?.bookingRoomId) {
                  return toast.error('Vui lòng chọn booking và phòng đang lưu trú.')
                }
                if (!serviceItemId) {
                  return toast.error('Vui lòng chọn dịch vụ muốn thêm.')
                }
                if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
                  return toast.error('Số lượng phải là số nguyên từ 1 trở lên.')
                }
                addUsage.mutate()
              }}
            >
              <label className="form-field">
                <span>Booking</span>
                <select
                  value={bookingId}
                  disabled={bookings.isPending || !checkedInBookings.length}
                  onChange={(e) => {
                    setBookingId(e.target.value)
                    setBookingRoomId('')
                  }}
                >
                  <option value="">
                    {bookings.isPending
                      ? 'Đang tải booking…'
                      : checkedInBookings.length
                        ? 'Chọn khách đang lưu trú'
                        : 'Chưa có khách đang lưu trú'}
                  </option>
                  {checkedInBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} — {b.customerName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Phòng trong booking</span>
                <select
                  value={activeRoomId}
                  onChange={(e) => setBookingRoomId(e.target.value)}
                  disabled={!activeBooking}
                >
                  <option value="">{activeBooking ? 'Chọn phòng' : 'Chọn booking trước'}</option>
                  {activeBooking?.rooms?.map((r) => (
                    <option key={r.roomId} value={r.roomId}>
                      Phòng {r.roomNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Dịch vụ</span>
                <select
                  value={serviceItemId}
                  disabled={!checkedInBookings.length}
                  onChange={(e) => setServiceItemId(e.target.value)}
                >
                  <option value="">Chọn dịch vụ</option>
                  {services.data
                    ?.filter((s) => s.active)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {money(s.unitPrice)}/{s.unit}
                      </option>
                    ))}
                </select>
              </label>
              <label className="form-field">
                <span>Số lượng</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  disabled={!checkedInBookings.length}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="button button-dark"
                disabled={addUsage.isPending || bookings.isPending}
              >
                <Plus size={15} /> {addUsage.isPending ? 'Đang thêm…' : 'Thêm vào booking'}
              </button>
            </form>

            {!bookings.isPending && !checkedInBookings.length && (
              <p className="usage-empty-hint">
                Hiện chưa có khách nào ở trạng thái đang lưu trú (đã nhận phòng). Khi có khách nhận phòng tại quầy, bạn có thể chọn booking ở trên để ghi nhận dịch vụ phát sinh vào hóa đơn.
              </p>
            )}
          </>
        )}

        {bookingId && (
          <div className="usage-history">
            <div className="usage-history-heading">
              <span className="section-kicker">LỊCH SỬ BOOKING</span>
              <span>{usages.data?.length || 0} dòng</span>
            </div>
            {usages.isPending ? (
              <LoadingRows count={2} />
            ) : usages.isError ? (
              <ErrorPanel error={usages.error} retry={() => void usages.refetch()} />
            ) : usages.data?.length ? (
              usages.data.map((usage) => (
                <div className={`usage-row ${usage.cancelled ? 'cancelled' : ''}`} key={usage.id}>
                  <div>
                    <b>{usage.serviceName}</b>
                    <small>
                      Phòng {usage.roomNumber || '—'}, {usage.quantity} {usage.unit}
                    </small>
                  </div>
                  <span>{usage.approvalStatus === 'APPROVED' ? money(usage.subTotal) : '—'}</span>
                  {usage.approvalStatus === 'PENDING' ? (
                    <span className="status-badge amber">Chờ duyệt</span>
                  ) : usage.approvalStatus === 'REJECTED' ? (
                    <span className="status-badge gray">Từ chối</span>
                  ) : usage.cancelled ? (
                    <span className="status-badge gray">Đã hủy</span>
                  ) : (
                    <button
                      className="table-action"
                      disabled={cancelUsage.isPending}
                      onClick={() =>
                        window.confirm(`Hủy ${usage.serviceName} khỏi hóa đơn?`) && cancelUsage.mutate(usage.id)
                      }
                    >
                      Hủy khoản
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-compact">Booking chưa phát sinh dịch vụ</div>
            )}
          </div>
        )}
      </section>

      {services.isPending ? (
        <LoadingRows />
      ) : services.isError ? (
        <ErrorPanel error={services.error} retry={() => void services.refetch()} />
      ) : (
        <section className="panel table-panel">
          <div ref={serviceTableScrollRef} className="table-scroll table-scroll-6">
            <table>
              <thead>
                <tr>
                  <th>DỊCH VỤ</th>
                  <th>ĐƠN GIÁ</th>
                  <th>ĐƠN VỊ</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {services.data?.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <b>{s.name}</b>
                      <small className="cell-sub">Mã dịch vụ #{s.id}</small>
                    </td>
                    <td>
                      <b>{money(s.unitPrice)}</b>
                    </td>
                    <td>{s.unit || '—'}</td>
                    <td>
                      <span className={`status-badge ${s.active ? 'green' : 'gray'}`}>
                        {s.active ? 'Đang phục vụ' : 'Đã tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-inline">
                        <button className="table-action" onClick={() => openForm(s)}>
                          Chỉnh sửa
                        </button>
                        <button className="table-action" disabled={toggle.isPending} onClick={() => toggle.mutate(s)}>
                          {s.active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!services.data?.length && <div className="empty-table">Chưa có dịch vụ trong danh mục</div>}
          </div>
        </section>
      )}

      {open && (
        <Modal title={editing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ'} close={() => setOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.name.trim() || Number(form.unitPrice) <= 0) {
                return toast.error('Vui lòng nhập tên và đơn giá hợp lệ')
              }
              save.mutate()
            }}
          >
            <Input
              label="Tên dịch vụ"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              required
            />
            <Input
              label="Đơn giá (VND)"
              value={form.unitPrice}
              type="money"
              onChange={(unitPrice) => setForm({ ...form, unitPrice })}
              required
            />
            <Input
              label="Đơn vị"
              value={form.unit}
              onChange={(unit) => setForm({ ...form, unit })}
            />
            <button className="button button-dark full-button" disabled={save.isPending}>
              Lưu dịch vụ <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
