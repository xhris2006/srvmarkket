// ─── JWT AUTH UTILITIES ────────────────────────────────────────────────────────
// Handles signing, verifying access/refresh tokens using jose (Edge-compatible)

import { SignJWT, jwtVerify } from 'jose'
import { JWTPayload, Role } from '@/types'

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET || 'fallback-secret-change-in-production'
)
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production'
)

/**
 * Signs a JWT access token (short-lived, 15 minutes default)
 */
export async function signAccessToken(payload: { sub: string; email: string; role: Role }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN || '15m')
    .sign(ACCESS_SECRET)
}

/**
 * Signs a JWT refresh token (long-lived, 7 days default)
 */
export async function signRefreshToken(payload: { sub: string }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || '7d')
    .sign(REFRESH_SECRET)
}

/**
 * Verifies an access token and returns the decoded payload
 * Throws if token is invalid or expired
 */
export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET)
  return payload as unknown as JWTPayload
}

/**
 * Verifies a refresh token and returns the user ID
 */
export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET)
  return payload as { sub: string }
}

/**
 * Extracts the Bearer token from the Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}
