// ─── POST /api/auth/login ──────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from '@/lib/auth-cookies'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    if (user.isBanned) {
      return NextResponse.json({ success: false, error: `Account suspended: ${user.banReason || 'Policy violation'}` }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const refreshToken = await signRefreshToken({ sub: user.id })

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar, phone: user.phone, language: user.language, role: user.role, isVerified: user.isVerified },
        accessToken,
      },
    })

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_MAX_AGE,
      path: '/',
    })
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ACCESS_TOKEN_MAX_AGE,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Login]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
