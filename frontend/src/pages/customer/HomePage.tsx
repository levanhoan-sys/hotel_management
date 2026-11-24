import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, BadgeCheck, BedDouble, ConciergeBell, Flower2, MapPin } from 'lucide-react'
import { api, request } from '../../lib/api'
import type { ApiResponse, RoomType, ServiceItem } from '../../lib/types'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/shared'
import { DateSearch, money, roomDescription, RoomImage } from './customer-helpers'

export function HomePage() {
  const types = useQuery({
    queryKey: ['room-types'],
    queryFn: () => request(api.get<ApiResponse<RoomType[]>>('/room-types')),
  })
  const services = useQuery({
    queryKey: ['services'],
    queryFn: () => request(api.get<ApiResponse<ServiceItem[]>>('/services')),
  })

  return (
    <main className="hg-home">
      <section className="hg-hero" aria-labelledby="hotel-home-title">
        <div className="hg-hero-photo" />
        <div className="hg-hero-scrim" />
        <div className="hg-container hg-hero-inner">
          <div className="hg-hero-content">
            <span className="hg-hero-eyebrow">ĐIỂM DỪNG CHÂN THANH LỊCH, DỊCH VỤ TẬN TÂM</span>
            <h1 id="hotel-home-title">Không gian nghỉ dưỡng tinh tế tại Hoàng Gia</h1>
            <p>
              Phòng nghỉ tiện nghi tại Hà Đông, Hà Nội. Chọn ngày lưu trú và tìm phòng phù hợp cho chuyến đi của bạn.
            </p>
            <div className="hg-hero-actions">
              <Link className="hg-btn hg-btn-gold" to="/rooms">
                Xem phòng <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <a className="hg-btn hg-hero-ghost" href="#about">
                Giới thiệu
              </a>
            </div>
          </div>
        </div>
        <small className="hg-hero-caption">Ảnh minh họa</small>
      </section>

      <section className="hg-container hg-search-dock" id="find-rooms" aria-label="Tìm phòng theo ngày lưu trú">
        <DateSearch showRoomType={false} />
      </section>

      <section className="hg-highlights" aria-label="Điểm nổi bật của Hoàng Gia">
        <div className="hg-container">
          <div className="hg-highlights-grid">
            <div className="hg-highlight-item">
              <MapPin size={22} strokeWidth={1.6} aria-hidden="true" />
              <h2>Vị trí thuận tiện</h2>
              <p>Dễ dàng tìm đường và lên kế hoạch di chuyển tại Hà Đông.</p>
            </div>
            <div className="hg-highlight-item">
              <BedDouble size={22} strokeWidth={1.6} aria-hidden="true" />
              <h2>Phòng nghỉ tiện nghi</h2>
              <p>Chọn hạng phòng phù hợp với số khách và ngân sách của bạn.</p>
            </div>
            <div className="hg-highlight-item">
              <ConciergeBell size={22} strokeWidth={1.6} aria-hidden="true" />
              <h2>Dịch vụ chu đáo</h2>
              <p>Xem các dịch vụ đang được khách sạn cung cấp trong kỳ lưu trú.</p>
            </div>
            <div className="hg-highlight-item">
              <BadgeCheck size={22} strokeWidth={1.6} aria-hidden="true" />
              <h2>Đặt trực tiếp rõ ràng</h2>
              <p>Xem giá và thông tin đặt phòng ngay trước khi gửi yêu cầu.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="hg-story" id="about">
        <div className="hg-container">
          <div className="hg-story-rule">
            <span className="hg-kicker">LỜI CHÀO TỪ HOÀNG GIA HOTEL</span>
          </div>
          <div className="hg-story-grid">
            <h2 className="hg-serif-em">
              Chậm lại một nhịp,
              <br />
              để thấy <em>điều đẹp đẽ.</em>
            </h2>
            <div className="hg-story-copy">
              <p className="hg-story-lead">
                Một nơi để trở về sau những ngày dài. Một khoảng riêng tư để bạn nghỉ ngơi theo cách của mình.
              </p>
              <p>
                HOÀNG GIA chăm chút trải nghiệm lưu trú bằng sự giản dị, ấm áp và những lựa chọn rõ ràng ngay từ lúc
                đặt phòng.
              </p>
              <Link to="/rooms" className="hg-editorial-link">
                Tìm hiểu các hạng phòng <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <div className="hg-story-seal" aria-hidden="true">
              <div>
                <Flower2 size={24} strokeWidth={1.2} />
                <div>
                  REST
                  <br />
                  WELL
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hg-showcase" id="rooms">
        <div className="hg-container">
          <div className="hg-section-head">
            <div>
              <span className="hg-kicker">KHÔNG GIAN LƯU TRÚ</span>
              <h2 className="hg-serif-em">
                Khám phá <em>hạng phòng.</em>
              </h2>
              <p>Chọn không gian phù hợp cho kỳ nghỉ của bạn.</p>
            </div>
            <Link to="/rooms" className="hg-editorial-link">
              Xem tất cả phòng <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {types.isPending ? (
            <LoadingSkeleton variant="cards" count={3} />
          ) : types.isError ? (
            <ErrorState error={types.error} retry={() => void types.refetch()} />
          ) : types.data?.length ? (
            <div className="hg-type-grid">
              {types.data.slice(0, 3).map((type, i) => (
                <Link className="hg-type-card" to={`/rooms?roomTypeId=${type.id}`} key={type.id}>
                  <div className="hg-type-media">
                    <RoomImage room={type} />
                    <span className="hg-type-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="hg-type-arrow" aria-hidden="true">
                      <ArrowUpRight size={18} />
                    </span>
                  </div>
                  <div className="hg-type-body">
                    <div className="hg-type-head">
                      <div>
                        <span className="hg-kicker">
                          TỐI ĐA {type.capacity} KHÁCH{type.areaSqm ? ` · ${type.areaSqm} M²` : ''}
                        </span>
                        <h3>{type.name}</h3>
                      </div>
                      <div className="hg-type-price">
                        <span>Từ</span>
                        <b>{money(type.basePrice)}</b>
                        <small>/ đêm</small>
                      </div>
                    </div>
                    <p>{roomDescription(type.description)}</p>
                    <span className="hg-type-foot">
                      Xem chi tiết <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có hạng phòng để giới thiệu"
              detail="Hãy quay lại sau hoặc mở danh sách phòng để kiểm tra."
            />
          )}
        </div>
      </section>

      <section className="hg-experience" id="experience">
        <div className="hg-experience-media">
          <div className="hg-experience-photo" />
          <span className="hg-photo-tag">Ảnh minh họa · Không gian lưu trú</span>
        </div>
        <div className="hg-experience-body">
          <span className="hg-kicker">TRẢI NGHIỆM TẠI HOÀNG GIA HOTEL</span>
          <h2 className="hg-serif-em">
            Mọi thứ bắt đầu
            <br />
            từ cảm giác <em>thoải mái.</em>
          </h2>
          <p>
            Khám phá những dịch vụ hiện đang được khách sạn cung cấp để kỳ nghỉ của bạn thêm trọn vẹn.
          </p>

          {services.isPending ? (
            <p className="hg-service-muted">Đang tải dịch vụ…</p>
          ) : services.isError ? (
            <p className="hg-service-muted">Chưa thể tải danh mục dịch vụ. Bạn vẫn có thể tìm và đặt phòng.</p>
          ) : services.data?.length ? (
            <div className="hg-service-preview">
              {services.data
                .filter((service) => service.active)
                .slice(0, 3)
                .map((service) => (
                  <div className="hg-service-preview-row" key={service.id}>
                    <span>{service.name}</span>
                    <b>
                      {service.unitPrice === 0 ? 'Miễn phí' : money(service.unitPrice)}
                      {service.unit ? ` / ${service.unit}` : ''}
                    </b>
                  </div>
                ))}
            </div>
          ) : (
            <p className="hg-service-muted">Hiện chưa có dịch vụ nào trong danh mục.</p>
          )}

          <Link to="/rooms" className="hg-btn hg-btn-gold">
            Tìm phòng phù hợp <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  )
}
