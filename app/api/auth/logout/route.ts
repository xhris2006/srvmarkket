// ─── POST /api/auth/logout ─────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value
    if (refreshToken) {
      const { sub } = await verifyRefreshToken(refreshToken).catch(() => ({ sub: null }))
      if (sub) {
        await prisma.user.update({ where: { id: sub }, data: { refreshToken: null } }).catch(() => {})
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('refreshToken')
    response.cookies.delete('accessToken')
    return response
  } catch {
    return NextResponse.json({ success: true })
  }
}
