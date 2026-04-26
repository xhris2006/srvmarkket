// Authentication hook with silent refresh and session recovery

'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const TOKEN_REFRESH_INTERVAL = 12 * 60 * 1000

export function useAuth() {
  const { user, accessToken, isLoading, setAccessToken, setLoading, logout } = useAuthStore()
  const router = useRouter()
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null)

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    const refreshPromise = (async () => {
      setLoading(true)

      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' })
        const data = await res.json()

        if (res.ok && data.success) {
          setAccessToken(data.data.accessToken)
          return true
        }

        if (res.status === 401) {
          logout()
        }

        return false
      } catch {
        return false
      } finally {
        setLoading(false)
        refreshInFlightRef.current = null
      }
    })()

    refreshInFlightRef.current = refreshPromise
    return refreshPromise
  }, [logout, setAccessToken, setLoading])

  useEffect(() => {
    if (!user) return

    refreshToken()
  }, [user, refreshToken])

  useEffect(() => {
    if (!user || !accessToken) return

    refreshIntervalRef.current = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL)

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [user, accessToken, refreshToken])

  useEffect(() => {
    if (!user) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToken()
      }
    }

    const handleFocus = () => {
      refreshToken()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, refreshToken])

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

  const authHeaders = useCallback(
    (): Record<string, string> => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  )

  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    isAdmin: user?.role === 'ADMIN',
    isProvider: user?.role === 'PROVIDER',
    isClient: user?.role === 'CLIENT',
    signOut,
    refreshToken,
    authHeaders,
  }
}
