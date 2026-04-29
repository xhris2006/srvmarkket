'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import {
  User, Settings, Bell, Shield, CreditCard,
  ChevronRight, LogOut, Star, MapPin, Edit3, Loader2, CheckCircle
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/components/ui/Toast'

export default function AccountPage() {
  const { user, accessToken, setUser } = useAuthStore()
  const { signOut } = useAuth()
  const { success, error } = useToast()
  const [isEditingName, setIsEditingName] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Sign in to view your account</p>
          <a href="/auth/login" className="gradient-brand text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const handleSaveName = async () => {
    if (!name.trim() || !accessToken) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.data)
        success('Name updated successfully')
        setIsEditingName(false)
      } else {
        error(data.error || 'Failed to update name')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !accessToken || !user) return

    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const uploadData = await uploadRes.json()

      if (!uploadData.success) {
        throw new Error(uploadData.error || 'Upload failed')
      }

      const saveRes = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ avatar: uploadData.data.url }),
      })
      const saveData = await saveRes.json()

      if (!saveData.success) {
        throw new Error(saveData.error || 'Failed to save profile photo')
      }

      setUser(saveData.data)
      setAvatarPreview(saveData.data.avatar || uploadData.data.url)
      success('Profile photo updated successfully')
    } catch (uploadError) {
      setAvatarPreview(user.avatar || null)
      error(uploadError instanceof Error ? uploadError.message : 'Failed to update profile photo')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const MENU_SECTIONS = [
    {
      title: 'Account',
      items: [
        { icon: Bell,       label: 'Notifications',   href: '/account/notifications' },
        { icon: Shield,     label: 'Privacy & Security', href: '/account/security' },
        { icon: CreditCard, label: 'Payment Methods',  href: '/account/payments' },
      ],
    },
    {
      title: 'Provider',
      show: user.role === 'PROVIDER',
      items: [
        { icon: Star,    label: 'My Services',       href: '/account/services' },
        { icon: MapPin,  label: 'Service Location',  href: '/account/location' },
        { icon: CreditCard, label: 'Stripe Connect', href: '/account/stripe' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: Settings, label: 'Customer Support',  href: '/support' },
        { icon: Shield,   label: 'Terms & Privacy', href: '/terms' },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Profile header */}
      <div className="gradient-brand px-4 pt-10 pb-16">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatarPreview} name={user.name} size="xl" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 disabled:opacity-70"
            >
              {isUploadingAvatar ? <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" /> : <Edit3 className="w-3.5 h-3.5 text-gray-600" />}
            </button>
          </div>

          <div className="flex-1 text-white">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/20 text-white placeholder-white/60 rounded-lg px-3 py-1.5 text-base font-bold outline-none border border-white/30 flex-1"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="bg-white text-purple-700 px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{user.name}</h2>
                <button onClick={() => setIsEditingName(true)} className="opacity-70 hover:opacity-100">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-white/70 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                {user.role}
              </span>
              {user.isVerified && (
                <span className="bg-green-400/20 text-white text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu cards */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-4">
        {MENU_SECTIONS.filter((s) => s.show !== false).map((section) => (
          <div key={section.title} className="bg-white rounded-2xl card-shadow overflow-hidden">
            <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.title}
            </p>
            {section.items.map((item, i) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                  i < section.items.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-purple-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-800">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </a>
            ))}
          </div>
        ))}

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-4 bg-white rounded-2xl card-shadow text-red-500 hover:bg-red-50 transition-colors"
        >
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-sm font-semibold">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
