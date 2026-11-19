import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BedDouble, CalendarDays, ChevronDown, ClipboardList, ConciergeBell, DoorOpen, LayoutDashboard, LogOut, Menu, ReceiptText, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { FloatingContactButtons } from './FloatingContactButtons'
import { api, request } from '../lib/api'
import type { ApiResponse, Booking } from '../lib/types'

export function PublicLayout() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const logout = () => { signOut(); nav('/') }
  return <div className="customer-site"><a className="skip-link" href="#main-content">Đi tới nội dung</a><header className="site-header"><div className="nav-wrap">
    <Link to="/" className="brand" aria-label="Hoàng Gia Hotel, trang chủ"><span className="brand-mark">H</span><span>HOÀNG GIA <small>KHÁCH SẠN · HÀ NỘI</small></span></Link>
    <button className="mobile-nav-toggle" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    <nav className={open ? 'main-nav open' : 'main-nav'} aria-label="Điều hướng chính"><NavLink to="/rooms" onClick={() => setOpen(false)}>Phòng nghỉ</NavLink><NavLink to="/location" onClick={() => setOpen(false)}>Vị trí</NavLink><a href="/#about" onClick={() => setOpen(false)}>Về Hoàng Gia</a>
      {user ? <>{user.role === 'ROLE_CUSTOMER' && <><Link className="nav-secondary" to="/my-bookings" onClick={() => setOpen(false)}>Đơn đặt phòng</Link><Link className="nav-profile" to="/profile" onClick={() => setOpen(false)}>Tài khoản</Link></>}{user.role === 'ROLE_RECEPTIONIST' && <Link className="nav-secondary" to="/reception" onClick={() => setOpen(false)}>Khu vực lễ tân</Link>}<button className="nav-login" onClick={logout}>Đăng xuất</button></> : <Link className="nav-login" to="/login" onClick={() => setOpen(false)}>Đăng nhập <span>↗</span></Link>}
    </nav>
  </div></header><div id="main-content"><Outlet /></div><footer className="site-footer"><div className="footer-top"><div><Link to="/" className="brand brand-light"><span className="brand-mark">H</span><span>HOÀNG GIA <small>KHÁCH SẠN · HÀ NỘI</small></span></Link><p>Một khoảng dừng bình yên,<br />được chăm chút đến từng chi tiết.</p></div><div><span className="footer-label">KHÁM PHÁ</span><Link to="/rooms">Tìm phòng nghỉ</Link><Link to="/location">Vị trí</Link><a href="/#experience">Trải nghiệm</a><a href="/#about">Câu chuyện</a></div><div><span className="footer-label">DÀNH CHO KHÁCH LƯU TRÚ</span>{user?.role === 'ROLE_CUSTOMER' ? <><Link to="/my-bookings">Theo dõi đặt phòng</Link><Link to="/profile">Thông tin tài khoản</Link></> : <><Link to="/login">Đăng nhập</Link><Link to="/register">Tạo tài khoản</Link></>}</div><div className="footer-note">HÀ ĐÔNG, HÀ NỘI<br /><span>Không gian nghỉ dưỡng tinh tế.</span></div></div><div className="footer-bottom"><span>© 2026 Hoàng Gia Hotel</span><span>Hà Đông, Hà Nội, Việt Nam</span></div></footer><FloatingContactButtons /></div>
}

const navItems = [
  { to: '/reception', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/reception/bookings', label: 'Đặt phòng', icon: ClipboardList },
  { to: '/reception/rooms', label: 'Phòng nghỉ', icon: BedDouble },
  { to: '/reception/room-types', label: 'Hạng phòng', icon: DoorOpen },
  { to: '/reception/calendar', label: 'Lịch phòng', icon: CalendarDays },
  { to: '/reception/check-in', label: 'Nhận phòng', icon: Users },
  { to: '/reception/check-out', label: 'Trả phòng', icon: LogOut },
  { to: '/reception/services', label: 'Dịch vụ', icon: ConciergeBell },
  { to: '/reception/invoices', label: 'Hóa đơn', icon: ReceiptText },
    { to: '/reception/deposits', label: 'Xác nhận tiền cọc', icon: ShieldCheck },
]
export function ReceptionLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const pendingDeposits = useQuery({ queryKey: ['reception-deposits'], queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/deposits/pending')), refetchInterval: 30_000, refetchOnWindowFocus: true })
  const bookings = useQuery({ queryKey: ['ops-bookings'], queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')), refetchInterval: 30_000, refetchOnWindowFocus: true })
  const [seenServiceOrderIds, setSeenServiceOrderIds] = useState<Set<number>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('maison-an-seen-service-orders') || '[]') as number[]) } catch { return new Set() }
  })
  const serviceOrderIds = Array.from(new Set((bookings.data || []).flatMap(booking => booking.serviceOrders || []).filter(order => !order.cancelled && order.id != null).map(order => order.id!)))
  const serviceOrderKey = serviceOrderIds.join(',')
  const unreadServiceCount = serviceOrderIds.filter(id => !seenServiceOrderIds.has(id)).length
  useEffect(() => {
    if (location.pathname !== '/reception/services') return
    setSeenServiceOrderIds(current => {
      const unread = serviceOrderIds.filter(id => !current.has(id))
      if (!unread.length) return current
      const next = new Set([...current, ...serviceOrderIds])
      sessionStorage.setItem('maison-an-seen-service-orders', JSON.stringify(Array.from(next)))
      return next
    })
  }, [location.pathname, serviceOrderKey])
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const logout = () => { signOut(); nav('/login') }
  return <div className="reception-shell"><aside className={open ? 'sidebar open' : 'sidebar'}><Link to="/reception" className="brand side-brand"><span className="brand-mark">H</span><span>HOÀNG GIA <small>KHÁCH SẠN</small></span></Link><div className="side-section">VẬN HÀNH</div><nav className="side-nav">{navItems.map(({ to, label, icon: Icon, end }) => { const count = to === '/reception/deposits' ? pendingDeposits.data?.length || 0 : to === '/reception/services' ? unreadServiceCount : 0; return <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}><Icon size={17} strokeWidth={1.8} /><span className="side-nav-label">{label}</span>{count > 0 && <span className="nav-notification-badge" aria-label={`${count} thông báo chờ xử lý`}>{count > 99 ? '99+' : count}</span>}</NavLink>})}</nav><div className="side-bottom"><div className="side-help"><Sparkles size={16} /><span>Ca trực hôm nay<br /><b>Chúc bạn một ngày tốt lành</b></span></div><button onClick={logout} className="side-logout"><LogOut size={16} /> Đăng xuất</button></div></aside><main className="reception-main"><header className="reception-top"><button className="mobile-nav-toggle side-toggle" aria-label="Mở menu" onClick={() => setOpen(!open)}><Menu /></button><div><span className="eyebrow">HOÀNG GIA · VẬN HÀNH</span><h1>Chào {user?.fullName?.split(' ').slice(-1)[0] || 'bạn'}</h1></div><div className="top-user"><div className="avatar">{user?.fullName?.charAt(0) || 'L'}</div><div><b>{user?.fullName}</b><span>{user?.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Lễ tân'}</span></div><ChevronDown size={16} /></div></header><div className="workspace"><Outlet /></div></main></div>
}
