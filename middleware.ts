// ─── NEXT.JS EDGE MIDDLEWARE ───────────────────────────────────────────────────
// Protects routes that require authentication by redirecting unauthenticated users

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken } from '@/lib/auth'

// Routes that require the user to be logged in
const PROTECTED_PATHS = [
  '/bookings',
  '/chat',
  '/payment',
  '/booking',
  '/account',
  '/messages',
  '/profile/setup',
]

// Routes that require admin role
const ADMIN_PATHS = ['/admin/dashboard', '/admin/users', '/admin/transactions']

// Routes only for guests (redirect if logged in)
const GUEST_ONLY_PATHS = ['/auth/login', '/auth/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check if it's an admin path
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p))
  const isProtectedPath = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isGuestOnlyPath = GUEST_ONLY_PATHS.some((p) => pathname.startsWith(p))

  if (!isAdminPath && !isProtectedPath && !isGuestOnlyPath) {
    return NextResponse.next()
  }

  // Try to get token from cookie (for SSR) or Authorization header
  const cookieToken = req.cookies.get('accessToken')?.value
  const headerToken = extractBearerToken(req.headers.get('Authorization'))
  const token = cookieToken || headerToken

  let user: { role: string } | null = null

  if (token) {
    try {
      user = await verifyAccessToken(token)
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }

  // Admin path: redirect to admin login if not authenticated as admin
  if (isAdminPath) {
    if (!user || (user as any).role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    return NextResponse.next()
  }

  // Protected path: redirect to login if not authenticated
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Guest-only path: redirect to search if already authenticated
  if (isGuestOnlyPath && user) {
    return NextResponse.redirect(new URL('/search', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/bookings/:path*',
    '/chat/:path*',
    '/payment/:path*',
    '/booking/:path*',
    '/account/:path*',
    '/messages/:path*',
    '/profile/setup',
    '/admin/dashboard',
    '/admin/users',
    '/admin/transactions',
    '/auth/login',
    '/auth/register',
  ],
}
