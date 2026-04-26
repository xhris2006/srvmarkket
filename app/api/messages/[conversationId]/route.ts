// ─── /api/messages/[conversationId] ───────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().optional(),
  type: z.enum(['TEXT', 'VOICE', 'IMAGE']).default('TEXT'),
  audioUrl: z.string().optional(),
})

// ─── GET messages in a conversation ────────────────────────────────────────────
export const GET = withAuth(async (req, { params, user }) => {
  const { conversationId } = params
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 50

  // Verify participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  })
  if (!participant) return apiError('Not a participant', 403)

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.message.count({ where: { conversationId } }),
  ])

  return apiSuccess({ messages: messages.reverse(), total, page, pageSize })
})

// ─── POST send a message ────────────────────────────────────────────────────────
export const POST = withAuth(async (req, { params, user }) => {
  const { conversationId } = params
  const body = await req.json()
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { content, type, audioUrl } = parsed.data

  if (type === 'TEXT' && !content?.trim()) return apiError('Message content required')
  if (type === 'VOICE' && !audioUrl) return apiError('Audio URL required for voice messages')

  // Verify participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  })
  if (!participant) return apiError('Not a participant', 403)

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, content, type, audioUrl },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: content || '🎙️ Voice message', lastMessageAt: new Date() },
    }),
  ])

  return apiSuccess(message, 201)
})
