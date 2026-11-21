import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { AdminLayout, PublicLayout, ReceptionLayout } from './components/layout'
const HomePage = lazy(() => import('./pages/customer').then(m => ({ default: m.HomePage })))
const RoomsPage = lazy(() => import('./pages/customer').then(m => ({ default: m.RoomsPage })))
const RoomDetailPage = lazy(() => import('./pages/customer').then(m => ({ default: m.RoomDetailPage })))
const AuthPage = lazy(() => import('./pages/customer').then(m => ({ default: m.AuthPage })))
const BookingPage = lazy(() => import('./pages/customer').then(m => ({ default: m.BookingPage })))
const MyBookingsPage = lazy(() => import('./pages/customer').then(m => ({ default: m.MyBookingsPage })))
const BookingDetailPage = lazy(() => import('./pages/customer').then(m => ({ default: m.BookingDetailPage })))
const ProfilePage = lazy(() => import('./pages/customer').then(m => ({ default: m.ProfilePage })))
const HotelLocationPage = lazy(() => import('./pages/customer-location').then(m => ({ default: m.HotelLocationPage })))
const ReceptionHome = lazy(() => import('./pages/reception').then(m => ({ default: m.ReceptionHome })))
const ReceptionPage = lazy(() => import('./pages/reception').then(m => ({ default: m.ReceptionPage })))
const DepositVerificationPage = lazy(() => import('./pages/reception').then(m => ({ default: m.DepositVerificationPage })))
const AdminHome = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminHome })))
const AdminEmployees = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminEmployees })))
const AdminPricing = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminPricing })))

export function Guard({ staff, children }: { staff?: 'reception' | 'admin'; children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loading"><span className="spinner" /> Đang kiểm tra phiên đăng nhập…</div>
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (staff === 'reception' && user.role !== 'ROLE_RECEPTIONIST') return <Navigate to={user.role === 'ROLE_ADMIN' ? '/admin' : '/'} replace />
  if (staff === 'admin' && user.role !== 'ROLE_ADMIN') return <Navigate to={user.role === 'ROLE_RECEPTIONIST' ? '/reception' : '/'} replace />
  if (!staff && user.role !== 'ROLE_CUSTOMER') return <Navigate to={user.role === 'ROLE_RECEPTIONIST' ? '/reception' : '/admin'} replace />
  return children
}

export default function App() {
  return <Suspense fallback={<div className="page-loading"><span className="spinner" /> Đang tải trang…</div>}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/rooms" element={<RoomsPage />} />
      <Route path="/location" element={<HotelLocationPage />} />
      <Route path="/rooms/:id" element={<RoomDetailPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/booking" element={<Guard><BookingPage /></Guard>} />
      <Route path="/my-bookings" element={<Guard><MyBookingsPage /></Guard>} />
      <Route path="/my-bookings/:id" element={<Guard><BookingDetailPage /></Guard>} />
      <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
    </Route>
    <Route path="/reception" element={<Guard staff="reception"><ReceptionLayout /></Guard>}>
      <Route index element={<ReceptionHome />} />
      <Route path="rooms" element={<ReceptionPage kind="rooms" />} />
      <Route path="room-types" element={<ReceptionPage kind="room-types" />} />
      <Route path="bookings" element={<ReceptionPage kind="bookings" />} />
      <Route path="calendar" element={<ReceptionPage kind="calendar" />} />
      <Route path="check-in" element={<ReceptionPage kind="check-in" />} />
      <Route path="check-out" element={<ReceptionPage kind="check-out" />} />
      <Route path="services" element={<ReceptionPage kind="services" />} />
      <Route path="invoices" element={<ReceptionPage kind="invoices" />} />
      <Route path="deposits" element={<DepositVerificationPage />} />
    </Route>
    <Route path="/admin" element={<Guard staff="admin"><AdminLayout /></Guard>}>
      <Route index element={<AdminHome />} />
      <Route path="employees" element={<AdminEmployees />} />
      <Route path="pricing" element={<AdminPricing />} />
      <Route path="rooms" element={<ReceptionPage kind="rooms" />} />
      <Route path="room-types" element={<ReceptionPage kind="room-types" />} />
      <Route path="services" element={<ReceptionPage kind="services" />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>
}
