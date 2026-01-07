import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import {
  getStripeServer,
  isStripeConfigured,
  getProPriceId,
  getOrCreateStripeCustomer,
  createProCheckoutSession,
  createPackCheckoutSession,
} from '@/lib/stripe'
import { checkoutSchema } from '@/lib/validators'
import { getAppUrl } from '@/lib/utils'

// POST /api/stripe/checkout - Create checkout session
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payments not configured' },
        { status: 501 }
      )
    }

    const stripe = getStripeServer()
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not available' },
        { status: 501 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = checkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const appUrl = getAppUrl()

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      stripe,
      user.id,
      user.email!,
      profile.stripe_customer_id
    )

    // Update profile with customer ID if new
    if (!profile.stripe_customer_id) {
      if (hasServiceRole()) {
        const serviceClient = createServiceClient()
        await serviceClient
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      }
    }

    let session

    if (validation.data.type === 'pro') {
      // Create Pro subscription checkout
      const proPriceId = getProPriceId()
      if (!proPriceId) {
        return NextResponse.json(
          { error: 'Pro subscription not configured' },
          { status: 501 }
        )
      }

      session = await createProCheckoutSession(
        stripe,
        customerId,
        `${appUrl}/app/billing?success=true`,
        `${appUrl}/app/billing?canceled=true`
      )
    } else if (validation.data.type === 'support_pack') {
      // Create Support Pack one-time checkout
      if (!validation.data.pack_id) {
        return NextResponse.json(
          { error: 'pack_id is required for support pack purchase' },
          { status: 400 }
        )
      }

      // Get pack details
      const { data: pack, error: packError } = await supabase
        .from('support_packs')
        .select('*')
        .eq('id', validation.data.pack_id)
        .eq('active', true)
        .single()

      if (packError || !pack) {
        return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
      }

      if (!pack.price_stripe_price_id) {
        return NextResponse.json(
          { error: 'Pack price not configured' },
          { status: 501 }
        )
      }

      session = await createPackCheckoutSession(
        stripe,
        customerId,
        pack.price_stripe_price_id,
        pack.id,
        `${appUrl}/app/billing?success=true&pack=${pack.id}`,
        `${appUrl}/app/billing?canceled=true`
      )
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
