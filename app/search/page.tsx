'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, MapPin, Filter, Star, CheckCircle, Loader2, SlidersHorizontal, X } from 'lucide-react'
import Image from 'next/image'

const CATEGORIES = [
  { icon: '🧹', label: 'Cleaning', value: 'CLEANING' },
  { icon: '🔧', label: 'Repair', value: 'REPAIR' },
  { icon: '🪛', label: 'Plumbing', value: 'PLUMBING' },
  { icon: '⚡', label: 'Electrical', value: 'ELECTRICAL' },
  { icon: '🎨', label: 'Painting', value: 'PAINTING' },
  { icon: '📦', label: 'Moving', value: 'MOVING' },
  { icon: '🌿', label: 'Gardening', value: 'GARDENING' },
  { icon: '📸', label: 'Photography', value: 'PHOTOGRAPHY' },
  { icon: '🍳', label: 'Cooking', value: 'COOKING' },
  { icon: '💅', label: 'Beauty', value: 'BEAUTY' },
  { icon: '💪', label: 'Fitness', value: 'FITNESS' },
  { icon: '🐾', label: 'Pet Care', value: 'PET_CARE' },
  { icon: '💻', label: 'IT Support', value: 'IT_SUPPORT' },
  { icon: '📚', label: 'Tutoring', value: 'TUTORING' },
]

interface Provider {
  id: string
  userId: string
  user: { name: string; avatar?: string; city?: string; country?: string; isVerified: boolean }
  bio?: string
  tagline?: string
  rating: number
  totalReviews: number
  completedJobs: number
  isAvailable: boolean
  isVerifiedBadge: boolean
  distance?: number
  services: Array<{ title: string; price: number; priceType: string }>
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minRating: 0,
    isAvailable: false,
    sortBy: 'rating',
    radius: 50,
  })

  const fetchProviders = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        ...(query && { q: query }),
        ...(category && { category }),
        ...(filters.minRating > 0 && { minRating: String(filters.minRating) }),
        ...(filters.isAvailable && { isAvailable: 'true' }),
        sortBy: filters.sortBy,
        radius: String(filters.radius),
      })
      const res = await fetch(`/api/providers?${params}`)
      const data = await res.json()
      if (data.success) {
        setProviders(data.data.items)
        setTotal(data.data.total)
      }
    } finally {
      setIsLoading(false)
    }
  }, [query, category, filters])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchProviders()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <a href="/" className="font-bold text-lg text-purple-700 flex-shrink-0">ServMarket</a>
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </form>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-purple-600 text-white border-purple-600' : 'border-gray-200 text-gray-600 hover:border-purple-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!category ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value === category ? '' : cat.value)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${category === cat.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="border-t bg-white px-4 py-4 max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-6 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Min rating:</label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={0}>Any</option>
                  <option value={3}>3+ ⭐</option>
                  <option value={4}>4+ ⭐</option>
                  <option value={4.5}>4.5+ ⭐</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="rating">Highest rated</option>
                  <option value="distance">Nearest first</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isAvailable}
                  onChange={(e) => setFilters({ ...filters, isAvailable: e.target.checked })}
                  className="rounded accent-purple-600"
                />
                <span className="text-sm font-medium text-gray-700">Available now</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ─── RESULTS ─────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            {isLoading ? 'Searching...' : `${total} provider${total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No providers found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ProviderCard({ provider }: { provider: Provider }) {
  const lowestPrice = provider.services.length > 0
    ? Math.min(...provider.services.map((s) => s.price))
    : null

  return (
    <a
      href={`/profile/${provider.id}`}
      className="bg-white rounded-2xl border border-gray-100 p-4 card-shadow-hover block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative flex-shrink-0">
          {provider.user.avatar ? (
            <img src={provider.user.avatar} alt={provider.user.name} className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg">
              {provider.user.name[0]}
            </div>
          )}
          {provider.isAvailable && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{provider.user.name}</h3>
            {provider.isVerifiedBadge && (
              <CheckCircle className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
            )}
          </div>
          {provider.tagline && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{provider.tagline}</p>
          )}
          {provider.user.city && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{provider.user.city}</span>
              {provider.distance && (
                <span className="text-xs text-gray-400">· {provider.distance.toFixed(1)}km</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rating & jobs */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-semibold text-gray-900">{provider.rating.toFixed(1)}</span>
          <span className="text-xs text-gray-400">({provider.totalReviews})</span>
        </div>
        <span className="text-xs text-gray-400">·</span>
        <span className="text-xs text-gray-500">{provider.completedJobs} jobs done</span>
      </div>

      {/* Services preview */}
      {provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {provider.services.slice(0, 2).map((s, i) => (
            <span key={i} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
              {s.title}
            </span>
          ))}
          {provider.services.length > 2 && (
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
              +{provider.services.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Price */}
      {lowestPrice !== null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Starting from</span>
          <span className="font-bold text-gray-900">${lowestPrice}</span>
        </div>
      )}
    </a>
  )
}
