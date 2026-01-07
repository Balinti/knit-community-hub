import Stripe from 'stripe'

// Server-side Stripe client
export function getStripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return null
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  })
}

export function isStripeConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
}

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null
}

export function getProPriceId(): string | null {
  return process.env.STRIPE_PRO_PRICE_ID || null
}

// Helper to create checkout session for Pro subscription
export async function createProCheckoutSession(
  stripe: Stripe,
  customerId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  const proPriceId = getProPriceId()
  if (!proPriceId) {
    return null
  }

  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: proPriceId,
        quantity: 1,
      },
    ],
    metadata: {
      app_name: 'knit-community-hub',
      type: 'pro_subscription',
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}

// Helper to create checkout session for Support Pack (one-time)
export async function createPackCheckoutSession(
  stripe: Stripe,
  customerId: string,
  priceId: string,
  packId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      app_name: 'knit-community-hub',
      type: 'support_pack',
      pack_id: packId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}

// Helper to create billing portal session
export async function createBillingPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

// Helper to get or create Stripe customer
export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabase_user_id: userId,
    },
  })

  return customer.id
}
