// ─── GET /api/admin/analytics ─────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'

export const GET = withAuth(async () => {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers, newUsersThisMonth, totalProviders, totalBookings,
      completedBookings, pendingBookings, totalRevenue, monthlyRevenue,
      totalTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.providerProfile.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.transaction.aggregate({ where: { status: 'COMPLETED' }, _sum: { platformFee: true } }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: thirtyDaysAgo } },
        _sum: { platformFee: true },
      }),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    ])

    // Monthly user signup trend (last 6 months)
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
    const userTrend = await prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sixMonthsAgo } },
      _count: { _all: true },
    })

    return apiSuccess({
      users: { total: totalUsers, newThisMonth: newUsersThisMonth, providers: totalProviders },
      bookings: { total: totalBookings, completed: completedBookings, pending: pendingBookings },
      revenue: {
        total: totalRevenue._sum.platformFee || 0,
        thisMonth: monthlyRevenue._sum.platformFee || 0,
        transactions: totalTransactions,
      },
      trends: { userSignups: userTrend },
    })
  } catch (error) {
    console.error('[GET /api/admin/analytics]', error)
    return apiError('Internal server error', 500)
  }
}, ['ADMIN'])
