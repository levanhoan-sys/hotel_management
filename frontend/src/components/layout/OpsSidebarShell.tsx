import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, LayoutDashboard, LogOut, Menu, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { formatStaffGreetingName, useMobileDrawerClose } from './layout-utils'

export type OpsNavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badgeCount?: number
}

export function OpsSidebarShell({
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
            <img className="side-brand-crown" src="/images/logo-crown.png" alt="" />
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
            <h1>Chào {formatStaffGreetingName(user)}</h1>
          </div>
          <div className="top-user">
            <div className="avatar" aria-hidden="true">
              <img src="/images/avatar-default.png" alt="" width={1536} height={1024} />
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
