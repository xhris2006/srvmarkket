// ─── /api/users/me ─────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

// GET current user profile
export const GET = withAuth(async (_req, { user }) => {
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, avatar: true, phone: true, language: true,
      role: true, isVerified: true, city: true, country: true,
      latitude: true, longitude: true, createdAt: true,
      providerProfile: {
        select: {
          id: true, bio: true, tagline: true, isAvailable: true,
          isVerifiedBadge: true, rating: true, totalReviews: true,
          completedJobs: true, stripeAccountId: true,
        },
      },
    },
  })
  if (!profile) return apiError('User not found', 404)
  return apiSuccess(profile)
})

const updateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z.string().optional(),
  language: z.string().max(20).optional(),
  avatar: z.string().refine((value) => value.startsWith('/') || z.string().url().safeParse(value).success, {
    message: 'Invalid avatar URL',
  }).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Provider-specific
  bio: z.string().max(500).optional(),
  tagline: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
})

// PATCH update user profile
export const PATCH = withAuth(async (req, { user }) => {
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { bio, tagline, isAvailable, ...userFields } = parsed.data

  // Update user fields
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: userFields,
    select: { id: true, name: true, email: true, avatar: true, phone: true, language: true, role: true, isVerified: true },
  })

  // Update provider profile if provider fields provided
  if ((bio !== undefined || tagline !== undefined || isAvailable !== undefined) && user.role === 'PROVIDER') {
    await prisma.providerProfile.update({
      where: { userId: user.id },
      data: { ...(bio !== undefined && { bio }), ...(tagline !== undefined && { tagline }), ...(isAvailable !== undefined && { isAvailable }) },
    })
  }

  return apiSuccess(updatedUser)
})
