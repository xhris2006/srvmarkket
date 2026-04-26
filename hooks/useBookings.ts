// ─── useBookings HOOK ─────────────────────────────────────────────────────────
// Fetches and manages bookings for the current user

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/lib/store'
import { BookingStatus } from '@/types'

interface BookingWithDetails {
  id: string
  status: BookingStatus
  scheduledAt: string
  totalAmount: number
  notes?: string | null
  address?: string | null
  createdAt: string
  service: {
    id: string
    title: string
    price: number
    category: string
    provider: {
      id: string
      user: { id: string; name: string; avatar?: string | null }
    }
  }
  client: { id: string; name: string; avatar?: string | null }
  transaction?: { status: string } | null
}

export function useBookings(role: 'client' | 'provider' = 'client') {
  const { accessToken } = useAuthStore()
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBookings = useCallback(async (status?: string) => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ role, ...(status ? { status } : {}) })
      const res = await fetch(`/api/bookings?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.success) setBookings(data.data)
      else setError(data.error || 'Failed to load bookings')
    } catch {
      setError('Network error')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, role])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  /**
   * Updates a booking's status (accept, reject, complete, cancel)
   */
  const updateBookingStatus = useCallback(async (
    bookingId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
  ) => {
    if (!accessToken) return { success: false }
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
        )
      }
      return data
    } catch {
      return { success: false, error: 'Network error' }
    }
  }, [accessToken])

  // Grouped by status for easy rendering
  const grouped = {
    pending: bookings.filter((b) => b.status === 'PENDING'),
    active: bookings.filter((b) => ['ACCEPTED', 'IN_PROGRESS'].includes(b.status)),
    completed: bookings.filter((b) => b.status === 'COMPLETED'),
    cancelled: bookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status)),
  }

  return { bookings, grouped, isLoading, error, fetchBookings, updateBookingStatus }
}
