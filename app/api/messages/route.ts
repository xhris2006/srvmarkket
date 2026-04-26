// ─── /api/messages ─────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const startConversationSchema = z.object({
  participantId: z.string(),
})

// ─── GET conversations list ────────────────────────────────────────────────────
export const GET = withAuth(async (_req, { user }) => {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: user.id } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return apiSuccess(conversations)
})

// ─── POST start or get existing conversation ───────────────────────────────────
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = startConversationSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { participantId } = parsed.data
  if (participantId === user.id) return apiError('Cannot start conversation with yourself')

  // Check if conversation already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: participantId } } },
      ],
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })

  if (existing) return apiSuccess(existing)

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: user.id }, { userId: participantId }],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })

  return apiSuccess(conversation, 201)
})
