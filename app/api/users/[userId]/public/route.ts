import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const identifier = params.userId

    const provider = await prisma.providerProfile.findFirst({
      where: {
        OR: [
          { userId: identifier },
          { id: identifier },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
            city: true,
            country: true,
            isVerified: true,
            createdAt: true,
          },
        },
        services: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          where: { isHidden: false },
          include: { author: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider not found' }, { status: 404 })
    }

    let canRate = false
    let ratingBookingId: string | null = null

    const token = extractBearerToken(req.headers.get('Authorization'))

    if (token) {
      try {
        const auth = await verifyAccessToken(token)
        const eligibleBooking = await prisma.booking.findFirst({
          where: {
            clientId: auth.sub,
            providerId: provider.id,
            status: 'COMPLETED',
            review: null,
          },
          orderBy: { updatedAt: 'desc' },
          select: { id: true },
        })

        canRate = !!eligibleBooking
        ratingBookingId = eligibleBooking?.id || null
      } catch {
        canRate = false
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...provider,
        canRate,
        ratingBookingId,
      },
    })
  } catch (error) {
    console.error('[GET /api/users/:userId/public]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
