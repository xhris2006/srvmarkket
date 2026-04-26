import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const ratingSchema = z.object({
  targetUserId: z.string(),
  score: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = ratingSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { targetUserId, score, comment } = parsed.data

  const providerProfile = await prisma.providerProfile.findUnique({
    where: { userId: targetUserId },
    select: { id: true },
  })

  if (!providerProfile) return apiError('Provider not found', 404)

  const booking = await prisma.booking.findFirst({
    where: {
      clientId: user.id,
      providerId: providerProfile.id,
      status: 'COMPLETED',
      review: null,
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!booking) {
    return apiError('You can only rate a provider after a completed booking', 403)
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      authorId: user.id,
      providerId: providerProfile.id,
      rating: score,
      comment,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  })

  const allReviews = await prisma.review.findMany({
    where: { providerId: providerProfile.id, isHidden: false },
    select: { rating: true },
  })

  const avg = allReviews.reduce((sum, item) => sum + item.rating, 0) / allReviews.length

  await prisma.providerProfile.update({
    where: { id: providerProfile.id },
    data: {
      rating: Math.round(avg * 10) / 10,
      totalReviews: allReviews.length,
    },
  })

  return apiSuccess(review, 201)
})
