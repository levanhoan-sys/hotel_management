import {
  BedDouble,
  ConciergeBell,
  DoorOpen,
  LayoutDashboard,
  SlidersHorizontal,
  UserCog,
} from 'lucide-react'
import { OpsSidebarShell, type OpsNavItem } from './OpsSidebarShell'

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
