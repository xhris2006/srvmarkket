// ─── GET /api/providers/[id] ───────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, latitude: true, longitude: true, city: true, country: true, isVerified: true, createdAt: true },
        },
        services: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
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

    return NextResponse.json({ success: true, data: provider })
  } catch (error) {
    console.error('[GET /api/providers/:id]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
