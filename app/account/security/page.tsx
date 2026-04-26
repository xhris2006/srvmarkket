'use client'

import { useState } from 'react'
import { ArrowLeft, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'

export default function SecurityPage() {
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const { success, error } = useToast()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [isLoading, setIsLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      error('New passwords do not match')
      return
    }
    if (form.newPassword.length < 8) {
      error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })
      const data = await res.json()
      if (data.success) {
        success('Password updated successfully')
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        error(data.error || 'Failed to update password')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const PasswordField = ({
    label, field, showKey,
  }: {
    label: string
    field: keyof typeof form
    showKey: keyof typeof show
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show[showKey] ? 'text' : 'password'}
          value={form[field]}
          onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
          className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((p) => ({ ...p, [showKey]: !p[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show[showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-purple-600" />
            Privacy & Security
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleChangePassword} className="bg-white rounded-2xl p-6 card-shadow space-y-4">
          <h2 className="font-semibold text-gray-900">Change Password</h2>

          <PasswordField label="Current password" field="currentPassword" showKey="current" />
          <PasswordField label="New password" field="newPassword" showKey="new" />
          <PasswordField label="Confirm new password" field="confirmPassword" showKey="confirm" />

          <Button type="submit" isLoading={isLoading} className="w-full">
            Update Password
          </Button>
        </form>

        {/* Account danger zone */}
        <div className="bg-white rounded-2xl p-6 card-shadow mt-4">
          <h2 className="font-semibold text-gray-900 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-4">These actions are irreversible.</p>
          <button className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  )
}
