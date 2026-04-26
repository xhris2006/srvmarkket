// ─── PAYMENT SERVICE LAYER ────────────────────────────────────────────────────
// Abstract payment provider with Stripe (primary) and PayPal (secondary)
// Automatically selects provider based on region or explicit choice

import Stripe from 'stripe'

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
})

const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT || 10)

// ─── STRIPE OPERATIONS ────────────────────────────────────────────────────────

/**
 * Creates a Stripe payment intent for a booking
 * Returns client_secret for frontend to complete payment
 */
export async function createStripePaymentIntent({
  amount,
  currency = 'usd',
  customerId,
  bookingId,
  providerStripeAccountId,
}: {
  amount: number
  currency?: string
  customerId?: string
  bookingId: string
  providerStripeAccountId?: string
}) {
  const amountInCents = Math.round(amount * 100)
  const platformFeeInCents = Math.round(amountInCents * (PLATFORM_FEE_PERCENT / 100))

  const paymentIntentData: Stripe.PaymentIntentCreateParams = {
    amount: amountInCents,
    currency,
    metadata: { bookingId },
    automatic_payment_methods: { enabled: true },
  }

  // If provider has a Connect account, split the payment
  if (providerStripeAccountId) {
    paymentIntentData.transfer_data = {
      destination: providerStripeAccountId,
    }
    paymentIntentData.application_fee_amount = platformFeeInCents
  }

  if (customerId) {
    paymentIntentData.customer = customerId
  }

  const intent = await stripe.paymentIntents.create(paymentIntentData)
  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
    platformFee: platformFeeInCents / 100,
  }
}

/**
 * Creates a Stripe Connect account for a provider
 */
export async function createStripeConnectAccount(email: string) {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  })
  return account.id
}

/**
 * Generates Stripe Connect onboarding link
 */
export async function createStripeOnboardingLink(accountId: string, returnUrl: string) {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
  return link.url
}

/**
 * Verifies Stripe webhook signature
 * Returns the parsed event or throws on invalid signature
 */
export function verifyStripeWebhook(payload: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || ''
  )
}

/**
 * Issues a refund for a payment intent
 */
export async function createStripeRefund(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    ...(amount ? { amount: Math.round(amount * 100) } : {}),
  })
}

// ─── PAYPAL OPERATIONS ────────────────────────────────────────────────────────

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

/**
 * Gets a PayPal OAuth access token
 */
async function getPayPalAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  return data.access_token
}

/**
 * Creates a PayPal order for payment
 */
export async function createPayPalOrder({
  amount,
  currency = 'USD',
  bookingId,
}: {
  amount: number
  currency?: string
  bookingId: string
}) {
  const accessToken = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: currency, value: amount.toFixed(2) },
          custom_id: bookingId,
        },
      ],
    }),
  })

  return res.json()
}

/**
 * Captures (finalizes) a PayPal order after user approval
 */
export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  return res.json()
}

// ─── PROVIDER SELECTOR ────────────────────────────────────────────────────────

/**
 * Determines which payment provider to use based on user country
 * EU/UK users might prefer SEPA/PayPal; US/global users default to Stripe
 */
export function getPaymentProvider(countryCode?: string): 'stripe' | 'paypal' {
  // Default to Stripe for all regions (most capable)
  // Add region-specific logic here as needed
  return 'stripe'
}
