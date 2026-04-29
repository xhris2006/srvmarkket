'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, setAccessToken } = useAuthStore()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Invalid credentials')
        return
      }

      setUser(data.data.user)
      setAccessToken(data.data.accessToken)

      const role = data.data.user.role
      const redirectTo = searchParams.get('redirect')
      if (role === 'ADMIN') router.push('/admin/dashboard')
      else if (redirectTo && redirectTo.startsWith('/')) router.push(redirectTo)
      else router.push('/search')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 gradient-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your ServMarket account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <a href="/auth/forgot-password" className="text-xs text-purple-600 hover:text-purple-700">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-brand text-white py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <a href="/auth/register" className="text-purple-600 font-medium hover:text-purple-700">
            Create one
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-purple-600 animate-spin" /></div>}>
      <LoginPageContent />
    </Suspense>
  )
}
