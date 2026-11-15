import { useEffect, useState } from 'react'
import { Copy, PhoneCall, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog } from './ui/dialog'

const configuredZaloUrl = import.meta.env.VITE_ZALO_PERSONAL_URL?.trim() ?? ''
const configuredHotline = import.meta.env.VITE_HOTLINE_NUMBER?.trim() ?? ''

function getZaloUrl(value: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'zalo.me' || url.hostname.endsWith('.zalo.me')) ? url.href : null
  } catch {
    return null
  }
}

function getPhone(value: string): string | null {
  const normalized = value.replace(/[\s().-]/g, '')
  return /^\+?\d{7,15}$/.test(normalized) ? normalized : null
}

const zaloUrl = getZaloUrl(configuredZaloUrl)
const phone = getPhone(configuredHotline)

export function FloatingContactButtons() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => setIsMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV && configuredZaloUrl && !zaloUrl) console.warn('VITE_ZALO_PERSONAL_URL must be a valid HTTPS Zalo URL (for example https://zalo.me/...).')
    if (import.meta.env.DEV && configuredHotline && !phone) console.warn('VITE_HOTLINE_NUMBER must contain a valid international or local phone number.')
  }, [])

  if (!zaloUrl && !phone) return null

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phone!)
      toast.success('Đã sao chép số điện thoại')
    } catch {
      toast.error('Không thể sao chép số điện thoại. Vui lòng chọn và sao chép thủ công.')
    }
  }

  return <>
    <div className="floating-contact" aria-label="Liên hệ khách sạn">
      {zaloUrl && <a className="floating-contact-button zalo-contact" href={zaloUrl} target="_blank" rel="noopener noreferrer" aria-label="Chat với nhân viên qua Zalo" title="Chat với nhân viên qua Zalo"><span aria-hidden="true">Zalo</span></a>}
      {phone && (isMobile
        ? <a className="floating-contact-button hotline-contact" href={`tel:${phone}`} aria-label={`Gọi hotline ${phone}`} title="Gọi nhân viên tư vấn"><PhoneCall size={21} aria-hidden="true" /></a>
        : <button className="floating-contact-button hotline-contact" type="button" onClick={() => setDialogOpen(true)} aria-label="Gọi nhân viên tư vấn" title="Gọi nhân viên tư vấn"><PhoneCall size={21} aria-hidden="true" /></button>)}
    </div>
    {phone && <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Liên hệ tư vấn khách sạn">
      <div className="contact-dialog-content">
        <p>Nhân viên của chúng tôi sẵn sàng hỗ trợ bạn về đặt phòng, thanh toán và các dịch vụ khách sạn.</p>
        <div className="contact-phone-number"><span>HOTLINE</span><strong>{phone}</strong></div>
        <div className="contact-dialog-actions">
          <button type="button" className="button button-outline" onClick={() => void copyPhone()}><Copy size={16} /> Sao chép số</button>
          <a className="button button-dark" href={`tel:${phone}`}><PhoneCall size={16} /> Thử gọi ngay</a>
        </div>
        <p className="contact-call-hint">Nếu máy tính không có ứng dụng gọi điện, hãy dùng điện thoại để gọi số trên.</p>
        <button type="button" className="contact-dialog-close" onClick={() => setDialogOpen(false)}><X size={15} /> Đóng</button>
      </div>
    </Dialog>}
  </>
}
