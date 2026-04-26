'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Shield, CreditCard, Loader2, CheckCircle, Lock } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

function PaymentPageContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')
  const { accessToken } = useAuthStore()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bookingId || !accessToken) return

    fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ bookingId, provider: 'stripe' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setClientSecret(data.data.clientSecret)
        else setError(data.error || 'Failed to initialize payment')
      })
      .catch(() => setError('Failed to connect to payment service'))
      .finally(() => setIsLoading(false))
  }, [bookingId, accessToken])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/search" className="text-purple-600 underline">Return to search</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href={`/booking?bookingId=${bookingId}`} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="font-semibold text-gray-900">Secure Payment</h1>
          <Lock className="w-4 h-4 text-green-500 ml-auto" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Security badge */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-6">
          <Shield className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700">Payments secured by Stripe — 256-bit SSL encryption</span>
        </div>

        {/* Payment methods badges */}
        <div className="flex items-center gap-2 mb-6">
          {['💳', '🍎', 'G', 'SEPA'].map((m) => (
            <div key={m} className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600">
              {m}
            </div>
          ))}
        </div>

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#7c3aed' } } }}>
            <CheckoutForm bookingId={bookingId!} />
          </Elements>
        )}
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>}>
      <PaymentPageContent />
    </Suspense>
  )
}

function CheckoutForm({ bookingId }: { bookingId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setError('')

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/confirmation?bookingId=${bookingId}`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Payment failed')
      setIsProcessing(false)
      return
    }

    setIsSuccess(true)
    setTimeout(() => router.push(`/booking/confirmation?bookingId=${bookingId}`), 1500)
  }

  if (isSuccess) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center card-shadow">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-500 text-sm">Redirecting to your booking...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 card-shadow">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-purple-600" />
        Payment Details
      </h2>

      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {error && (
        <div className="mt-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full gradient-brand text-white py-4 rounded-xl font-semibold mt-6 hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>

      <p className="text-center text-xs text-gray-400 mt-3">
        You will only be charged after the service is confirmed
      </p>
    </form>
  )
}
