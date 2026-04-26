import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createStripeConnectAccount, createStripeOnboardingLink } from '@/services/payment'
import { withAuth, apiSuccess, apiError } from '@/lib/middleware'

export const GET = withAuth(async (req, { user }) => {
  if (user.role !== 'PROVIDER') return apiError('Only providers can connect Stripe', 403)

  const statusOnly = new URL(req.url).searchParams.get('status') === '1'

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    include: { user: { select: { email: true } } },
  })

  if (!profile) return apiError('Provider profile not found', 404)

  if (statusOnly) {
    return apiSuccess({
      connected: !!profile.stripeAccountId,
      stripeAccountId: profile.stripeAccountId || null,
    })
  }

  let stripeAccountId = profile.stripeAccountId

  if (!stripeAccountId) {
    stripeAccountId = await createStripeConnectAccount(profile.user.email)
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { stripeAccountId },
    })
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/provider/stripe-callback?connected=true`
  const onboardingUrl = await createStripeOnboardingLink(stripeAccountId, returnUrl)

  return apiSuccess({
    connected: !!stripeAccountId,
    stripeAccountId,
    onboardingUrl,
  })
}, ['PROVIDER'])
