// ─── /api/payments/connect ────────────────────────────────────────────────────
// Stripe Connect onboarding for providers to receive payments

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createStripeConnectAccount, createStripeOnboardingLink } from '@/services/payment'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'

export const POST = withAuth(async (_req, { user }) => {
  if (user.role !== 'PROVIDER') return apiError('Only providers can connect Stripe', 403)

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { email: true } } },
  })

  if (!profile) return apiError('Provider profile not found', 404)

  let stripeAccountId = profile.stripeAccountId

  // Create a new Stripe Connect account if one doesn't exist
  if (!stripeAccountId) {
    stripeAccountId = await createStripeConnectAccount(profile.user.email)
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { stripeAccountId },
    })
  }

  // Generate onboarding link
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/account/stripe?connected=true`
  const onboardingUrl = await createStripeOnboardingLink(stripeAccountId, returnUrl)

  return apiSuccess({ onboardingUrl, stripeAccountId })
}, ['PROVIDER'])

// GET - check Stripe Connect status
export const GET = withAuth(async (_req, { user }) => {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { stripeAccountId: true },
  })

  return apiSuccess({
    connected: !!profile?.stripeAccountId,
    stripeAccountId: profile?.stripeAccountId || null,
  })
}, ['PROVIDER'])
