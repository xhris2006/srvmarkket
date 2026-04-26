// ─── PATCH /api/users/password ────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { currentPassword, newPassword } = parsed.data

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) return apiError('User not found', 404)

  const match = await bcrypt.compare(currentPassword, dbUser.passwordHash)
  if (!match) return apiError('Current password is incorrect', 401)

  const newHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } })

  return apiSuccess({ updated: true })
})
