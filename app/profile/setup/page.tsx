'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { CATEGORY_OPTIONS } from '@/lib/icon-maps'

const CATEGORIES = CATEGORY_OPTIONS

interface ServiceForm {
  title: string
  description: string
  category: string
  price: number | ''
  priceType: 'FIXED' | 'HOURLY' | 'NEGOTIABLE'
  duration: number | ''
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { success, error } = useToast()
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const [profile, setProfile] = useState({
    tagline: '',
    bio: '',
    phone: '',
    city: '',
    country: '',
  })

  const [services, setServices] = useState<ServiceForm[]>([
    { title: '', description: '', category: '', price: '', priceType: 'FIXED', duration: '' },
  ])

  const addService = () => {
    if (services.length >= 5) return
    setServices([...services, { title: '', description: '', category: '', price: '', priceType: 'FIXED', duration: '' }])
  }

  const removeService = (i: number) => {
    setServices(services.filter((_, idx) => idx !== i))
  }

  const updateService = (i: number, field: keyof ServiceForm, value: string | number) => {
    setServices(services.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const handleSave = async () => {
    if (!accessToken) return
    setIsSaving(true)
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(profile),
      })

      const validServices = services.filter((s) => s.title && s.category && s.price)
      for (const svc of validServices) {
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(svc),
        })
      }

      setIsDone(true)
      success('Profile created successfully!')
      setTimeout(() => router.push('/search'), 2000)
    } catch {
      error('Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Created!</h2>
          <p className="text-gray-500">Redirecting to the marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your provider profile</h1>
          <p className="text-gray-500 text-sm mt-1">Tell clients about your services</p>
        </div>

        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'gradient-brand text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-purple-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 card-shadow space-y-4">
            <h2 className="font-semibold text-gray-900">About you</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
              <input
                value={profile.tagline}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="e.g. Professional house cleaner with 5 years experience"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell clients about your experience and what makes you great..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{profile.bio.length}/500</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 555 123 4567"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="New York"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  placeholder="US"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {services.map((svc, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 card-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Service {i + 1}</h3>
                  {services.length > 1 && (
                    <button onClick={() => removeService(i)} className="text-red-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    value={svc.title}
                    onChange={(e) => updateService(i, 'title', e.target.value)}
                    placeholder="Service title (e.g. Deep House Cleaning)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />

                  <textarea
                    value={svc.description}
                    onChange={(e) => updateService(i, 'description', e.target.value)}
                    placeholder="Describe what's included..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                  />

                  <select
                    value={svc.category}
                    onChange={(e) => updateService(i, 'category', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={svc.price}
                        onChange={(e) => updateService(i, 'price', Number(e.target.value))}
                        placeholder="Price"
                        min={1}
                        className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      />
                    </div>
                    <select
                      value={svc.priceType}
                      onChange={(e) => updateService(i, 'priceType', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                    >
                      <option value="FIXED">Fixed</option>
                      <option value="HOURLY">Per hour</option>
                      <option value="NEGOTIABLE">Negotiable</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}

            {services.length < 5 && (
              <button
                onClick={addService}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-200 rounded-2xl text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add another service
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 gradient-brand text-white py-3.5 rounded-xl font-semibold hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Launch Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
