// ─── POST /api/messages/[conversationId]/report ───────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  messageId: z.string(),
  reason: z.string().min(5).max(500),
})

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { messageId, reason } = parsed.data

  // Verify message exists
  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message) return apiError('Message not found', 404)

  // Prevent duplicate reports from same user
  const existing = await prisma.report.findFirst({
    where: { messageId, reportedById: user.id },
  })
  if (existing) return apiError('You have already reported this message')

  const report = await prisma.report.create({
    data: { messageId, reportedById: user.id, reason },
  })

  return apiSuccess(report, 201)
})
