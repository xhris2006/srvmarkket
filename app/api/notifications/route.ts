// ─── /api/notifications ────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'

export const GET = withAuth(async (_req, { user }) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return apiSuccess(notifications)
})

export const PATCH = withAuth(async (_req, { user }) => {
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })
  return apiSuccess({ marked: true })
})
