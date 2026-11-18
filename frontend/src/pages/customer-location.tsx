import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check, Copy, MapPin, Navigation, Phone, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { hotelContact, hotelLocation, getDirectionsUrl } from '../config/hotelLocation'

export function HotelLocationPage() {
  const [mapLoaded, setMapLoaded] = useState(false)
  const directionsUrl = getDirectionsUrl()
  const copyAddress = async () => {
    if (!hotelLocation.address) {
      toast.error('Địa chỉ khách sạn chưa được cấu hình.')
      return
    }
    try {
      await navigator.clipboard.writeText(hotelLocation.address)
      toast.success('Đã sao chép địa chỉ')
    } catch {
      toast.error('Không thể sao chép địa chỉ. Vui lòng chọn và sao chép thủ công.')
    }
  }

  return <main className="location-page">
    <div className="location-container">
      <nav className="location-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span aria-current="page">Vị trí</span></nav>
      <header className="location-heading"><span className="section-kicker">TÌM ĐẾN CHÚNG TÔI</span><h1>Vị trí khách sạn</h1><p>Khám phá vị trí của chúng tôi và tìm đường đến khách sạn một cách dễ dàng.</p></header>

      <section className="location-layout" aria-label="Thông tin vị trí khách sạn">
        <article className="location-card">
          <span className="location-icon"><MapPin size={22} aria-hidden="true" /></span>
          <p className="location-label">ĐIỂM ĐẾN CỦA BẠN</p>
          <h2>{hotelLocation.name || 'Khách sạn'}</h2>
          <div className="location-address"><MapPin size={18} aria-hidden="true" /><span>{hotelLocation.address || 'Địa chỉ đang được cập nhật.'}</span></div>
          <div className="location-actions">
            <button className="button button-outline" type="button" onClick={() => void copyAddress()} disabled={!hotelLocation.address} aria-label="Sao chép địa chỉ khách sạn"><Copy size={16} /> Sao chép địa chỉ</button>
            {directionsUrl ? <a className="button button-dark" href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label="Mở chỉ đường đến khách sạn trên Google Maps"><Navigation size={16} /> Chỉ đường <ArrowUpRight size={15} aria-hidden="true" /></a> : <button className="button button-dark" type="button" disabled aria-label="Chưa có địa chỉ để chỉ đường"><Navigation size={16} /> Chỉ đường</button>}
          </div>
          <div className="location-card-foot"><Check size={15} aria-hidden="true" /><span>Bản đồ và thông tin đường đi được cung cấp bởi Google Maps.</span></div>
        </article>

        <section className="location-map-section" aria-label="Bản đồ Google Maps">
          <div className="location-map">
            {hotelLocation.mapEmbedUrl ? <>
              {!mapLoaded && <div className="map-loading" role="status"><span className="spinner" /> Đang tải bản đồ…</div>}
              <iframe src={hotelLocation.mapEmbedUrl} title={`Bản đồ vị trí ${hotelLocation.name || 'khách sạn'}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen onLoad={() => setMapLoaded(true)} />
            </> : <div className="map-placeholder"><span><MapPin size={24} aria-hidden="true" /></span><h2>Bản đồ đang được cập nhật</h2><p>Khách sạn sẽ sớm bổ sung bản đồ vị trí. Bạn vẫn có thể xem địa chỉ và mở chỉ đường nếu thông tin đã được cấu hình.</p>{directionsUrl && <a href={directionsUrl} target="_blank" rel="noopener noreferrer">Mở Google Maps <ArrowUpRight size={15} /></a>}</div>}
          </div>
          <p className="map-caption">{mapLoaded ? 'Kéo để khám phá khu vực xung quanh khách sạn.' : 'Bản đồ tương tác giúp bạn dễ dàng khám phá khu vực.'}</p>
        </section>
      </section>

      <section className="location-contact" aria-labelledby="location-contact-title">
        <div><span className="section-kicker">CHÚNG TÔI LUÔN SẴN SÀNG HỖ TRỢ</span><h2 id="location-contact-title">Cần hỗ trợ tìm đường?</h2><p>Liên hệ với đội ngũ khách sạn nếu bạn cần thêm thông tin trước chuyến đi.</p></div>
        <div className="location-contact-actions">
          {hotelContact.hotline && <a className="location-contact-link" href={`tel:${hotelContact.hotline.replace(/[\s().-]/g, '')}`}><Phone size={18} /><span><small>HOTLINE</small>{hotelContact.hotline}</span></a>}
          {hotelContact.zaloUrl && <a className="location-contact-link" href={hotelContact.zaloUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /><span><small>ZALO</small>Nhắn tin với chúng tôi</span><ArrowUpRight size={15} /></a>}
          {!hotelContact.hotline && !hotelContact.zaloUrl && <p className="location-contact-empty">Thông tin liên hệ sẽ được cập nhật tại đây.</p>}
        </div>
      </section>
    </div>
  </main>
}
