// ─── /api/admin/reviews ────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

// GET all reviews with moderation controls
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20
  const hidden = searchParams.get('hidden') === 'true'

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { isHidden: hidden },
      include: {
        author: { select: { id: true, name: true, email: true } },
        provider: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where: { isHidden: hidden } }),
  ])

  return apiSuccess({ items: reviews, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}, ['ADMIN'])

// PATCH hide/show a review
const schema = z.object({
  reviewId: z.string(),
  isHidden: z.boolean(),
})

export const PATCH = withAuth(async (req) => {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { reviewId, isHidden } = parsed.data

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden },
  })

  // Recalculate provider rating after hide/show
  const allVisible = await prisma.review.findMany({
    where: { providerId: updated.providerId, isHidden: false },
    select: { rating: true },
  })

  if (allVisible.length > 0) {
    const avg = allVisible.reduce((s, r) => s + r.rating, 0) / allVisible.length
    await prisma.providerProfile.update({
      where: { id: updated.providerId },
      data: { rating: Math.round(avg * 10) / 10, totalReviews: allVisible.length },
    })
  }

  return apiSuccess(updated)
}, ['ADMIN'])
