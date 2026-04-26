// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value
    if (!refreshToken) {
      return NextResponse.json({ success: false, error: 'No refresh token' }, { status: 401 })
    }

    const { sub } = await verifyRefreshToken(refreshToken)
    const user = await prisma.user.findUnique({ where: { id: sub } })

    if (!user || !user.refreshToken) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken)
    if (!tokenMatch) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
    }

    const newAccessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const newRefreshToken = await signRefreshToken({ sub: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(newRefreshToken, 8) },
    })

    const response = NextResponse.json({ success: true, data: { accessToken: newAccessToken } })
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
  }
}
