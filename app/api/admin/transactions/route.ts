// ─── /api/admin/transactions ───────────────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { createStripeRefund } from '@/services/payment'
import { z } from 'zod'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const status = searchParams.get('status')

  const where = status ? { status: status as never } : {}

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        booking: { include: { service: { select: { title: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  return apiSuccess({ items: transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
}, ['ADMIN'])

// POST - issue refund
const refundSchema = z.object({
  transactionId: z.string(),
  reason: z.string().optional(),
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const parsed = refundSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.errors[0].message)

  const { transactionId } = parsed.data
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } })

  if (!transaction) return apiError('Transaction not found', 404)
  if (transaction.status === 'REFUNDED') return apiError('Already refunded')
  if (transaction.status !== 'COMPLETED') return apiError('Can only refund completed transactions')

  if (transaction.stripePaymentIntentId) {
    await createStripeRefund(transaction.stripePaymentIntentId)
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'REFUNDED' },
  })

  return apiSuccess(updated)
}, ['ADMIN'])
