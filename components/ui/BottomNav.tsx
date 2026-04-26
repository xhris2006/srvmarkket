// ─── BOTTOM NAVIGATION (MOBILE) ───────────────────────────────────────────────
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Search, MessageCircle, Calendar, User } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/store'
import { useNotificationStore } from '@/lib/store'

const NAV_ITEMS = [
  { href: '/',         icon: Home,          label: 'Home' },
  { href: '/search',   icon: Search,        label: 'Explore' },
  { href: '/messages', icon: MessageCircle, label: 'Chat',    badge: true },
  { href: '/bookings', icon: Calendar,      label: 'Bookings' },
  { href: '/account',  icon: User,          label: 'Account' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  // Don't show on admin, auth, or call pages
  if (!user) return null
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/chat/') ||
    pathname.includes('/call')
  ) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t safe-bottom md:hidden">
      <div className="flex items-stretch">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors',
                isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <div className="relative">
                <Icon className={clsx('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={clsx('text-[10px] font-medium', isActive ? 'text-purple-600' : 'text-gray-400')}>
                {label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-600 rounded-b-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
