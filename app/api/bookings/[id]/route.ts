// ─── GET /api/bookings/[id] ────────────────────────────────────────────────────
export const GET = withAuth(async (_req, { params, user }) => {
  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      service: {
        include: {
          provider: {
            include: { user: { select: { id: true, name: true, avatar: true, city: true } } },
          },
        },
      },
      client: { select: { id: true, name: true, avatar: true, email: true } },
      transaction: true,
      review: true,
    },
  })
  if (!booking) return apiError('Booking not found', 404)
  const isClient = booking.clientId === user.id
  const isProvider = booking.service.provider.userId === user.id
  if (!isClient && !isProvider && user.role !== 'ADMIN') return apiError('Forbidden', 403)
  return apiSuccess(booking)
})

// ─── PATCH /api/bookings/[id] ──────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
})

export const PATCH = withAuth(async (req, { params, user }) => {
  try {
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { provider: true, client: true, service: true },
    })

    if (!booking) return apiError('Booking not found', 404)

    // Authorization: client can cancel, provider can accept/reject/complete
    const isClient = booking.clientId === user.id
    const isProvider = booking.provider.userId === user.id
    const isAdmin = user.role === 'ADMIN'

    if (!isClient && !isProvider && !isAdmin) return apiError('Forbidden', 403)

    const { status } = parsed.data

    // Business rules
    if (status === 'ACCEPTED' || status === 'REJECTED') {
      if (!isProvider && !isAdmin) return apiError('Only the provider can accept or reject')
      if (booking.status !== 'PENDING') return apiError('Can only accept/reject pending bookings')
    }

    if (status === 'CANCELLED') {
      if (!isClient && !isAdmin) return apiError('Only the client can cancel')
      if (['COMPLETED', 'CANCELLED'].includes(booking.status)) return apiError('Cannot cancel this booking')
    }

    if (status === 'COMPLETED') {
      if (!isProvider && !isAdmin) return apiError('Only the provider can mark as completed')
      if (booking.status !== 'IN_PROGRESS') return apiError('Booking must be in progress to complete')
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
    })

    // Notify the other party
    const notifyUserId = isProvider ? booking.clientId : booking.provider.userId
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        title: `Booking ${status.toLowerCase()}`,
        body: `Your booking for "${booking.service.title}" has been ${status.toLowerCase()}`,
        type: 'BOOKING_UPDATE',
        data: { bookingId: booking.id },
      },
    })

    // Update provider stats if completed
    if (status === 'COMPLETED') {
      await prisma.providerProfile.update({
        where: { id: booking.providerId },
        data: { completedJobs: { increment: 1 } },
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('[PATCH /api/bookings/:id]', error)
    return apiError('Internal server error', 500)
  }
})
