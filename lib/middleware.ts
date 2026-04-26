// ─── API MIDDLEWARE ────────────────────────────────────────────────────────────
// Reusable middleware for route protection and request handling

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractBearerToken } from './auth'
import { Role } from '@/types'

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { params: Record<string, string>; user: { id: string; email: string; role: Role } }
) => Promise<NextResponse>

/**
 * Wraps an API route handler with JWT authentication.
 * Optionally restricts access by role.
 */
export function withAuth(handler: AuthenticatedHandler, allowedRoles?: Role[]) {
  return async (req: NextRequest, context: { params: Record<string, string> }) => {
    try {
      const authHeader = req.headers.get('Authorization')
      const token = extractBearerToken(authHeader)

      if (!token) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }

      const payload = await verifyAccessToken(token)

      // Role check
      if (allowedRoles && !allowedRoles.includes(payload.role)) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }

      return handler(req, {
        ...context,
        user: { id: payload.sub, email: payload.email, role: payload.role },
      })
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 })
    }
  }
}

/**
 * Standard success response helper
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * Standard error response helper
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * Rate limiting using in-memory store (use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(identifier: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false
  entry.count++
  return true
}
