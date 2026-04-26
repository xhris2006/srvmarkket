'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Loader2, Navigation } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { useGeolocation } from '@/hooks/useGeolocation'
import { Button } from '@/components/ui/Button'

export default function LocationPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { success, error } = useToast()
  const { getPosition, isLoading: isGeoLoading } = useGeolocation()
  const [form, setForm] = useState({ city: '', country: '', latitude: '', longitude: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            city: d.data.city || '',
            country: d.data.country || '',
            latitude: d.data.latitude?.toString() || '',
            longitude: d.data.longitude?.toString() || '',
          })
        }
      })
      .finally(() => setIsLoadingProfile(false))
  }, [accessToken])

  const handleDetectLocation = async () => {
    const pos = await getPosition()
    if (pos) {
      setForm((p) => ({
        ...p,
        latitude: pos.latitude.toFixed(6),
        longitude: pos.longitude.toFixed(6),
      }))
      success('Location detected successfully')
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken) return
    setIsSaving(true)
    try {
      const body: Record<string, string | number> = { city: form.city, country: form.country }
      if (form.latitude) body.latitude = parseFloat(form.latitude)
      if (form.longitude) body.longitude = parseFloat(form.longitude)

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) success('Location updated successfully')
      else error(data.error || 'Failed to save location')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" /> Service Location
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoadingProfile ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 card-shadow space-y-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              Your location is used to show your profile in geo-based searches. Clients can find you by distance.
            </p>

            {/* Auto-detect */}
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Navigation className="w-4 h-4" />}
              onClick={handleDetectLocation}
              isLoading={isGeoLoading}
              className="w-full"
            >
              Detect My Location
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  placeholder="New York"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input
                  value={form.country}
                  onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                  placeholder="US"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
                <input
                  value={form.latitude}
                  onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
                  placeholder="40.7128"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
                <input
                  value={form.longitude}
                  onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
                  placeholder="-74.0060"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>

            {form.latitude && form.longitude && (
              <div className="bg-purple-50 rounded-xl px-4 py-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  Coordinates saved: {parseFloat(form.latitude).toFixed(4)}, {parseFloat(form.longitude).toFixed(4)}
                </span>
              </div>
            )}

            <Button type="submit" isLoading={isSaving} className="w-full">
              Save Location
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
