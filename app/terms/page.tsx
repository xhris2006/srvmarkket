import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Privacy | ServMarket',
  description: 'ServMarket terms, privacy, and safety basics.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 pb-28">
      <div className="mx-auto max-w-3xl rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-purple-600">ServMarket</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Terms and privacy</h1>
        <div className="mt-6 space-y-5 text-sm leading-6 text-gray-600">
          <section>
            <h2 className="font-semibold text-gray-900">Use of the marketplace</h2>
            <p className="mt-1">Clients and providers are responsible for accurate booking details, respectful communication, and completing agreed services safely.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900">Payments and disputes</h2>
            <p className="mt-1">Payment, refund, and dispute handling may depend on the booking status, payment provider rules, and evidence submitted by both parties.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-900">Privacy</h2>
            <p className="mt-1">ServMarket uses account, location, booking, message, and payment information to operate the service and improve trust and safety.</p>
          </section>
        </div>
      </div>
    </main>
  )
}

