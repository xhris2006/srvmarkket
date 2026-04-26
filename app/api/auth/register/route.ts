// ─── POST /api/auth/register ───────────────────────────────────────────────────
// Creates a new user account with hashed password

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['CLIENT', 'PROVIDER']).default('CLIENT'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const name = parsed.data.name.trim()
    const email = parsed.data.email.trim().toLowerCase()
    const { password, role } = parsed.data

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 409 }
      )
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user with optional provider profile
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        // Auto-create provider profile for providers
        providerProfile: role === 'PROVIDER' ? { create: {} } : undefined,
      },
      select: { id: true, email: true, name: true, avatar: true, role: true, isVerified: true },
    })

    // Issue tokens
    const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role })
    const refreshToken = await signRefreshToken({ sub: user.id })

    // Store refresh token hash in DB
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 8) },
    })

    const response = NextResponse.json({
      success: true,
      data: { user, accessToken },
    }, { status: 201 })

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[Register]', error)

    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('environment variable not found')) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error. Please contact support.' },
          { status: 503 }
        )
      }

      if (message.includes('can\'t reach database server') || message.includes('can not reach database server')) {
        return NextResponse.json(
          { success: false, error: 'Database unavailable. Please try again in a moment.' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
