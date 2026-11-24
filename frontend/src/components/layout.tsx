import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ConciergeBell,
  DoorOpen,
  Home,
  Info,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Phone,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { FloatingContactButtons } from './FloatingContactButtons'
import { api, request } from '../lib/api'
import type { ApiResponse, Booking } from '../lib/types'
import { getDirectionsUrl, getMapEmbedUrl, hotelContact, hotelLocation } from '../config/hotelLocation'

function useMobileDrawerClose(open: boolean, setOpen: (value: boolean) => void) {
  const location = useLocation()

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash, setOpen])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760
    const prevOverflow = document.body.style.overflow
    if (isMobile) document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    return () => {
      if (isMobile) document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen])
}

export function PublicLayout() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const location = useLocation()

  useMobileDrawerClose(open, setOpen)

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView())
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.hash])

  useEffect(() => {
    setAccountOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!accountOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [accountOpen])

  const logout = () => {
    setAccountOpen(false)
    setOpen(false)
    signOut()
    nav('/')
  }

  const isStaff = user?.role === 'ROLE_RECEPTIONIST' || user?.role === 'ROLE_ADMIN'
  const bookingsTarget = user ? '/my-bookings' : '/login?redirect=%2Fmy-bookings'

  return (
    <div className="customer-site">
      <a className="skip-link" href="#main-content">
        Đi tới nội dung
      </a>
      <header className="site-header">
        <div className="nav-wrap">
          <Link to="/" className="brand hotel-logo" aria-label="Hoàng Gia Hotel, trang chủ" onClick={() => setOpen(false)}>
            <img className="brand-crown" src="/logo-crown-transparent.png" alt="" />
            <span className="hotel-logo-name">Hoàng Gia</span>
            <small>HOTEL</small>
          </Link>

          <div className="mobile-header-actions">
            <Link
              to="/rooms"
              className="mobile-quick-link"
              onClick={() => setOpen(false)}
            >
              Phòng nghỉ
            </Link>
            {!user ? (
              <Link
                to="/login"
                className="mobile-quick-login"
                onClick={() => setOpen(false)}
              >
                Đăng nhập
              </Link>
            ) : user.role === 'ROLE_CUSTOMER' ? (
              <Link
                to="/my-bookings"
                className="mobile-quick-login"
                onClick={() => setOpen(false)}
              >
                Đặt phòng
              </Link>
            ) : user.role === 'ROLE_RECEPTIONIST' ? (
              <Link
                to="/reception"
                className="mobile-quick-login"
                onClick={() => setOpen(false)}
              >
                Lễ tân
              </Link>
            ) : (
              <Link
                to="/admin"
                className="mobile-quick-login"
                onClick={() => setOpen(false)}
              >
                Quản trị
              </Link>
            )}
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label={open ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>

          {open && (
            <div
              className="mobile-nav-backdrop"
              aria-hidden="true"
              onClick={() => setOpen(false)}
            />
          )}

          <nav
            id="public-mobile-nav"
            className={open ? 'main-nav open' : 'main-nav'}
            aria-label="Điều hướng chính"
          >
            <div className="main-nav-links">
              <NavLink to="/" end onClick={() => setOpen(false)}>
                <Home size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Trang chủ</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </NavLink>
              <NavLink to="/rooms" onClick={() => setOpen(false)}>
                <BedDouble size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Phòng nghỉ</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </NavLink>
              {!isStaff && (
                <NavLink to={bookingsTarget} className="mobile-only-nav-item" onClick={() => setOpen(false)}>
                  <ClipboardList size={17} className="mobile-nav-icon" aria-hidden="true" />
                  <span>Đơn đặt phòng</span>
                  <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
                </NavLink>
              )}
              <a href="/#experience" onClick={() => setOpen(false)}>
                <Sparkles size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Trải nghiệm</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </a>
              <a href="/#about" onClick={() => setOpen(false)}>
                <Info size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Giới thiệu</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </a>
            </div>

            {user ? (
              <>
                {user.role === 'ROLE_RECEPTIONIST' && (
                  <Link className="nav-secondary" to="/reception" onClick={() => setOpen(false)}>
                    Khu vực lễ tân
                  </Link>
                )}
                {user.role === 'ROLE_ADMIN' && (
                  <Link className="nav-secondary" to="/admin" onClick={() => setOpen(false)}>
                    Quản trị
                  </Link>
                )}

                {/* Desktop account dropdown */}
                <div className="account-menu desktop-only-account" ref={accountRef}>
                  <button
                    type="button"
                    className="account-trigger"
                    aria-label={`Tài khoản của ${profile?.fullName || user.fullName}`}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    onClick={() => setAccountOpen((value) => !value)}
                  >
                    <span className="account-trigger-icon" aria-hidden="true">
                      <img src="/a_clean_icon_style_image_a_simple_white_user_pers.png" alt="" width={1536} height={1024} />
                    </span>
                    <span className="account-trigger-name">{profile?.fullName || user.fullName}</span>
                    <ChevronDown size={15} className={accountOpen ? 'account-chevron open' : 'account-chevron'} />
                  </button>
                  {accountOpen && (
                    <div className="account-dropdown" role="menu">
                      <div className="account-dropdown-identity">
                        <strong>{profile?.fullName || user.fullName}</strong>
                        <small>{profile?.email || user.email}</small>
                      </div>
                      {user.role === 'ROLE_RECEPTIONIST' && (
                        <Link
                          role="menuitem"
                          to="/reception"
                          onClick={() => {
                            setAccountOpen(false)
                            setOpen(false)
                          }}
                        >
                          <LayoutDashboard size={18} /> Khu vực lễ tân
                        </Link>
                      )}
                      {user.role === 'ROLE_ADMIN' && (
                        <Link
                          role="menuitem"
                          to="/admin"
                          onClick={() => {
                            setAccountOpen(false)
                            setOpen(false)
                          }}
                        >
                          <LayoutDashboard size={18} /> Khu vực quản trị
                        </Link>
                      )}
                      {user.role === 'ROLE_CUSTOMER' && (
                        <Link
                          role="menuitem"
                          to="/my-bookings"
                          onClick={() => {
                            setAccountOpen(false)
                            setOpen(false)
                          }}
                        >
                          <BedDouble size={18} /> Đơn đặt phòng
                        </Link>
                      )}
                      <Link
                        role="menuitem"
                        to="/profile"
                        onClick={() => {
                          setAccountOpen(false)
                          setOpen(false)
                        }}
                      >
                        <UserRound size={18} /> Thông tin cá nhân
                      </Link>
                      <button type="button" role="menuitem" onClick={logout}>
                        <LogOut size={18} /> Đăng xuất
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct 1-tap mobile account links (avoids nested dropdown inside mobile drawer) */}
                <div className="mobile-account-panel">
                  <div className="mobile-account-identity">
                    <span className="account-trigger-icon" aria-hidden="true">
                      <img src="/a_clean_icon_style_image_a_simple_white_user_pers.png" alt="" width={1536} height={1024} />
                    </span>
                    <div>
                      <strong>{profile?.fullName || user.fullName}</strong>
                      <small>{profile?.email || user.email}</small>
                    </div>
                  </div>
                  <div className="mobile-account-links">
                    {user.role === 'ROLE_RECEPTIONIST' && (
                      <Link to="/reception" onClick={() => setOpen(false)}>
                        <LayoutDashboard size={17} /> Khu vực lễ tân
                      </Link>
                    )}
                    {user.role === 'ROLE_ADMIN' && (
                      <Link to="/admin" onClick={() => setOpen(false)}>
                        <LayoutDashboard size={17} /> Khu vực quản trị
                      </Link>
                    )}
                    <Link to="/profile" onClick={() => setOpen(false)}>
                      <UserRound size={17} /> Thông tin cá nhân
                    </Link>
                    <button type="button" className="mobile-logout-btn" onClick={logout}>
                      <LogOut size={17} /> Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mobile-auth-actions">
                <Link className="nav-login" to="/login" onClick={() => setOpen(false)}>
                  <LogIn size={16} className="mobile-nav-icon" aria-hidden="true" />
                  <span>Đăng nhập</span>
                </Link>
                <Link className="mobile-register-link" to="/register" onClick={() => setOpen(false)}>
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Tạo tài khoản</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <div id="main-content">
        <Outlet />
      </div>
      <footer className="site-footer hg-site-footer">
        <div className="footer-top">
          <div className="hg-footer-brand-col">
            <Link to="/" className="brand brand-light hotel-logo">
              <img className="brand-crown" src="/logo-crown-transparent.png" alt="" />
              <span className="hg-footer-logo-copy">
                <span className="hotel-logo-name">Hoàng Gia</span>
                <small>HOTEL</small>
              </span>
            </Link>
            <p className="hg-footer-tagline">
              Một khoảng dừng bình yên, được chăm chút đến từng chi tiết.
            </p>
          </div>
          <div className="hg-footer-col">
            <span className="footer-label">KHÁM PHÁ</span>
            <Link to="/rooms">Tìm phòng nghỉ</Link>
            <a href="/#experience">Trải nghiệm</a>
            <a href="/#about">Câu chuyện</a>
          </div>
          <div className="hg-footer-col">
            <span className="footer-label">KHÁCH LƯU TRÚ</span>
            {user?.role === 'ROLE_CUSTOMER' ? (
              <>
                <Link to="/my-bookings">Theo dõi đặt phòng</Link>
                <Link to="/profile">Thông tin tài khoản</Link>
              </>
            ) : (
              <>
                <Link to="/login">Đăng nhập</Link>
                <Link to="/register">Tạo tài khoản</Link>
              </>
            )}
            <a href="#footer-location">Bản đồ &amp; địa chỉ</a>
          </div>
          <div className="footer-note hg-footer-location-col" id="footer-location">
            <span className="footer-label">ĐỊA CHỈ &amp; LIÊN HỆ</span>
            <p className="hg-footer-address">
              <MapPin size={16} aria-hidden="true" />
              <span>{hotelLocation.address || 'Thông tin địa chỉ đang cập nhật'}</span>
            </p>
            {hotelContact.hotline && (
              <a
                className="hg-footer-hotline"
                href={`tel:${hotelContact.hotline.replace(/[\s().-]/g, '')}`}
              >
                <Phone size={15} aria-hidden="true" />
                <span>Hotline: {hotelContact.hotline}</span>
              </a>
            )}
            {getMapEmbedUrl() && (
              <iframe
                className="footer-map"
                title="Bản đồ vị trí khách sạn Hoàng Gia"
                src={getMapEmbedUrl()!}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
            {getDirectionsUrl() && (
              <a
                className="hg-footer-directions"
                href={getDirectionsUrl()!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Chỉ đường trên Google Maps</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Hoàng Gia Hotel</span>
        </div>
      </footer>
      <FloatingContactButtons />
    </div>
  )
}

type OpsNavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badgeCount?: number
}

function OpsSidebarShell({
  sidebarId,
  sectionTitle,
  navAriaLabel,
  homePath,
  navItems: items,
  helpTitle,
  helpSubtitle,
  helpIcon: HelpIcon,
}: {
  sidebarId: string
  sectionTitle: string
  navAriaLabel: string
  homePath: string
  navItems: OpsNavItem[]
  helpTitle: string
  helpSubtitle: string
  helpIcon: typeof Sparkles
}) {
  const [open, setOpen] = useState(false)
  useMobileDrawerClose(open, setOpen)

  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const logout = () => {
    setOpen(false)
    signOut()
    nav('/login')
  }

  return (
    <div className="reception-shell">
      {open && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
      <aside id={sidebarId} className={open ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head">
          <Link to={homePath} className="brand side-brand" onClick={() => setOpen(false)}>
            <img className="side-brand-crown" src="/logo-crown-transparent.png" alt="" />
            <span className="side-brand-copy">
              <strong>Hoàng Gia</strong>
              <small>HOTEL</small>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label="Đóng menu điều hướng"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="side-section">{sectionTitle}</div>
        <nav className="side-nav" aria-label={navAriaLabel}>
          {items.map(({ to, label, icon: Icon, end, badgeCount = 0 }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
              <Icon size={17} strokeWidth={1.8} />
              <span className="side-nav-label">{label}</span>
              {badgeCount > 0 && (
                <span className="nav-notification-badge" aria-label={`${badgeCount} thông báo chờ xử lý`}>
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="side-help">
            <HelpIcon size={16} />
            <span>
              {helpTitle}
              <br />
              <b>{helpSubtitle}</b>
            </span>
          </div>
          <Link to="/" className="side-home-link" onClick={() => setOpen(false)}>
            <Home size={16} /> Trang chủ khách sạn
          </Link>
          <button type="button" onClick={logout} className="side-logout">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>
      <main className="reception-main">
        <header className="reception-top">
          <button
            type="button"
            className="mobile-nav-toggle side-toggle"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            aria-controls={sidebarId}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu />
          </button>
          <div className="reception-top-title">
            <h1>Chào {user?.fullName?.split(' ').slice(-1)[0] || 'bạn'}</h1>
          </div>
          <div className="top-user">
            <div className="avatar" aria-hidden="true">
              <img src="/a_clean_icon_style_image_a_simple_white_user_pers.png" alt="" width={1536} height={1024} />
            </div>
            <div>
              <b>{user?.fullName}</b>
              <span>{user?.role === 'ROLE_ADMIN' ? 'Quản trị viên' : 'Lễ tân'}</span>
            </div>
          </div>
        </header>
        <div className="workspace">
          <Outlet />
        </div>
      </main>
    </div>
  )
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
  const location = useLocation()

  const pendingDeposits = useQuery({
    queryKey: ['reception-deposits'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/deposits/pending')),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const bookings = useQuery({
    queryKey: ['ops-bookings'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
  const [seenServiceOrderIds, setSeenServiceOrderIds] = useState<Set<number>>(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('maison-an-seen-service-orders') || '[]') as number[])
    } catch {
      return new Set()
    }
  })
  const serviceOrderIds = Array.from(
    new Set(
      (bookings.data || [])
        .flatMap((booking) => booking.serviceOrders || [])
        .filter((order) => !order.cancelled && order.id != null)
        .map((order) => order.id!),
    ),
  )
  const serviceOrderKey = serviceOrderIds.join(',')
  const unreadServiceCount = serviceOrderIds.filter((id) => !seenServiceOrderIds.has(id)).length

  useEffect(() => {
    if (location.pathname !== '/reception/services') return
    setSeenServiceOrderIds((current) => {
      const unread = serviceOrderIds.filter((id) => !current.has(id))
      if (!unread.length) return current
      const next = new Set([...current, ...serviceOrderIds])
      sessionStorage.setItem('maison-an-seen-service-orders', JSON.stringify(Array.from(next)))
      return next
    })
  }, [location.pathname, serviceOrderKey])

  const itemsWithBadges: OpsNavItem[] = navItems.map((item) => ({
    ...item,
    badgeCount:
      item.to === '/reception/deposits'
        ? pendingDeposits.data?.length || 0
        : item.to === '/reception/services'
          ? unreadServiceCount
          : 0,
  }))

  return (
    <OpsSidebarShell
      sidebarId="reception-sidebar"
      sectionTitle="VẬN HÀNH"
      navAriaLabel="Điều hướng lễ tân"
      homePath="/reception"
      navItems={itemsWithBadges}
      helpTitle="Ca trực hôm nay"
      helpSubtitle="Chúc bạn một ngày tốt lành"
      helpIcon={Sparkles}
    />
  )
}

const adminNavItems: OpsNavItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Nhân viên', icon: UserCog },
  { to: '/admin/pricing', label: 'Chiến lược giá', icon: SlidersHorizontal },
  { to: '/admin/rooms', label: 'Phòng nghỉ', icon: BedDouble },
  { to: '/admin/room-types', label: 'Hạng phòng', icon: DoorOpen },
  { to: '/admin/services', label: 'Dịch vụ', icon: ConciergeBell },
]

export function AdminLayout() {
  return (
    <OpsSidebarShell
      sidebarId="admin-sidebar"
      sectionTitle="QUẢN TRỊ HỆ THỐNG"
      navAriaLabel="Điều hướng quản trị"
      homePath="/admin"
      navItems={adminNavItems}
      helpTitle="Quản trị hệ thống"
      helpSubtitle="Danh mục và nhân sự"
      helpIcon={SlidersHorizontal}
    />
  )
}
