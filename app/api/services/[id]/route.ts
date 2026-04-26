// ─── /api/services/[id] ────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  price: z.number().positive().optional(),
  priceType: z.enum(['FIXED','HOURLY','NEGOTIABLE']).optional(),
  duration: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

export const PATCH = withAuth(async (req, { params, user }) => {
  const service = await prisma.service.findFirst({ where: { id: params.id, provider: { userId: user.id } } })
  if (!service) return apiError('Not found or access denied', 404)
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)
  const updated = await prisma.service.update({ where: { id: params.id }, data: parsed.data })
  return apiSuccess(updated)
}, ['PROVIDER'])

export const DELETE = withAuth(async (_req, { params, user }) => {
  const service = await prisma.service.findFirst({ where: { id: params.id, provider: { userId: user.id } } })
  if (!service) return apiError('Not found or access denied', 404)
  const activeCount = await prisma.booking.count({ where: { serviceId: params.id, status: { in: ['PENDING','ACCEPTED','IN_PROGRESS'] } } })
  if (activeCount > 0) return apiError('Cannot delete service with active bookings', 409)
  await prisma.service.delete({ where: { id: params.id } })
  return apiSuccess({ deleted: true })
}, ['PROVIDER'])

// ─── GET /api/services/[id] ────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: params.id, isActive: true },
      include: {
        provider: {
          include: {
            user: { select: { id: true, name: true, avatar: true, city: true, country: true } },
          },
        },
      },
    })
    if (!service) {
      return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: service })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
