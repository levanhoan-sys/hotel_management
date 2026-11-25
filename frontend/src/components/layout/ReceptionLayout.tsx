import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BedDouble,
  CalendarDays,
  ClipboardList,
  ConciergeBell,
  DoorOpen,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { api, request } from '../../lib/api'
import type { ApiResponse, Booking } from '../../lib/types'
import { OpsSidebarShell, type OpsNavItem } from './OpsSidebarShell'

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
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
  const bookings = useQuery({
    queryKey: ['ops-bookings'],
    queryFn: () => request(api.get<ApiResponse<Booking[]>>('/reception/bookings')),
    refetchInterval: 30_000,
    refetchOnMount: 'always',
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
