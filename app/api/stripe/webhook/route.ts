import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripeServer } from '@/lib/stripe'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'

// Webhook handler - signature verification skipped (handled by n8n router)
export async function POST(request: NextRequest) {
  const stripe = getStripeServer()

  if (!stripe) {
    console.warn('Stripe not configured')
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 501 }
    )
  }

  if (!hasServiceRole()) {
    console.warn('Service role not configured for webhook processing')
    return NextResponse.json(
      { error: 'Service role not configured' },
      { status: 501 }
    )
  }

  let event: Stripe.Event

  try {
    // Parse event directly (signature verification handled by n8n router)
    const body = await request.json()
    event = body as Stripe.Event

    // Verify this event is for our app by checking metadata
    const eventObject = event.data.object as any
    if (eventObject.metadata?.app_name && eventObject.metadata.app_name !== 'knit-community-hub') {
      console.log('Event not for this app, skipping:', eventObject.metadata.app_name)
      return NextResponse.json({ received: true, skipped: true })
    }
  } catch (err: any) {
    console.error('Failed to parse webhook body:', err.message)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Only process if it's for our app
        if (session.metadata?.app_name === 'knit-community-hub') {
          await handleCheckoutCompleted(supabase, stripe, session)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await handleSubscriptionRenewal(supabase, invoice)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment failed for invoice:', invoice.id)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const customerId = session.customer as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No profile found for customer:', customerId)
    return
  }

  // Handle support pack purchase
  if (session.mode === 'payment' && session.metadata?.type === 'support_pack') {
    const packId = session.metadata.pack_id
    if (packId) {
      await supabase.from('entitlements').insert({
        user_id: profile.id,
        kind: 'support_pack',
        ref_id: packId,
        status: 'active',
        source: 'stripe',
      })
    }
  }

  // Pro subscription is handled by subscription events
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) {
    console.error('No profile found for customer:', customerId)
    return
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing'

  const { data: existingEntitlement } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', profile.id)
    .eq('kind', 'pro')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (existingEntitlement) {
    await supabase
      .from('entitlements')
      .update({
        status: isActive ? 'active' : 'inactive',
        ends_at: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq('id', existingEntitlement.id)
  } else if (isActive) {
    await supabase.from('entitlements').insert({
      user_id: profile.id,
      kind: 'pro',
      status: 'active',
      source: 'stripe',
      stripe_subscription_id: subscription.id,
      starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
      ends_at: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
    })
  }

  await supabase
    .from('profiles')
    .update({ plan: isActive ? 'pro' : 'free' })
    .eq('id', profile.id)
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  await supabase
    .from('entitlements')
    .update({ status: 'inactive' })
    .eq('user_id', profile.id)
    .eq('kind', 'pro')
    .eq('stripe_subscription_id', subscription.id)

  await supabase
    .from('profiles')
    .update({ plan: 'free' })
    .eq('id', profile.id)
}

async function handleSubscriptionRenewal(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!profile) return

  await supabase
    .from('entitlements')
    .update({ status: 'active' })
    .eq('user_id', profile.id)
    .eq('kind', 'pro')
    .eq('stripe_subscription_id', subscriptionId)

  await supabase
    .from('profiles')
    .update({ plan: 'pro' })
    .eq('id', profile.id)
}
