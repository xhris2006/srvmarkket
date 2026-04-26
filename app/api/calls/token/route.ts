// ─── POST /api/calls/token ─────────────────────────────────────────────────────
// Generates an Agora RTC token for voice/video calls
// Agora SDK handles WebRTC complexity (TURN servers, codec negotiation, etc.)

import { NextRequest } from 'next/server'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  channelName: z.string().min(1),
  uid: z.number().optional(),
})

/**
 * Generates an Agora token using HMAC-SHA256 (simplified version)
 * In production, use the official agora-access-token package
 */
function generateAgoraToken(appId: string, appCertificate: string, channelName: string, uid: number): string {
  // Token version
  const VERSION = '006'
  const SERVICE_TYPE = 1 // RTC
  
  const currentTime = Math.floor(Date.now() / 1000)
  const expireTime = currentTime + 3600 // 1 hour

  const message = `${appId}${channelName}${uid}${expireTime}`
  const hmac = crypto.createHmac('sha256', appCertificate).update(message).digest('hex')
  
  return `${VERSION}${appId}${hmac}${expireTime.toString(16).padStart(8, '0')}`
}

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || process.env.AGORA_APP_ID
  const appCertificate = process.env.AGORA_APP_CERTIFICATE

  if (!appId || !appCertificate) {
    return apiError('Agora not configured. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.', 500)
  }

  const { channelName, uid = Math.floor(Math.random() * 100000) } = parsed.data

  const token = generateAgoraToken(appId, appCertificate, channelName, uid)

  return apiSuccess({ token, channelName, uid, appId, expiresIn: 3600 })
})
