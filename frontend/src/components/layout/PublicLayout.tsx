import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowUpRight,
  BedDouble,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  Info,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { FloatingContactButtons } from '../FloatingContactButtons'
import { getDirectionsUrl, getMapEmbedUrl, hotelContact, hotelLocation } from '../../config/hotelLocation'
import { useMobileDrawerClose } from './layout-utils'

export function PublicLayout() {
  const { user, profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const location = useLocation()

  useMobileDrawerClose(open, setOpen)

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = location.hash.slice(1)
    const scrollTarget = () => {
      const el = document.getElementById(id)
      if (!el) return false
      el.scrollIntoView({ behavior: 'smooth' })
      return true
    }
    if (!scrollTarget()) {
      const timer = window.setTimeout(scrollTarget, 120)
      return () => window.clearTimeout(timer)
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
            <img className="brand-crown" src="/images/logo-crown.png" alt="" />
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
              <Link
                to="/#experience"
                onClick={() => {
                  setOpen(false)
                  if (location.pathname === '/' && location.hash === '#experience') {
                    document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                <Sparkles size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Trải nghiệm</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </Link>
              <Link
                to="/#about"
                onClick={() => {
                  setOpen(false)
                  if (location.pathname === '/' && location.hash === '#about') {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                <Info size={17} className="mobile-nav-icon" aria-hidden="true" />
                <span>Giới thiệu</span>
                <ChevronRight size={16} className="mobile-nav-arrow" aria-hidden="true" />
              </Link>
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
                      <img src="/images/avatar-default.png" alt="" width={1536} height={1024} />
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
                      {user.role === 'ROLE_CUSTOMER' && (
                        <>
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
                        </>
                      )}
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
                      <img src="/images/avatar-default.png" alt="" width={1536} height={1024} />
                    </span>
                    <div>
                      <strong>{profile?.fullName || user.fullName}</strong>
                      <small>{profile?.email || user.email}</small>
                    </div>
                  </div>
                  <div className="mobile-account-links">
                    {user.role === 'ROLE_CUSTOMER' && (
                      <Link to="/profile" onClick={() => setOpen(false)}>
                        <UserRound size={17} /> Thông tin cá nhân
                      </Link>
                    )}
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
              <img className="brand-crown" src="/images/logo-crown.png" alt="" />
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
            <Link
              to="/#experience"
              onClick={() => {
                if (location.pathname === '/' && location.hash === '#experience') {
                  document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              Trải nghiệm
            </Link>
            <Link
              to="/#about"
              onClick={() => {
                if (location.pathname === '/' && location.hash === '#about') {
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              Câu chuyện
            </Link>
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
