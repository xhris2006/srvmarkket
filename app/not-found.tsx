import Link from 'next/link'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          <div className="absolute inset-0 gradient-brand rounded-full opacity-10 animate-pulse-soft" />
          <div className="absolute inset-4 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-6xl">🔍</span>
          </div>
        </div>

        <h1 className="text-6xl font-black text-gradient mb-3">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page not found</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link
            href="/search"
            className="flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-700 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
          >
            <Search className="w-4 h-4" /> Search Services
          </Link>
        </div>
      </div>
    </div>
  )
}
