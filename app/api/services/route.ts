// ─── /api/services ─────────────────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const serviceSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  category: z.enum(['CLEANING','REPAIR','PLUMBING','ELECTRICAL','PAINTING','MOVING','GARDENING','COOKING','TUTORING','BEAUTY','FITNESS','PET_CARE','IT_SUPPORT','PHOTOGRAPHY','OTHER']),
  price: z.number().positive(),
  priceType: z.enum(['FIXED','HOURLY','NEGOTIABLE']).default('FIXED'),
  duration: z.number().positive().optional(),
})

// POST create service (provider only)
export const POST = withAuth(async (req, { user }) => {
  if (user.role !== 'PROVIDER') return apiError('Only providers can create services', 403)

  const body = await req.json()
  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const providerProfile = await prisma.providerProfile.findUnique({ where: { userId: user.id } })
  if (!providerProfile) return apiError('Provider profile not found', 404)

  const service = await prisma.service.create({
    data: { ...parsed.data, providerId: providerProfile.id },
  })

  return apiSuccess(service, 201)
}, ['PROVIDER'])

// GET list my services (provider)
export const GET = withAuth(async (req, { user }) => {
  const { searchParams } = new URL(req.url)
  const providerId = searchParams.get('providerId')

  if (providerId && providerId !== 'me') {
    const profile = await prisma.providerProfile.findFirst({
      where: {
        OR: [
          { id: providerId },
          { userId: providerId },
        ],
      },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!profile) return apiError('Provider profile not found', 404)
    return apiSuccess(profile.services)
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { services: { orderBy: { createdAt: 'desc' } } },
  })
  if (!profile) return apiError('Provider profile not found', 404)
  return apiSuccess(profile.services)
}, ['PROVIDER'])
