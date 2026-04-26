// ─── POST /api/reviews ────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export const POST = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { bookingId, rating, comment } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { review: true },
  })

  if (!booking) return apiError('Booking not found', 404)
  if (booking.clientId !== user.id) return apiError('Only the client can leave a review')
  if (booking.status !== 'COMPLETED') return apiError('Can only review completed bookings')
  if (booking.review) return apiError('Review already submitted')

  const review = await prisma.review.create({
    data: { bookingId, authorId: user.id, providerId: booking.providerId, rating, comment },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  // Recalculate provider average rating
  const allReviews = await prisma.review.findMany({
    where: { providerId: booking.providerId, isHidden: false },
    select: { rating: true },
  })
  const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

  await prisma.providerProfile.update({
    where: { id: booking.providerId },
    data: { rating: Math.round(avg * 10) / 10, totalReviews: allReviews.length },
  })

  return apiSuccess(review, 201)
})
