// ─── /api/bookings ─────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const createBookingSchema = z.object({
  serviceId: z.string(),
  scheduledAt: z.string().datetime(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// ─── CREATE BOOKING ────────────────────────────────────────────────────────────
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json()
    const parsed = createBookingSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const { serviceId, scheduledAt, address, notes } = parsed.data

    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
      include: { provider: true },
    })

    if (!service) return apiError('Service not found', 404)
    if (service.provider.userId === user.id) return apiError('Cannot book your own service')

    const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || 10)
    const platformFee = service.price * (PLATFORM_FEE_PERCENT / 100)

    const booking = await prisma.booking.create({
      data: {
        clientId: user.id,
        providerId: service.providerId,
        serviceId,
        scheduledAt: new Date(scheduledAt),
        address,
        notes,
        totalAmount: service.price,
        platformFee,
        status: 'PENDING',
      },
      include: {
        service: true,
        client: { select: { id: true, name: true, avatar: true } },
      },
    })

    // Create notification for provider
    await prisma.notification.create({
      data: {
        userId: service.provider.userId,
        title: 'New booking request',
        body: `${booking.client.name} wants to book "${service.title}"`,
        type: 'BOOKING_REQUEST',
        data: { bookingId: booking.id },
      },
    })

    return apiSuccess(booking, 201)
  } catch (error) {
    console.error('[POST /api/bookings]', error)
    return apiError('Internal server error', 500)
  }
})

// ─── LIST BOOKINGS ─────────────────────────────────────────────────────────────
export const GET = withAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role') || 'client'
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      ...(role === 'client' ? { clientId: user.id } : { provider: { userId: user.id } }),
      ...(status ? { status } : {}),
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: { include: { provider: { include: { user: { select: { id: true, name: true, avatar: true } } } } } },
        client: { select: { id: true, name: true, avatar: true } },
        transaction: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess(bookings)
  } catch (error) {
    console.error('[GET /api/bookings]', error)
    return apiError('Internal server error', 500)
  }
})
