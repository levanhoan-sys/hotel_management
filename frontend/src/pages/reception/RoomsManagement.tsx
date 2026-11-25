import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, CircleAlert, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, Room, RoomStatus, RoomType, ServiceItem } from '../../lib/types'
import {
  ErrorPanel,
  Input,
  LoadingRows,
  Modal,
  PageTitle,
  RoomThumbnail,
  bookingNames,
  dateValue,
  money,
  parseImageUrls,
  roomFilterNames,
  roomNames,
  roomReservationStatus,
  statusTone,
  useFourRowTableScroll,
  useInvalidate,
  useOpsData,
} from './reception-helpers'

export function RoomsManagement() {
  const { rooms, bookings } = useOpsData()
  const roomTypes = useQuery({
    queryKey: ['ops-room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/reception/room-types')),
  })
  const roomServices = useQuery({
    queryKey: ['ops-services'],
    queryFn: () => request(api.get<ApiResponse<ServiceItem[]>>('/reception/services')),
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Room | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOperational, setConfirmOperational] = useState<{ room: Room; active: boolean } | null>(null)
  const [form, setForm] = useState({
    roomNumber: '',
    floor: '1',
    roomTypeId: '',
    serviceIds: [] as number[],
    imageUrlsText: '',
  })
  const invalidate = useInvalidate()

  const openForm = (room?: Room) => {
    setEditing(room || null)
    const matchedType = room ? roomTypes.data?.find((t) => t.name === room.roomTypeName) : undefined
    const initialImages = room
      ? room.imageUrls?.length
        ? room.imageUrls
        : room.imageUrl
          ? [room.imageUrl]
          : []
      : []
    setForm({
      roomNumber: room?.roomNumber || '',
      floor: String(room?.floor || 1),
      roomTypeId: room ? String(matchedType?.id || '') : '',
      serviceIds: room?.services?.map((service) => service.id) || [],
      imageUrlsText: initialImages.join('\n'),
    })
    setModalOpen(true)
  }

  useEffect(() => {
    if (!modalOpen || !editing || form.roomTypeId || !roomTypes.data?.length) return
    const matchedType = roomTypes.data.find((t) => t.name === editing.roomTypeName)
    if (matchedType) {
      setForm((prev) => (prev.roomTypeId ? prev : { ...prev, roomTypeId: String(matchedType.id) }))
    }
  }, [modalOpen, editing, form.roomTypeId, roomTypes.data])

  const applyRoomTypeImages = (typeId: string, force = false) => {
    const selectedType = roomTypes.data?.find((t) => String(t.id) === typeId)
    if (!selectedType) {
      setForm((prev) => ({ ...prev, roomTypeId: typeId }))
      return
    }
    const typeImages = selectedType.imageUrls?.length
      ? selectedType.imageUrls
      : selectedType.imageUrl
        ? [selectedType.imageUrl]
        : []
    setForm((prev) => ({
      ...prev,
      roomTypeId: typeId,
      imageUrlsText:
        typeImages.length && (force || !prev.imageUrlsText.trim()) ? typeImages.join('\n') : prev.imageUrlsText,
    }))
  }

  const parsedRoomImages = parseImageUrls(form.imageUrlsText)

  const saveRoom = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<Room>>({
          method: editing ? 'PUT' : 'POST',
          url: editing ? `/reception/rooms/${editing.id}` : '/reception/rooms',
          data: {
            roomNumber: form.roomNumber.trim(),
            floor: Number(form.floor),
            roomTypeId: Number(form.roomTypeId),
            serviceIds: form.serviceIds,
            imageUrls: parsedRoomImages,
          },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu thông tin phòng')
      setModalOpen(false)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const operational = useMutation({
    mutationFn: ({ room, active }: { room: Room; active: boolean }) =>
      request(api.patch<ApiResponse<null>>(`/reception/rooms/${room.id}/operational`, undefined, { params: { active } })),
    onSuccess: async (_, vars) => {
      toast.success(
        vars.active
          ? `Đã kích hoạt lại phòng ${vars.room.roomNumber}`
          : `Đã ngừng hoạt động phòng ${vars.room.roomNumber}`,
      )
      setConfirmOperational(null)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const changeStatus = useMutation({
    mutationFn: ({ id, status: next }: { id: number; status: RoomStatus }) =>
      request(api.patch<ApiResponse<null>>(`/reception/rooms/${id}/status`, undefined, { params: { status: next } })),
    onSuccess: async (_, vars) => {
      toast.success(`Đã chuyển trạng thái phòng sang ${roomNames[vars.status] || vars.status}`)
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const cleaned = useMutation({
    mutationFn: (id: number) => request(api.patch<ApiResponse<null>>(`/reception/rooms/${id}/cleaned`)),
    onSuccess: async () => {
      toast.success('Phòng đã được đánh dấu sẵn sàng')
      await invalidate()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allRooms = rooms.data || []
  const allBookings = bookings.data || []
  const getBlockingBookings = (room: Room) => {
    const today = dateValue(new Date())
    const now = Date.now()
    return allBookings.filter((b) => {
      if (b.checkOutDate <= today) return false
      const matchesRoom =
        b.rooms?.some((rm) => rm.roomId === room.id || rm.roomNumber === room.roomNumber) ||
        b.roomNumbers?.includes(room.roomNumber)
      if (!matchesRoom) return false
      if (b.status === 'PENDING_DEPOSIT') {
        return Boolean(b.depositDeadline && Date.parse(b.depositDeadline) > now)
      }
      if (b.status === 'PENDING_VERIFICATION') {
        return Boolean(b.verificationDeadline && Date.parse(b.verificationDeadline) > now)
      }
      return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status)
    })
  }
  const roomTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['AVAILABLE', 'Sẵn sàng'],
    ['CONFIRMED', 'Đã xác nhận'],
    ['OCCUPIED', 'Đang có khách'],
    ['CLEANING', 'Đang dọn'],
    ['MAINTENANCE', 'Bảo trì'],
  ]

  const filtered = allRooms.filter((r) => {
    const matchesStatus = !status || roomReservationStatus(r, allBookings) === status
    const q = search.trim().toLowerCase()
    const matchesQuery = !q || `${r.roomNumber} ${r.roomTypeName} tầng ${r.floor}`.toLowerCase().includes(q)
    return matchesStatus && matchesQuery
  })

  const hasRoomFilters = Boolean(search.trim() || status)
  const roomTableScrollRef = useFourRowTableScroll(filtered.length)

  return (
    <div className="ops-page">
      <PageTitle
        kicker="TÀI SẢN & SỨC CHỨA"
        title="Quản lý phòng"
        detail="Theo dõi trạng thái, hình ảnh từng phòng, dọn phòng và bảo trì"
        action={
          <button className="button button-dark" onClick={() => openForm()}>
            <Plus size={15} /> Thêm phòng
          </button>
        }
      />

      {rooms.isPending || bookings.isPending ? (
        <LoadingRows />
      ) : rooms.isError || bookings.isError ? (
        <ErrorPanel
          error={rooms.error || bookings.error}
          retry={() => {
            void rooms.refetch()
            void bookings.refetch()
          }}
        />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm phòng nghỉ">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc nhanh trạng thái phòng">
                {roomTabs.map(([value, label]) => (
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
                <b>{filtered.length}</b> phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm số phòng, tầng hoặc hạng phòng"
                  placeholder="Tìm số phòng, tầng hoặc hạng phòng…"
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
                <select aria-label="Lọc theo trạng thái phòng" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Tất cả trạng thái</option>
                  {Object.entries(roomFilterNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>

              {hasRoomFilters && (
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
            <div ref={roomTableScrollRef} className="table-scroll table-scroll-4">
              <table>
                <thead>
                  <tr>
                    <th>PHÒNG &amp; HÌNH ẢNH</th>
                    <th>HẠNG PHÒNG</th>
                    <th>TẦNG</th>
                    <th>SỨC CHỨA</th>
                    <th>GIÁ / ĐÊM</th>
                    <th>TRẠNG THÁI</th>
                    <th>HOẠT ĐỘNG</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const photoCount = r.imageUrls?.length || (r.imageUrl ? 1 : 0)
                    const thumbUrl = r.imageUrl || r.imageUrls?.[0]
                    const hasBlockingBooking = getBlockingBookings(r).length > 0
                    const statusOptions: RoomStatus[] =
                      r.status === 'OCCUPIED' ? ['OCCUPIED'] : ['AVAILABLE', 'CLEANING', 'MAINTENANCE']
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="room-table-cell">
                            <RoomThumbnail src={thumbUrl} alt={`Phòng ${r.roomNumber}`} className="room-table-thumb" />
                            <div className="room-table-meta">
                              <b className="room-number">Phòng {r.roomNumber}</b>
                              <small className="cell-sub">
                                Mã #{r.id} — {photoCount > 0 ? `${photoCount} ảnh` : 'Chưa có ảnh'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <b>{r.roomTypeName}</b>
                          {(r.areaSqm || (r.services && r.services.length > 0)) && (
                            <small className="cell-sub">
                              {[
                                r.areaSqm ? `${r.areaSqm} m²` : '',
                                r.services && r.services.length > 0 ? `${r.services.length} dịch vụ` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </small>
                          )}
                        </td>
                        <td>Tầng {r.floor}</td>
                        <td>{r.capacity} khách</td>
                        <td>{money(r.basePrice)}</td>
                        <td>
                          <span className={`status-badge ${statusTone(roomReservationStatus(r, allBookings))}`}>
                            {roomFilterNames[roomReservationStatus(r, allBookings)]}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${r.operational ? 'green' : 'gray'}`}>
                            {r.operational ? 'Đang hoạt động' : 'Đã ngừng'}
                          </span>
                        </td>
                        <td>
                          <div className="actions-inline">
                            <button type="button" className="table-action" onClick={() => openForm(r)}>
                              Sửa
                            </button>
                            {r.status === 'CLEANING' ? (
                              <button
                                type="button"
                                className="table-action"
                                disabled={cleaned.isPending}
                                onClick={() => cleaned.mutate(r.id)}
                              >
                                <Check size={14} /> Đã dọn
                              </button>
                            ) : (
                              <select
                                className="status-select"
                                aria-label={`Đổi trạng thái phòng ${r.roomNumber}`}
                                value={r.status}
                                title={
                                  !r.operational
                                    ? 'Kích hoạt lại phòng trước khi đổi trạng thái'
                                    : r.status === 'OCCUPIED'
                                      ? 'Phòng đang có khách lưu trú'
                                      : undefined
                                }
                                disabled={changeStatus.isPending || !r.operational || r.status === 'OCCUPIED'}
                                onChange={(e) => changeStatus.mutate({ id: r.id, status: e.target.value as RoomStatus })}
                              >
                                {statusOptions.map((k) => (
                                  <option
                                    key={k}
                                    value={k}
                                    disabled={k === 'MAINTENANCE' && hasBlockingBooking}
                                  >
                                    {k === 'MAINTENANCE' && hasBlockingBooking
                                      ? `${roomNames[k]} (đang có đơn)`
                                      : roomNames[k]}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              className="table-action"
                              disabled={operational.isPending}
                              onClick={() => setConfirmOperational({ room: r, active: !r.operational })}
                            >
                              {r.operational ? 'Ngừng' : 'Kích hoạt'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!filtered.length && <div className="empty-table">Không tìm thấy phòng phù hợp</div>}
            </div>
          </section>
        </>
      )}

      {confirmOperational && (() => {
        const blockingBookings = !confirmOperational.active ? getBlockingBookings(confirmOperational.room) : []
        const blockedByStayOrBooking =
          !confirmOperational.active && (confirmOperational.room.status === 'OCCUPIED' || blockingBookings.length > 0)

        return (
          <Modal
            title={
              confirmOperational.active
                ? `Kích hoạt phòng ${confirmOperational.room.roomNumber}`
                : `Ngừng hoạt động phòng ${confirmOperational.room.roomNumber}`
            }
            close={() => setConfirmOperational(null)}
          >
            <div className="modal-form">
              <div className="ops-confirm-summary">
                <div>
                  <span>Phòng</span>
                  <b>
                    Phòng {confirmOperational.room.roomNumber} — {confirmOperational.room.roomTypeName}
                  </b>
                </div>
                <div>
                  <span>Tầng</span>
                  <b>Tầng {confirmOperational.room.floor}</b>
                </div>
              </div>
              {blockedByStayOrBooking ? (
                <p className="inline-warning is-danger">
                  <CircleAlert size={15} />
                  <span>
                    {confirmOperational.room.status === 'OCCUPIED'
                      ? 'Phòng đang có khách lưu trú nên chưa thể ngừng hoạt động.'
                      : `Không thể ngừng hoạt động vì phòng đang có đơn đặt phòng hiệu lực (${blockingBookings
                          .map((b) => `${b.bookingCode} · ${bookingNames[b.status] || b.status}`)
                          .join(', ')}). Hãy hủy hoặc đổi phòng cho đơn trước.`}
                  </span>
                </p>
              ) : (
                <p className="inline-warning">
                  <CircleAlert size={15} />
                  <span>
                    {confirmOperational.active
                      ? 'Phòng sẽ mở lại để lễ tân và khách hàng có thể đặt phòng.'
                      : 'Phòng tạm ngừng sẽ không xuất hiện trong danh sách chọn phòng mới cho đến khi được kích hoạt lại.'}
                  </span>
                </p>
              )}
              <div className="ops-modal-actions">
                <button
                  type="button"
                  className="button button-outline"
                  disabled={operational.isPending}
                  onClick={() => setConfirmOperational(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className={confirmOperational.active ? 'button button-dark' : 'button button-danger'}
                  disabled={operational.isPending || blockedByStayOrBooking}
                  onClick={() => operational.mutate(confirmOperational)}
                >
                  {operational.isPending
                    ? 'Đang xử lý…'
                    : confirmOperational.active
                      ? 'Xác nhận kích hoạt'
                      : 'Xác nhận ngừng hoạt động'}
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {modalOpen && (
        <Modal title={editing ? `Cập nhật phòng ${editing.roomNumber}` : 'Thêm phòng mới'} close={() => setModalOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.roomNumber.trim() || Number(form.floor) < 1 || !Number(form.roomTypeId)) {
                return toast.error('Vui lòng nhập số phòng, tầng và hạng phòng hợp lệ')
              }
              saveRoom.mutate()
            }}
          >
            <Input
              label="Số phòng"
              value={form.roomNumber}
              onChange={(roomNumber) => setForm({ ...form, roomNumber })}
              required
            />
            <Input
              label="Tầng"
              value={form.floor}
              type="number"
              onChange={(floor) => setForm({ ...form, floor })}
              required
            />
            <label className="form-field">
              <span>Hạng phòng</span>
              <select
                value={form.roomTypeId}
                onChange={(e) => applyRoomTypeImages(e.target.value, false)}
                required
              >
                <option value="">Chọn hạng phòng</option>
                {roomTypes.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {money(t.basePrice)}
                  </option>
                ))}
              </select>
            </label>

            <div className="room-gallery-field">
              <div className="room-gallery-header">
                <span className="section-kicker">HÌNH ẢNH PHÒNG ({parsedRoomImages.length} ẢNH)</span>
                {form.roomTypeId && (
                  <button
                    type="button"
                    className="room-gallery-fill-btn"
                    onClick={() => applyRoomTypeImages(form.roomTypeId, true)}
                  >
                    Dùng ảnh theo hạng phòng
                  </button>
                )}
              </div>
              <label className="form-field">
                <span>Danh sách URL hình ảnh phòng (mỗi dòng 1 URL)</span>
                <textarea
                  value={form.imageUrlsText}
                  onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              {parsedRoomImages.length > 0 && (
                <div className="room-gallery-preview-grid" aria-label="Xem trước hình ảnh phòng">
                  {parsedRoomImages.slice(0, 8).map((url, idx) => (
                    <RoomThumbnail
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`Ảnh phòng ${idx + 1}`}
                      className="room-gallery-thumb"
                      iconSize={16}
                    />
                  ))}
                </div>
              )}
            </div>

            <fieldset className="room-choice-list">
              <legend>Dịch vụ của phòng</legend>
              {roomServices.data
                ?.filter((service) => service.active)
                .map((service) => (
                  <label key={service.id}>
                    <input
                      type="checkbox"
                      checked={form.serviceIds.includes(service.id)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          serviceIds: e.target.checked
                            ? [...form.serviceIds, service.id]
                            : form.serviceIds.filter((id) => id !== service.id),
                        })
                      }
                    />
                    <span>{service.name}</span>
                    <b>{money(service.unitPrice)}</b>
                  </label>
                ))}
            </fieldset>

            <button className="button button-dark full-button" disabled={saveRoom.isPending || roomTypes.isPending}>
              {saveRoom.isPending ? 'Đang lưu…' : 'Lưu phòng'} <Check size={15} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
