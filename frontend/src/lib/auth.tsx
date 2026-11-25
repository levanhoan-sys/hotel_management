import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { api, request, tokenKey } from './api'
import type { AuthUser, Profile } from './types'

type AuthContextValue = { user: AuthUser | null; profile: Profile | null; loading: boolean; signIn: (user: AuthUser) => void; signOut: () => void; reloadProfile: () => Promise<void> }
const AuthContext = createContext<AuthContextValue | null>(null)
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const signOut = () => { sessionStorage.removeItem(tokenKey); setUser(null); setProfile(null) }
  const signIn = (next: AuthUser) => { sessionStorage.setItem(tokenKey, next.token); setUser(next) }
  const reloadProfile = async () => {
    if (!sessionStorage.getItem(tokenKey)) return
    const next = await request(api.get<never, { data: import('./types').ApiResponse<Profile> }>('/users/me'))
    setProfile(next)
  }
  useEffect(() => {
    const unauthorized = () => signOut()
    window.addEventListener('hotel:unauthorized', unauthorized)
    const restore = async () => {
      if (sessionStorage.getItem(tokenKey)) {
        try {
          const auth = await request(api.get<never, { data: import('./types').ApiResponse<AuthUser> }>('/auth/me'))
          sessionStorage.setItem(tokenKey, auth.token)
          setUser(auth)
          const p = await request(api.get<never, { data: import('./types').ApiResponse<Profile> }>('/users/me'))
          setProfile(p)
        } catch { signOut() }
      }
      setLoading(false)
    }
    void restore()
    return () => window.removeEventListener('hotel:unauthorized', unauthorized)
  }, [])
  const value = useMemo(() => ({ user, profile, loading, signIn, signOut, reloadProfile }), [user, profile, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is missing'); return value }
