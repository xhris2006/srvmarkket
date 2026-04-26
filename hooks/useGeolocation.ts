// ─── useGeolocation HOOK ──────────────────────────────────────────────────────
// Gets the user's current position and updates it in their profile

'use client'

import { useState, useCallback } from 'react'

interface GeoPosition {
  latitude: number
  longitude: number
  accuracy: number
}

interface GeoState {
  position: GeoPosition | null
  error: string | null
  isLoading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    position: null,
    error: null,
    isLoading: false,
  })

  /**
   * Requests the user's current location from the browser.
   * Falls back gracefully if permission is denied.
   */
  const getPosition = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setState((s) => ({ ...s, error: 'Geolocation is not supported by your browser' }))
        resolve(null)
        return
      }

      setState((s) => ({ ...s, isLoading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
          setState({ position, error: null, isLoading: false })
          resolve(position)
        },
        (err) => {
          const errorMessages: Record<number, string> = {
            1: 'Location permission denied. Enable it in your browser settings.',
            2: 'Location unavailable. Please try again.',
            3: 'Location request timed out.',
          }
          const error = errorMessages[err.code] || 'Unknown location error'
          setState((s) => ({ ...s, error, isLoading: false }))
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      )
    })
  }, [])

  /**
   * Calculates distance (km) between two coordinates using Haversine formula
   */
  const distanceTo = useCallback(
    (targetLat: number, targetLng: number): number | null => {
      if (!state.position) return null
      const R = 6371
      const dLat = ((targetLat - state.position.latitude) * Math.PI) / 180
      const dLng = ((targetLng - state.position.longitude) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((state.position.latitude * Math.PI) / 180) *
          Math.cos((targetLat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
    },
    [state.position]
  )

  return { ...state, getPosition, distanceTo }
}
