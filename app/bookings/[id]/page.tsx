'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, FileText, Phone, Video, MessageCircle, Star, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { BookingStatusBadge, TransactionStatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'

interface BookingDetail {
  id: string
  status: string
  scheduledAt: string
  totalAmount: number
  platformFee: number
  address?: string | null
  notes?: string | null
  createdAt: string
  service: {
    id: string
    title: string
    description: string
    price: number
    priceType: string
    category: string
    provider: {
      id: string
      userId: string
      user: { id: string; name: string; avatar?: string | null; city?: string | null }
    }
  }
  client: { id: string; name: string; avatar?: string | null; email: string }
  transaction?: { id: string; status: string; amount: number; currency: string; createdAt: string } | null
  review?: { rating: number; comment?: string | null } | null
}

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, accessToken } = useAuthStore()
  const { success, error: toastError } = useToast()

  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch(`/api/bookings/${params.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBooking(d.data) })
      .finally(() => setIsLoading(false))
  }, [params.id, accessToken])

  const handleStatusChange = async (status: string) => {
    if (!accessToken || !booking) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        setBooking((prev) => prev ? { ...prev, status } : null)
        success(`Booking ${status.toLowerCase()} successfully`)
      } else {
        toastError(data.error || 'Action failed')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!accessToken || !booking) return
    setIsSubmittingReview(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ bookingId: booking.id, ...reviewData }),
      })
      const data = await res.json()
      if (data.success) {
        setBooking((prev) => prev ? { ...prev, review: reviewData } : null)
        setShowReviewModal(false)
        success('Review submitted! Thank you.')
      } else {
        toastError(data.error || 'Failed to submit review')
      }
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleStartChat = async () => {
    if (!accessToken || !booking) return
    const targetId = user?.id === booking.client.id
      ? booking.service.provider.user.id
      : booking.client.id

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ participantId: targetId }),
    })
    const data = await res.json()
    if (data.success) router.push(`/chat/${data.data.id}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Booking not found</p>
      </div>
    )
  }

  const isClient = user?.id === booking.client.id
  const isProvider = user?.id === booking.service.provider.userId
  const other = isClient ? booking.service.provider.user : booking.client
  const otherCity = 'city' in other ? other.city : undefined
  const isPending = booking.status === 'PENDING'
  const isAccepted = booking.status === 'ACCEPTED'
  const isCompleted = booking.status === 'COMPLETED'
  const canPay = isClient && isAccepted && booking.transaction?.status !== 'COMPLETED'
  const canReview = isClient && isCompleted && !booking.review

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">Booking Details</h1>
          <div className="ml-auto">
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Provider / Client card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Avatar src={other.avatar} name={other.name} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{other.name}</p>
              <p className="text-sm text-gray-500">{isClient ? 'Service Provider' : 'Client'}</p>
              {otherCity && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-400">{otherCity}</span>
                </div>
              )}
            </div>
          </div>

          {/* Communication buttons */}
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<MessageCircle className="w-4 h-4" />}
              onClick={handleStartChat}
              className="flex-1"
            >
              Message
            </Button>
            <button
              onClick={() => router.push(`/chat/call?type=voice`)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => router.push(`/chat/call?type=video`)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Video className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Service info ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <h2 className="font-semibold text-gray-900 mb-3">{booking.service.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">{booking.service.description}</p>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-gray-700">
                {format(new Date(booking.scheduledAt), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0 opacity-0" />
              <span className="text-gray-500">
                {format(new Date(booking.scheduledAt), 'h:mm a')}
              </span>
            </div>
            {booking.address && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{booking.address}</span>
              </div>
            )}
            {booking.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 italic">{booking.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Payment summary ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 card-shadow">
          <h2 className="font-semibold text-gray-900 mb-3">Payment</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Service fee</span>
              <span>${(booking.totalAmount - booking.platformFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform fee</span>
              <span>${booking.platformFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-purple-700 text-base">${booking.totalAmount.toFixed(2)}</span>
            </div>
            {booking.transaction && (
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-500 text-xs">Payment status</span>
                <TransactionStatusBadge status={booking.transaction.status} />
              </div>
            )}
          </div>
        </div>

        {/* ── Existing review ──────────────────────────────────────────────── */}
        {booking.review && (
          <div className="bg-white rounded-2xl p-4 card-shadow">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              Your Review
            </h2>
            <StarRating value={booking.review.rating} readonly size="md" />
            {booking.review.comment && (
              <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{booking.review.comment}&rdquo;</p>
            )}
          </div>
        )}

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Provider actions */}
          {isProvider && isPending && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => handleStatusChange('REJECTED')}
                isLoading={isUpdating}
                className="flex-1"
              >
                Decline Request
              </Button>
              <Button
                onClick={() => handleStatusChange('ACCEPTED')}
                isLoading={isUpdating}
                className="flex-1"
              >
                Accept Request
              </Button>
            </div>
          )}

          {isProvider && booking.status === 'IN_PROGRESS' && (
            <Button
              onClick={() => handleStatusChange('COMPLETED')}
              isLoading={isUpdating}
              className="w-full"
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Mark as Completed
            </Button>
          )}

          {/* Client actions */}
          {canPay && (
            <Button
              onClick={() => router.push(`/payment?bookingId=${booking.id}`)}
              className="w-full"
            >
              Complete Payment — ${booking.totalAmount.toFixed(2)}
            </Button>
          )}

          {canReview && (
            <Button
              variant="secondary"
              onClick={() => setShowReviewModal(true)}
              leftIcon={<Star className="w-4 h-4" />}
              className="w-full"
            >
              Leave a Review
            </Button>
          )}

          {isClient && isPending && (
            <Button
              variant="ghost"
              onClick={() => handleStatusChange('CANCELLED')}
              isLoading={isUpdating}
              className="w-full text-red-500 hover:bg-red-50"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>

      {/* ── Review modal ─────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Leave a Review"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <StarRating
              value={reviewData.rating}
              onChange={(r) => setReviewData((prev) => ({ ...prev, rating: r }))}
              size="lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment (optional)</label>
            <textarea
              value={reviewData.comment}
              onChange={(e) => setReviewData((prev) => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
          </div>
          <Button
            onClick={handleSubmitReview}
            isLoading={isSubmittingReview}
            className="w-full"
          >
            Submit Review
          </Button>
        </div>
      </Modal>
    </div>
  )
}
