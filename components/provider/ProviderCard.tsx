// ─── PROVIDER CARD ────────────────────────────────────────────────────────────
import Link from 'next/link'
import { MapPin, Star, CheckCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { clsx } from 'clsx'

interface ProviderCardProps {
  provider: {
    id: string
    user: {
      name: string
      avatar?: string | null
      city?: string | null
      country?: string | null
    }
    tagline?: string | null
    rating: number
    totalReviews: number
    completedJobs: number
    isAvailable: boolean
    isVerifiedBadge: boolean
    distance?: number
    services: Array<{
      title: string
      price: number
      priceType: string
    }>
  }
  compact?: boolean
  className?: string
}

export function ProviderCard({ provider, compact = false, className }: ProviderCardProps) {
  const lowestPrice = provider.services.length > 0
    ? Math.min(...provider.services.map((s) => s.price))
    : null

  return (
    <Link
      href={`/profile/${provider.id}`}
      className={clsx(
        'block bg-white rounded-2xl border border-gray-100 card-shadow-hover overflow-hidden',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <Avatar
            src={provider.user.avatar}
            name={provider.user.name}
            size={compact ? 'sm' : 'md'}
            online={provider.isAvailable}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={clsx('font-semibold text-gray-900 truncate', compact ? 'text-sm' : '')}>
              {provider.user.name}
            </h3>
            {provider.isVerifiedBadge && (
              <CheckCircle className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
            )}
          </div>

          {provider.tagline && !compact && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{provider.tagline}</p>
          )}

          {provider.user.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">
                {provider.user.city}
                {provider.distance !== undefined && (
                  <> · {provider.distance.toFixed(1)} km</>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {!compact && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({provider.totalReviews})</span>
          </div>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-500">{provider.completedJobs} done</span>
          {provider.isAvailable && (
            <>
              <span className="text-gray-200">·</span>
              <Badge variant="success" dot size="sm">Available</Badge>
            </>
          )}
        </div>
      )}

      {/* Service tags */}
      {provider.services.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mb-3">
          {provider.services.slice(0, 2).map((s, i) => (
            <span key={i} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
              {s.title}
            </span>
          ))}
          {provider.services.length > 2 && (
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
              +{provider.services.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Price footer */}
      {lowestPrice !== null && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">From</span>
          <span className="font-bold text-gray-900">${lowestPrice}</span>
        </div>
      )}
    </Link>
  )
}
