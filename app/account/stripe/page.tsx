'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, CheckCircle, ExternalLink, Loader2, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

export default function StripeConnectPage() {
  const { accessToken } = useAuthStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { success, error } = useToast()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)

  const connected = searchParams.get('connected') === 'true'

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/payments/connect', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setIsConnected(d.data.connected) })
      .finally(() => setIsLoading(false))

    if (connected) success('Stripe account connected successfully!')
  }, [accessToken, connected, success])

  const handleConnect = async () => {
    if (!accessToken) return
    setIsConnecting(true)
    try {
      const res = await fetch('/api/payments/connect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (data.success) {
        window.location.href = data.data.onboardingUrl
      } else {
        error(data.error || 'Failed to start Stripe onboarding')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">Stripe Payments</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : isConnected ? (
          <div className="bg-white rounded-2xl p-6 card-shadow text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Stripe Connected</h2>
            <p className="text-gray-500 text-sm mb-6">
              Your Stripe account is connected. You will receive payments directly when clients pay for your services.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                <CheckCircle className="w-4 h-4" /> Payment splits enabled
              </div>
              <p className="text-green-600 text-xs leading-relaxed">
                Platform fee: 10% · Your earnings: 90% of each transaction, paid out directly to your bank.
              </p>
            </div>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-purple-600 text-sm font-medium hover:text-purple-700"
            >
              View Stripe Dashboard <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 card-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Connect Stripe to Get Paid</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Connect your Stripe account to receive payments from clients directly into your bank account.
            </p>

            <div className="space-y-3 mb-6">
              {[
                'Receive payments directly to your bank',
                'Automatic payouts every 2 business days',
                'Support for 135+ currencies worldwide',
                'Secure, PCI-compliant payment processing',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feat}
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs leading-relaxed">
                  ServMarket charges a 10% platform fee per transaction. You keep 90% of all earnings.
                </p>
              </div>
            </div>

            <Button onClick={handleConnect} isLoading={isConnecting} className="w-full">
              Connect with Stripe
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
