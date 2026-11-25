import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Plus, Search, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, request } from '../../lib/api'
import type { ApiResponse, RoomType } from '../../lib/types'
import { ErrorPanel, Input, LoadingRows, Modal, PageTitle, RoomThumbnail, money, parseImageUrls } from './reception-helpers'

export function RoomTypesManagement() {
  const queryClient = useQueryClient()
  const types = useQuery({
    queryKey: ['ops-room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/reception/room-types')),
  })
  const [search, setSearch] = useState('')
  const [capacityFilter, setCapacityFilter] = useState('')
  const [sortBy, setSortBy] = useState('DEFAULT')
  const [editing, setEditing] = useState<RoomType | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    basePrice: '',
    capacity: '2',
    description: '',
    imageUrl: '',
    imageUrlsText: '',
    areaSqm: '',
    amenities: '',
  })
  const [id, setId] = useState<number | null>(null)

  const reset = (type?: RoomType) => {
    setId(type?.id ?? null)
    const gallery = type?.imageUrls?.length ? type.imageUrls : type?.imageUrl ? [type.imageUrl] : []
    setForm({
      name: type?.name || '',
      basePrice: String(type?.basePrice || ''),
      capacity: String(type?.capacity || 2),
      description: type?.description || '',
      imageUrl: type?.imageUrl || gallery[0] || '',
      imageUrlsText: gallery.join('\n'),
      areaSqm: String(type?.areaSqm || ''),
      amenities: type?.amenities || '',
    })
    setEditing(type || null)
    setOpen(true)
  }

  const parsedGallery = parseImageUrls(
    [form.imageUrl.trim(), ...parseImageUrls(form.imageUrlsText)].filter(Boolean).join('\n'),
  )

  const mutation = useMutation({
    mutationFn: () =>
      request(
        api.request<ApiResponse<RoomType>>({
          method: id ? 'PUT' : 'POST',
          url: id ? `/reception/room-types/${id}` : '/reception/room-types',
          data: {
            name: form.name,
            basePrice: Number(form.basePrice),
            capacity: Number(form.capacity),
            description: form.description,
            imageUrl: form.imageUrl.trim() || parsedGallery[0] || '',
            imageUrls: parsedGallery,
            areaSqm: form.areaSqm ? Number(form.areaSqm) : null,
            amenities: form.amenities,
          },
        }),
      ),
    onSuccess: async () => {
      toast.success('Đã lưu hạng phòng')
      setOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['ops-room-types'] })
      await queryClient.invalidateQueries({ queryKey: ['room-types'] })
      await queryClient.invalidateQueries({ queryKey: ['ops-rooms'] })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const allTypes = types.data || []
  const matchesCapacity = (capacity: number, filterKey: string) => {
    if (filterKey === '1-2') return capacity <= 2
    if (filterKey === '3-4') return capacity >= 3 && capacity <= 4
    if (filterKey === '5+') return capacity >= 5
    return true
  }

  const capacityTabs: Array<[string, string]> = [
    ['', 'Tất cả'],
    ['1-2', '1–2 khách'],
    ['3-4', '3–4 khách'],
    ['5+', 'Từ 5 khách'],
  ]

  const filteredTypes = allTypes
    .filter((t) => {
      const q = search.trim().toLowerCase()
      const matchesQuery =
        !q || `${t.name} ${t.description || ''} ${t.amenities || ''}`.toLowerCase().includes(q)
      return matchesQuery && matchesCapacity(t.capacity, capacityFilter)
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.basePrice - b.basePrice
      if (sortBy === 'PRICE_DESC') return b.basePrice - a.basePrice
      if (sortBy === 'CAPACITY_DESC') return b.capacity - a.capacity
      return 0
    })

  const hasTypeFilters = Boolean(search.trim() || capacityFilter || sortBy !== 'DEFAULT')

  return (
    <div className="ops-page">
      <PageTitle
        kicker="DANH MỤC LƯU TRÚ"
        title="Hạng phòng"
        detail="Cập nhật tiện nghi, bộ sưu tập hình ảnh, sức chứa và mức giá niêm yết"
        action={
          <button className="button button-dark" onClick={() => reset()}>
            <Plus size={16} /> Thêm hạng phòng
          </button>
        }
      />

      {types.isPending ? (
        <LoadingRows />
      ) : types.isError ? (
        <ErrorPanel error={types.error} retry={() => void types.refetch()} />
      ) : (
        <>
          <section className="panel ops-filter-panel" aria-label="Bộ lọc và tìm kiếm hạng phòng">
            <div className="ops-filter-top">
              <div className="ops-status-tabs" role="group" aria-label="Lọc theo sức chứa hạng phòng">
                {capacityTabs.map(([value, label]) => (
                  <button
                    key={value || 'ALL'}
                    type="button"
                    className={capacityFilter === value ? 'is-active' : ''}
                    aria-pressed={capacityFilter === value}
                    onClick={() => setCapacityFilter(value)}
                  >
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="ops-result-count">
                <b>{filteredTypes.length}</b> hạng phòng
              </div>
            </div>

            <div className="ops-filter-row">
              <label className="ops-search-box">
                <Search size={17} aria-hidden="true" />
                <input
                  aria-label="Tìm tên hạng phòng, tiện nghi hoặc mô tả"
                  placeholder="Tìm tên hạng phòng, tiện nghi, mô tả…"
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
                <span>SẮP XẾP</span>
                <select aria-label="Sắp xếp hạng phòng" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="DEFAULT">Mặc định</option>
                  <option value="PRICE_ASC">Giá thấp đến cao</option>
                  <option value="PRICE_DESC">Giá cao đến thấp</option>
                  <option value="CAPACITY_DESC">Sức chứa cao đến thấp</option>
                </select>
              </label>

              {hasTypeFilters && (
                <button
                  type="button"
                  className="ops-reset-btn"
                  onClick={() => {
                    setSearch('')
                    setCapacityFilter('')
                    setSortBy('DEFAULT')
                  }}
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </section>

          {filteredTypes.length === 0 ? (
            <div className="panel">
              <div className="empty-table">Không tìm thấy hạng phòng phù hợp</div>
            </div>
          ) : (
            <div className="type-admin-scroll">
              <div className="type-admin-grid">
                {filteredTypes.map((t, i) => {
                  const coverSrc = t.imageUrl || t.imageUrls?.[0]
                  const photoCount = t.imageUrls?.length || (t.imageUrl ? 1 : 0)
                  const indexLabel = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`
                  return (
                    <article className="type-admin-card" key={t.id}>
                      <div className="type-admin-art">
                        <span>{indexLabel}</span>
                        <RoomThumbnail src={coverSrc} alt={t.name} className="type-admin-cover" iconSize={34} />
                      </div>
                      <div className="type-admin-content">
                        <div>
                          <span className="section-kicker">MÃ HẠNG #{t.id}</span>
                          <h3>{t.name}</h3>
                        </div>
                        <p>{t.description || 'Chưa có mô tả'}</p>
                        <div className="type-admin-meta">
                          <div className="type-admin-specs">
                            <span>
                              <Users size={14} /> {t.capacity} khách
                            </span>
                            <span>{photoCount > 0 ? `${photoCount} ảnh` : 'Chưa có ảnh'}</span>
                          </div>
                          <b>
                            {money(t.basePrice)} <small>/ đêm</small>
                          </b>
                        </div>
                        <button className="button button-outline full-button" onClick={() => reset(t)}>
                          Chỉnh sửa hạng phòng
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {open && (
        <Modal title={editing ? 'Cập nhật hạng phòng' : 'Thêm hạng phòng'} close={() => setOpen(false)}>
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.name.trim() || Number(form.basePrice) <= 0 || Number(form.capacity) < 1) {
                return toast.error('Vui lòng kiểm tra tên, giá và sức chứa')
              }
              mutation.mutate()
            }}
          >
            <Input
              label="Tên hạng phòng"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              required
            />
            <Input
              label="Giá cơ bản / đêm (VND)"
              value={form.basePrice}
              type="money"
              onChange={(basePrice) => setForm({ ...form, basePrice })}
              required
            />
            <Input
              label="Sức chứa tối đa"
              value={form.capacity}
              type="number"
              onChange={(capacity) => setForm({ ...form, capacity })}
              required
            />
            <Input
              label="Diện tích (m²)"
              value={form.areaSqm}
              type="number"
              onChange={(areaSqm) => setForm({ ...form, areaSqm })}
            />
            <label className="form-field">
              <span>Tiện nghi (ngăn cách bằng dấu phẩy)</span>
              <textarea
                value={form.amenities}
                onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                placeholder="Wi-Fi, điều hòa, TV"
              />
            </label>
            <Input
              label="URL ảnh đại diện chính"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
            />
            <div className="room-gallery-field">
              <div className="room-gallery-header">
                <span className="section-kicker">BỘ SƯU TẬP ẢNH ({parsedGallery.length} ẢNH)</span>
              </div>
              <label className="form-field">
                <span>Danh sách URL thư viện ảnh (mỗi dòng 1 URL)</span>
                <textarea
                  value={form.imageUrlsText}
                  onChange={(e) => setForm({ ...form, imageUrlsText: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              {parsedGallery.length > 0 && (
                <div className="room-gallery-preview-grid" aria-label="Xem trước thư viện ảnh hạng phòng">
                  {parsedGallery.slice(0, 8).map((url, idx) => (
                    <RoomThumbnail
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`Ảnh hạng phòng ${idx + 1}`}
                      className="room-gallery-thumb"
                      iconSize={16}
                    />
                  ))}
                </div>
              )}
            </div>
            <label className="form-field">
              <span>Mô tả</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <p className="inline-warning">
              <CircleAlert size={15} /> Giá cơ bản mới không thay đổi mức giá của các đơn đã đặt
            </p>
            <button className="button button-dark full-button" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu…' : 'Lưu hạng phòng'} <Check size={16} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
