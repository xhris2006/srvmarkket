// ─── GET /api/providers ────────────────────────────────────────────────────────
// Search and filter providers with geo distance, rating, category

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Haversine formula: distance in km between two lat/lng points
 */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const category = searchParams.get('category')
    const lat = parseFloat(searchParams.get('lat') || '0')
    const lng = parseFloat(searchParams.get('lng') || '0')
    const radius = parseFloat(searchParams.get('radius') || '50')
    const minRating = parseFloat(searchParams.get('minRating') || '0')
    const isAvailable = searchParams.get('isAvailable') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '12'), 50)
    const sortBy = searchParams.get('sortBy') || 'rating'

    // Build prisma where clause
    const where: Record<string, unknown> = {
      user: { isBanned: false },
      ...(isAvailable ? { isAvailable: true } : {}),
      ...(minRating > 0 ? { rating: { gte: minRating } } : {}),
    }

    if (category) {
      where.services = { some: { category, isActive: true } }
    }

    if (query) {
      where.OR = [
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { bio: { contains: query, mode: 'insensitive' } },
        { tagline: { contains: query, mode: 'insensitive' } },
        { services: { some: { title: { contains: query, mode: 'insensitive' } } } },
      ]
    }

    const providers = await prisma.providerProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true, latitude: true, longitude: true, city: true, country: true, isVerified: true } },
        services: { where: { isActive: true }, take: 3 },
      },
      orderBy: sortBy === 'rating' ? { rating: 'desc' } : sortBy === 'newest' ? { createdAt: 'desc' } : { rating: 'desc' },
    })

    // Apply geo filter and compute distance
    let results = providers.map((p) => {
      let distance: number | undefined
      if (lat && lng && p.user.latitude && p.user.longitude) {
        distance = haversine(lat, lng, p.user.latitude, p.user.longitude)
      }
      return { ...p, distance }
    })

    if (lat && lng) {
      results = results.filter((p) => !p.distance || p.distance <= radius)
      if (sortBy === 'distance') {
        results.sort((a, b) => (a.distance || 999) - (b.distance || 999))
      }
    }

    // Paginate
    const total = results.length
    const paginated = results.slice((page - 1) * pageSize, page * pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('[GET /api/providers]', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
