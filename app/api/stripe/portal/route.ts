import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getStripeServer, isStripeConfigured, createBillingPortalSession } from '@/lib/stripe'
import { getAppUrl } from '@/lib/utils'

// POST /api/stripe/portal - Create billing portal session
export async function POST(request: NextRequest) {
  try {
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

    // Get user profile with Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing information found' },
        { status: 404 }
      )
    }

    const appUrl = getAppUrl()
    const session = await createBillingPortalSession(
      stripe,
      profile.stripe_customer_id,
      `${appUrl}/app/billing`
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
