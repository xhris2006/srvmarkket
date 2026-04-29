import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, HelpCircle, Mail, MessageCircle, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Customer Support | ServMarket',
  description: 'Contact ServMarket customer support for bookings, payments, providers, and account help.',
}

const SUPPORT_OPTIONS = [
  {
    icon: MessageCircle,
    title: 'Booking help',
    text: 'Get help with a pending, accepted, cancelled, or completed booking.',
  },
  {
    icon: ShieldCheck,
    title: 'Trust and safety',
    text: 'Report a provider, client, payment issue, or suspicious activity.',
  },
  {
    icon: HelpCircle,
    title: 'Account support',
    text: 'Resolve login, profile, notification, or verification problems.',
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-3xl">
        <section className="mb-8">
          <p className="text-sm font-semibold text-purple-600">ServMarket support</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Customer service</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Need help with a booking, payment, provider, or account? Send us the details and the support team will follow up.
          </p>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          {SUPPORT_OPTIONS.map((option) => (
            <article key={option.title} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <option.icon className="h-5 w-5 text-purple-600" />
              </div>
              <h2 className="font-semibold text-gray-900">{option.title}</h2>
              <p className="mt-1 text-sm leading-5 text-gray-500">{option.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Contact support</h2>
              <p className="mt-1 text-sm text-gray-500">Email us with your account email and booking ID when available.</p>
            </div>
            <a
              href="mailto:support@servmarket.com?subject=ServMarket%20support%20request"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              <Mail className="h-4 w-4" />
              Email support
            </a>
          </div>

          <div className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Clock className="h-4 w-4 text-purple-600" />
              Response time: 24 to 48 hours
            </div>
            <Link href="/terms" className="text-sm font-medium text-purple-600 hover:text-purple-700">
              View terms and privacy
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

