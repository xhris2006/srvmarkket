// ─── useAuth HOOK ─────────────────────────────────────────────────────────────
// Manages authentication state, automatic token refresh, and session persistence

'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const TOKEN_REFRESH_INTERVAL = 12 * 60 * 1000 // 12 minutes (before 15min expiry)

export function useAuth() {
  const { user, accessToken, setUser, setAccessToken, setLoading, logout } = useAuthStore()
  const router = useRouter()
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Silently refreshes the access token using the httpOnly refresh token cookie.
   * Called automatically before expiry and on mount if a user session exists.
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setAccessToken(data.data.accessToken)
        return true
      }
      // Refresh failed — clear session
      logout()
      return false
    } catch {
      logout()
      return false
    }
  }, [setAccessToken, logout])

  /**
   * On mount: if we have a stored user but need to validate the session,
   * attempt a token refresh. This handles page reloads.
   */
  useEffect(() => {
    if (user && !accessToken) {
      refreshToken()
    }
  }, [user, accessToken, refreshToken])

  /**
   * Set up periodic silent token refresh while user is active.
   */
  useEffect(() => {
    if (!user || !accessToken) return

    refreshIntervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL)
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [user, accessToken, refreshToken])

  /**
   * Signs out: clears local state and invalidates the server session.
   */
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
    } finally {
      logout()
      router.push('/')
    }
  }, [accessToken, logout, router])

  /**
   * Returns Authorization header object for fetch calls.
   */
  const authHeaders = useCallback(
    (): Record<string, string> =>
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    [accessToken]
  )

  return {
    user,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isAdmin: user?.role === 'ADMIN',
    isProvider: user?.role === 'PROVIDER',
    isClient: user?.role === 'CLIENT',
    signOut,
    refreshToken,
    authHeaders,
  }
}
