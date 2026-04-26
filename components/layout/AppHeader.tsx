'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Search, User } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { Avatar } from '@/components/ui/Avatar'

export function AppHeader() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/admin') ||
    pathname.includes('/call')
  ) {
    return null
  }

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-bold text-xl text-purple-700">
          SrvMarkket
        </Link>

        <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/search" className="hover:text-purple-700">Explore</Link>
          <Link href="/messages" className="hover:text-purple-700">Chat</Link>
          {user ? (
            <Link href={`/profile/${user.id}`} className="hover:text-purple-700">
              Profile
            </Link>
          ) : null}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/search" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700">
              <Search className="w-4 h-4" />
              Browse
            </Link>
            <Link href="/messages" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:border-purple-300 hover:text-purple-700">
              <MessageCircle className="w-4 h-4" />
              Messages
            </Link>
            <Link href="/account" className="flex items-center gap-2">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-purple-700">
              Sign In
            </Link>
            <Link href="/auth/register" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
              <User className="w-4 h-4" />
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
