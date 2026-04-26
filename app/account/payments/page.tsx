'use client'

import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { PAYMENT_METHODS } from '@/lib/icon-maps'

export default function AccountPaymentsPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            Payment Methods
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl p-6 card-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Secure payments at checkout</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your card or wallet details are collected securely during booking checkout. Saved payment methods are not
            managed from the account area yet.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 card-shadow">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Supported methods</h3>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <div
                key={method.label}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              >
                <method.icon className="w-4 h-4 text-purple-600" />
                {method.label}
              </div>
            ))}
          </div>
        </div>

        {user?.role === 'PROVIDER' && (
          <div className="bg-white rounded-2xl p-6 card-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Provider payouts</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              To receive payouts for your services, connect your Stripe account from your provider settings.
            </p>
            <a
              href="/account/stripe"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              Open Stripe Settings
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
