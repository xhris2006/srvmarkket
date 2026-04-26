'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle, Loader2, MapPin, MessageCircle, Phone, Star, Video } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

interface ProviderData {
  id: string
  userId: string
  user: {
    id: string
    name: string
    avatar?: string | null
    phone?: string | null
    city?: string | null
    country?: string | null
    isVerified: boolean
    createdAt: string
  }
  bio?: string | null
  tagline?: string | null
  rating: number
  totalReviews: number
  completedJobs: number
  isAvailable: boolean
  isVerifiedBadge: boolean
  services: Array<{ id: string; title: string; description: string; price: number; priceType: string; category: string; duration?: number | null }>
  reviews: Array<{ id: string; rating: number; comment?: string | null; createdAt: string; author: { id: string; name: string; avatar?: string | null } }>
  canRate: boolean
  ratingBookingId: string | null
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'services' | 'reviews'>('services')
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [ratingError, setRatingError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/users/${params.id}/public`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        })
        const data = await res.json()
        if (data.success) {
          setProvider(data.data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [accessToken, params.id])

  const selectedServiceData = useMemo(
    () => provider?.services.find((service) => service.id === selectedService) || null,
    [provider?.services, selectedService]
  )

  const handleStartChat = async () => {
    if (!provider) return
    if (!user || !accessToken) {
      router.push('/auth/login')
      return
    }

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ participantId: provider.user.id }),
    })
    const data = await res.json()
    if (data.success) router.push(`/chat/${data.data.id}`)
  }

  const handleBookService = () => {
    if (!user || !accessToken) {
      router.push('/auth/login')
      return
    }

    if (!selectedServiceData) return
    router.push(`/booking?serviceId=${selectedServiceData.id}`)
  }

  const submitRating = async () => {
    if (!provider || !accessToken || ratingScore < 1) return

    setIsSubmittingRating(true)
    setRatingError('')

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          targetUserId: provider.user.id,
          score: ratingScore,
          comment: ratingComment.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setRatingError(data.error || 'Failed to submit rating')
        return
      }

      setProvider((current) =>
        current
          ? {
              ...current,
              canRate: false,
              ratingBookingId: null,
              totalReviews: current.totalReviews + 1,
              rating: Number((((current.rating * current.totalReviews) + ratingScore) / (current.totalReviews + 1)).toFixed(1)),
              reviews: [data.data, ...current.reviews],
            }
          : current
      )
      setRatingComment('')
      setRatingScore(0)
    } finally {
      setIsSubmittingRating(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  if (!provider) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Provider not found</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900">Public Profile</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 card-shadow mb-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              {provider.user.avatar ? (
                <img src={provider.user.avatar} alt={provider.user.name} className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-2xl">
                  {provider.user.name[0]}
                </div>
              )}
              {provider.isAvailable && <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{provider.user.name}</h1>
                {provider.isVerifiedBadge && (
                  <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>

              {provider.tagline ? <p className="text-gray-600 mt-1">{provider.tagline}</p> : null}

              {provider.user.city ? (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">{provider.user.city}, {provider.user.country}</span>
                </div>
              ) : null}

              {provider.user.phone ? (
                <div className="flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">{provider.user.phone}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-900">{provider.rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({provider.totalReviews} reviews)</span>
                </div>
                <div className="text-sm text-gray-500">{provider.completedJobs} jobs completed</div>
              </div>
            </div>
          </div>

          {provider.bio ? <p className="text-gray-600 text-sm mt-4 leading-relaxed">{provider.bio}</p> : null}

          <div className="flex gap-3 mt-5">
            <button onClick={handleStartChat} className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors">
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
            <button onClick={handleStartChat} className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button onClick={handleStartChat} className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {provider.canRate && (
          <div className="bg-white rounded-2xl p-6 card-shadow mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Rate this provider</h2>
            <div className="flex items-center gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1
                return (
                  <button key={starValue} onClick={() => setRatingScore(starValue)} className="text-left">
                    <Star className={`w-6 h-6 ${starValue <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                  </button>
                )
              })}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Share a few details about your experience (optional)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
            {ratingError ? <p className="mt-2 text-sm text-red-500">{ratingError}</p> : null}
            <button
              onClick={submitRating}
              disabled={isSubmittingRating || ratingScore < 1}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
            >
              {isSubmittingRating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit Rating
            </button>
          </div>
        )}

        <div className="bg-white rounded-2xl card-shadow overflow-hidden">
          <div className="flex border-b">
            {(['services', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3.5 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-purple-700 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {tab} {tab === 'reviews' && `(${provider.totalReviews})`}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'services' ? (
              <div className="space-y-3">
                {provider.services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id === selectedService ? null : service.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedService === service.id ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-purple-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{service.title}</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
                        {service.duration ? (
                          <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {service.duration} min
                          </span>
                        ) : null}
                      </div>
                      <div className="ml-4 text-right">
                        <span className="font-bold text-gray-900">${service.price}</span>
                        <p className="text-xs text-gray-400">{service.priceType.toLowerCase()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedServiceData ? (
                  <button onClick={handleBookService} className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold mt-2 hover:opacity-90 transition-opacity">
                    Book Selected Service
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {provider.reviews.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No reviews yet</p>
                ) : (
                  provider.reviews.map((review) => (
                    <div key={review.id} className="pb-4 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        {review.author.avatar ? (
                          <img src={review.author.avatar} alt={review.author.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-sm font-bold">
                            {review.author.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{review.author.name}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star key={index} className={`w-3 h-3 ${index < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment ? <p className="text-sm text-gray-600 pl-10">{review.comment}</p> : null}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
