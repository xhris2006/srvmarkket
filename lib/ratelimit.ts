// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
// In-memory rate limiter for development / low-traffic Vercel deployments.
// For production scale, swap the in-memory store with Redis (Upstash recommended).

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store — cleared on each serverless cold start
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    store.forEach((entry, key) => {
      if (now > entry.resetAt) store.delete(key)
    })
  }, 5 * 60 * 1000)
}

export interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfterMs: number
}

/**
 * Checks and increments the rate limit counter for a given identifier.
 * Returns whether the request is allowed and remaining quota.
 *
 * Usage:
 *   const result = checkRateLimit(`auth:${ip}`, { limit: 5, windowMs: 60_000 })
 *   if (!result.allowed) return apiError('Too many requests', 429)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 60, windowMs: 60_000 }
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + options.windowMs
    store.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: options.limit - 1, resetAt, retryAfterMs: 0 }
  }

  if (entry.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: options.limit - entry.count,
    resetAt: entry.resetAt,
    retryAfterMs: 0,
  }
}

// ─── PRE-BUILT LIMITERS ────────────────────────────────────────────────────────

/** Strict limiter for auth endpoints (5 req / minute) */
export const authLimiter = (ip: string) =>
  checkRateLimit(`auth:${ip}`, { limit: 5, windowMs: 60_000 })

/** API limiter for general endpoints (100 req / minute) */
export const apiLimiter = (userId: string) =>
  checkRateLimit(`api:${userId}`, { limit: 100, windowMs: 60_000 })

/** Upload limiter (10 uploads / hour) */
export const uploadLimiter = (userId: string) =>
  checkRateLimit(`upload:${userId}`, { limit: 10, windowMs: 60 * 60_000 })

/** Search limiter (30 req / minute for unauthenticated) */
export const searchLimiter = (ip: string) =>
  checkRateLimit(`search:${ip}`, { limit: 30, windowMs: 60_000 })
