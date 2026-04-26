// ─── POST /api/payments/webhook ────────────────────────────────────────────────
// Stripe webhook: handles payment completion, refunds, etc.

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { verifyStripeWebhook } from '@/services/payment'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event
  try {
    event = verifyStripeWebhook(body, signature)
  } catch (err) {
    console.error('[Webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent
        const bookingId = intent.metadata?.bookingId
        if (!bookingId) break

        // Update transaction status
        await prisma.transaction.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: 'COMPLETED' },
        })

        // Update booking to in-progress
        const booking = await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'IN_PROGRESS' },
          include: { provider: true, service: true, client: true },
        })

        // Notify provider payment received
        await prisma.notification.create({
          data: {
            userId: booking.provider.userId,
            title: 'Payment received',
            body: `Payment of $${booking.totalAmount} for "${booking.service.title}" has been received`,
            type: 'PAYMENT_RECEIVED',
            data: { bookingId },
          },
        })

        // Notify client
        await prisma.notification.create({
          data: {
            userId: booking.clientId,
            title: 'Payment successful',
            body: `Your payment for "${booking.service.title}" was successful`,
            type: 'PAYMENT_SUCCESS',
            data: { bookingId },
          },
        })
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        await prisma.transaction.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: 'FAILED' },
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        if (!charge.payment_intent || typeof charge.payment_intent !== 'string') break
        await prisma.transaction.updateMany({
          where: { stripePaymentIntentId: charge.payment_intent },
          data: { status: 'REFUNDED' },
        })
        break
      }

      default:
        console.log(`[Webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Handler error:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}
