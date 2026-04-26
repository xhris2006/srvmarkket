'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, FileText, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

interface ServiceInfo {
  id: string
  title: string
  description: string
  price: number
  priceType: string
  duration?: number
  provider: {
    id: string
    user: { name: string; avatar?: string }
  }
}

export default function BookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, accessToken } = useAuthStore()
  const serviceId = searchParams.get('serviceId')

  const [service, setService] = useState<ServiceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    scheduledAt: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    if (!serviceId) return
    fetch(`/api/providers?pageSize=1`)
      .then(() => {})
      .catch(() => {})

    // Fetch service details via provider search
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setService(d.data) })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [serviceId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !serviceId) {
      router.push('/auth/login')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ serviceId, ...form }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Failed to create booking')
        return
      }

      setBookingId(data.data.id)
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
  }

  if (isSuccess && bookingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center card-shadow">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Sent!</h2>
          <p className="text-gray-500 mb-8">
            Your booking request has been sent to the provider. You&apos;ll be notified when they respond.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/payment?bookingId=${bookingId}`)}
              className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Proceed to Payment
            </button>
            <button
              onClick={() => router.push('/search')}
              className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">Book Service</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Service summary */}
        {service && (
          <div className="bg-white rounded-2xl p-4 card-shadow mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-brand rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {service.provider.user.name[0]}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{service.title}</p>
                <p className="text-sm text-gray-500">by {service.provider.user.name}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">${service.price}</p>
                <p className="text-xs text-gray-400">{service.priceType.toLowerCase()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 card-shadow space-y-5">
          <h2 className="font-semibold text-gray-900">Booking Details</h2>

          {/* Date & time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar className="w-4 h-4 inline mr-1" />
              Preferred date & time
            </label>
            <input
              required
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1" />
              Service address
            </label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Enter the address where service is needed"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-4 h-4 inline mr-1" />
              Additional notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special instructions or details..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
            />
          </div>

          {/* Price summary */}
          {service && (
            <div className="bg-purple-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service fee</span>
                <span className="font-medium">${service.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Platform fee (10%)</span>
                <span className="font-medium">${(service.price * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t border-purple-200 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-purple-700">${(service.price * 1.1).toFixed(2)}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full gradient-brand text-white py-4 rounded-xl font-semibold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Sending Request...' : 'Send Booking Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
