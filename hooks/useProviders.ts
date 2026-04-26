// ─── useProviders HOOK ────────────────────────────────────────────────────────
// Fetches and caches provider listings with filtering and pagination

'use client'

import { useState, useCallback, useRef } from 'react'

interface Provider {
  id: string
  user: {
    name: string
    avatar?: string | null
    city?: string | null
    country?: string | null
    isVerified: boolean
  }
  tagline?: string | null
  bio?: string | null
  rating: number
  totalReviews: number
  completedJobs: number
  isAvailable: boolean
  isVerifiedBadge: boolean
  distance?: number
  services: Array<{ id: string; title: string; price: number; priceType: string; category: string }>
}

export interface ProviderFilters {
  query?: string
  category?: string
  lat?: number
  lng?: number
  radius?: number
  minRating?: number
  isAvailable?: boolean
  sortBy?: 'rating' | 'distance' | 'newest' | 'price'
  page?: number
  pageSize?: number
}

interface ProvidersResult {
  items: Provider[]
  total: number
  page: number
  totalPages: number
}

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Fetches providers from the API with given filters.
   * Automatically cancels any in-flight request when called again.
   */
  const fetchProviders = useCallback(async (filters: ProviderFilters = {}) => {
    // Cancel previous request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.query)      params.set('q', filters.query)
      if (filters.category)   params.set('category', filters.category)
      if (filters.lat)        params.set('lat', String(filters.lat))
      if (filters.lng)        params.set('lng', String(filters.lng))
      if (filters.radius)     params.set('radius', String(filters.radius))
      if (filters.minRating)  params.set('minRating', String(filters.minRating))
      if (filters.isAvailable) params.set('isAvailable', 'true')
      if (filters.sortBy)     params.set('sortBy', filters.sortBy)
      if (filters.page)       params.set('page', String(filters.page))
      if (filters.pageSize)   params.set('pageSize', String(filters.pageSize || 12))

      const res = await fetch(`/api/providers?${params}`, {
        signal: abortRef.current.signal,
      })
      const data = await res.json()

      if (data.success) {
        const result: ProvidersResult = data.data
        setProviders(result.items)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      } else {
        setError(data.error || 'Failed to fetch providers')
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError('Network error — please try again')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Appends the next page of results (infinite scroll / load more)
   */
  const fetchMore = useCallback(async (filters: ProviderFilters) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v))
      })
      const res = await fetch(`/api/providers?${params}`)
      const data = await res.json()
      if (data.success) {
        setProviders((prev) => [...prev, ...data.data.items])
        setTotalPages(data.data.totalPages)
      }
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  return { providers, total, totalPages, isLoading, error, fetchProviders, fetchMore }
}
