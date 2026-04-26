'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, Star, Shield, Zap, ChevronRight, Sparkles } from 'lucide-react'

const CATEGORIES = [
  { icon: '🧹', label: 'Cleaning', value: 'CLEANING', color: 'from-blue-400 to-blue-600' },
  { icon: '🔧', label: 'Repair', value: 'REPAIR', color: 'from-orange-400 to-orange-600' },
  { icon: '🪛', label: 'Plumbing', value: 'PLUMBING', color: 'from-cyan-400 to-cyan-600' },
  { icon: '⚡', label: 'Electrical', value: 'ELECTRICAL', color: 'from-yellow-400 to-yellow-600' },
  { icon: '🎨', label: 'Painting', value: 'PAINTING', color: 'from-pink-400 to-pink-600' },
  { icon: '📦', label: 'Moving', value: 'MOVING', color: 'from-green-400 to-green-600' },
  { icon: '🌿', label: 'Gardening', value: 'GARDENING', color: 'from-emerald-400 to-emerald-600' },
  { icon: '📸', label: 'Photography', value: 'PHOTOGRAPHY', color: 'from-purple-400 to-purple-600' },
]

const FEATURES = [
  { icon: Shield, title: 'Verified Providers', desc: 'Every provider is background-checked and ID-verified' },
  { icon: Zap, title: 'Instant Booking', desc: 'Book in seconds, get confirmation immediately' },
  { icon: Star, title: 'Trusted Reviews', desc: 'Real reviews from real customers after every job' },
]

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (location) params.set('location', location)
    router.push(`/search?${params}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ─── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-purple-700 to-violet-600 text-white">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">ServMarket</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/auth/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </a>
            <a href="/auth/register" className="bg-white text-purple-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-50 transition-colors">
              Get Started
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 px-6 pt-16 pb-24 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2 text-sm mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>500+ verified providers ready now</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Find trusted services
            <br />
            <span className="text-purple-200">near you, instantly</span>
          </h1>
          <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
            From home cleaning to emergency repairs — book vetted local professionals in minutes.
          </p>

          {/* Search bar */}
          <div className="bg-white rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-1 px-3">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What service do you need?"
                className="flex-1 text-gray-800 placeholder-gray-400 outline-none text-sm py-2"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-px bg-gray-100 hidden sm:block" />
            <div className="flex items-center gap-2 flex-1 px-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your location"
                className="flex-1 text-gray-800 placeholder-gray-400 outline-none text-sm py-2"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button
              onClick={handleSearch}
              className="gradient-brand text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ───────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse by category</h2>
            <p className="text-gray-500 text-sm mt-1">Find the right professional for any job</p>
          </div>
          <a href="/search" className="flex items-center gap-1 text-purple-600 text-sm font-medium hover:text-purple-700">
            View all <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.value}
              href={`/search?category=${cat.value}`}
              className="group flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-2xl shadow-sm group-hover:scale-105 transition-transform`}>
                {cat.icon}
              </div>
              <span className="text-xs text-gray-600 font-medium text-center leading-tight">{cat.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────────────────────── */}
      <section className="px-6 py-16 bg-purple-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">Why choose ServMarket?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 card-shadow text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-500 mb-8">Join thousands of happy customers and providers on ServMarket.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auth/register" className="gradient-brand text-white px-8 py-4 rounded-2xl font-semibold hover:opacity-90 transition-opacity">
            Book a service
          </a>
          <a href="/auth/register?role=provider" className="border-2 border-purple-200 text-purple-700 px-8 py-4 rounded-2xl font-semibold hover:bg-purple-50 transition-colors">
            Become a provider
          </a>
        </div>
      </section>
    </div>
  )
}
