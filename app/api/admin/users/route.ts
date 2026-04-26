// ─── /api/admin/users ──────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

// GET all users (admin only)
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role')

  const where: Record<string, unknown> = {
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(role ? { role } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isVerified: true, isBanned: true, banReason: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ])

  return apiSuccess({ items: users, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}, ['ADMIN'])

// PATCH ban/unban/verify user
const updateUserSchema = z.object({
  userId: z.string(),
  action: z.enum(['ban', 'unban', 'verify', 'unverify']),
  banReason: z.string().optional(),
})

export const PATCH = withAuth(async (req) => {
  const body = await req.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { userId, action, banReason } = parsed.data

  const updateData: Record<string, unknown> = {}
  if (action === 'ban') { updateData.isBanned = true; updateData.banReason = banReason || 'Policy violation' }
  if (action === 'unban') { updateData.isBanned = false; updateData.banReason = null }
  if (action === 'verify') updateData.isVerified = true
  if (action === 'unverify') updateData.isVerified = false

  const user = await prisma.user.update({ where: { id: userId }, data: updateData,
    select: { id: true, name: true, email: true, isBanned: true, isVerified: true } })

  // Also update provider badge if verifying
  if (action === 'verify') {
    await prisma.providerProfile.updateMany({ where: { userId }, data: { isVerifiedBadge: true } })
  }

  return apiSuccess(user)
}, ['ADMIN'])
