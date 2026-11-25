import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useMobileDrawerClose(open: boolean, setOpen: (value: boolean) => void) {
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

export function formatStaffGreetingName(user?: { fullName?: string | null; role?: string } | null): string {
  const fullName = user?.fullName?.trim()
  const normalized = fullName?.toLowerCase()
  if (user?.role === 'ROLE_ADMIN' && (!fullName || normalized === 'quản trị viên')) {
    return 'quản trị viên'
  }
  if (normalized === 'lễ tân') {
    return 'lễ tân'
  }
  if (!fullName) return 'bạn'
  return fullName.split(/\s+/).slice(-1)[0] || 'bạn'
}
