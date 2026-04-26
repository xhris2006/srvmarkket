'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Calendar, MapPin, ArrowRight, MessageCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { format } from 'date-fns'

interface BookingDetails {
  id: string
  status: string
  scheduledAt: string
  totalAmount: number
  address?: string
  service: {
    title: string
    provider: { id: string; user: { name: string; avatar?: string } }
  }
  transaction?: { status: string }
}

export default function BookingConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const bookingId = searchParams.get('bookingId')
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!bookingId || !accessToken) return
    fetch(`/api/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setBooking(d.data) })
      .finally(() => setIsLoading(false))
  }, [bookingId, accessToken])

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  const isPaid = booking?.transaction?.status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Success animation */}
        <div className="bg-white rounded-3xl p-8 card-shadow text-center mb-4">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isPaid ? 'Payment Confirmed!' : 'Booking Sent!'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isPaid
              ? 'Your payment was successful. The provider has been notified.'
              : 'Your booking request has been sent. Awaiting provider confirmation.'}
          </p>

          {booking && (
            <div className="bg-gray-50 rounded-2xl p-4 mt-6 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Service</span>
                <span className="text-sm font-semibold text-gray-900">{booking.service.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Provider</span>
                <span className="text-sm font-medium text-gray-700">{booking.service.provider.user.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-1 text-gray-500">
                  <Calendar className="w-3 h-3" /> Date
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {format(new Date(booking.scheduledAt), 'MMM d, yyyy · h:mm a')}
                </span>
              </div>
              {booking.address && (
                <div className="flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3 h-3" /> Location
                  </span>
                  <span className="text-sm font-medium text-gray-700 text-right max-w-[60%]">{booking.address}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total paid</span>
                <span className="text-lg font-bold text-purple-700">${booking.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/bookings')}
            className="w-full gradient-brand text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            View My Bookings <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/search')}
            className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    </div>
  )
}
