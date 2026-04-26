'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, MapPin, CheckCircle, MessageCircle, Phone, Video, Loader2, Calendar, ArrowLeft, Shield } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

interface ProviderData {
  id: string
  user: { id: string; name: string; avatar?: string; city?: string; country?: string; isVerified: boolean; createdAt: string }
  bio?: string
  tagline?: string
  rating: number
  totalReviews: number
  completedJobs: number
  isAvailable: boolean
  isVerifiedBadge: boolean
  services: Array<{ id: string; title: string; description: string; price: number; priceType: string; category: string; duration?: number }>
  reviews: Array<{ id: string; rating: number; comment?: string; createdAt: string; author: { name: string; avatar?: string } }>
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'services' | 'reviews'>('services')

  useEffect(() => {
    fetch(`/api/providers/${params.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setProvider(d.data) })
      .finally(() => setIsLoading(false))
  }, [params.id])

  const handleStartChat = async () => {
    if (!user || !accessToken) { router.push('/auth/login'); return }
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ participantId: provider!.user.id }),
    })
    const data = await res.json()
    if (data.success) router.push(`/chat/${data.data.id}`)
  }

  const handleBookService = () => {
    if (!user || !accessToken) { router.push('/auth/login'); return }
    if (!selectedService) return
    router.push(`/booking?serviceId=${selectedService}`)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  if (!provider) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Provider not found</p></div>
  }

  const avgRating = provider.rating

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900">Provider Profile</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile card */}
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
              {provider.isAvailable && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">{provider.user.name}</h1>
                {provider.isVerifiedBadge && (
                  <span className="flex items-center gap-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${provider.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {provider.isAvailable ? '● Available' : '○ Unavailable'}
                </span>
              </div>

              {provider.tagline && <p className="text-gray-600 mt-1">{provider.tagline}</p>}

              {provider.user.city && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">{provider.user.city}, {provider.user.country}</span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-gray-900">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">({provider.totalReviews} reviews)</span>
                </div>
                <div className="text-sm text-gray-500">{provider.completedJobs} jobs completed</div>
              </div>
            </div>
          </div>

          {provider.bio && (
            <p className="text-gray-600 text-sm mt-4 leading-relaxed">{provider.bio}</p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleStartChat}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Chat
            </button>
            <button
              onClick={handleStartChat}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartChat}
              className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
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
            {activeTab === 'services' && (
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
                        {service.duration && (
                          <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {service.duration} min
                          </span>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <span className="font-bold text-gray-900">${service.price}</span>
                        <p className="text-xs text-gray-400">{service.priceType.toLowerCase()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedService && (
                  <button
                    onClick={handleBookService}
                    className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold mt-2 hover:opacity-90 transition-opacity"
                  >
                    Book Selected Service
                  </button>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
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
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm text-gray-600 pl-10">{review.comment}</p>}
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
