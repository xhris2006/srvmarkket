// ─── POST /api/payments/create-intent ─────────────────────────────────────────
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createStripePaymentIntent } from '@/services/payment'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'
import { z } from 'zod'

const schema = z.object({
  bookingId: z.string(),
  provider: z.enum(['stripe', 'paypal']).default('stripe'),
  currency: z.string().default('usd'),
})

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message)

    const { bookingId, currency } = parsed.data

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        provider: { select: { stripeAccountId: true } },
        transaction: true,
      },
    })

    if (!booking) return apiError('Booking not found', 404)
    if (booking.status !== 'ACCEPTED') return apiError('Booking must be accepted before payment')
    if (booking.transaction) return apiError('Payment already initiated')

    const { clientSecret, paymentIntentId, platformFee } = await createStripePaymentIntent({
      amount: booking.totalAmount,
      currency,
      bookingId,
      providerStripeAccountId: booking.provider.stripeAccountId || undefined,
    })

    // Create pending transaction record
    await prisma.transaction.create({
      data: {
        bookingId,
        userId: booking.clientId,
        amount: booking.totalAmount,
        currency,
        platformFee,
        providerAmount: booking.totalAmount - platformFee,
        status: 'PENDING',
        provider: 'STRIPE',
        stripePaymentIntentId: paymentIntentId,
      },
    })

    return apiSuccess({ clientSecret, publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY })
  } catch (error) {
    console.error('[POST /api/payments/create-intent]', error)
    return apiError('Internal server error', 500)
  }
})
