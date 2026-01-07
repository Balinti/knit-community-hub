import { NextResponse } from 'next/server'
import { isStripeConfigured, getProPriceId } from '@/lib/stripe'

// GET /api/stripe/config - Check Stripe configuration (public info only)
export async function GET() {
  return NextResponse.json({
    configured: isStripeConfigured(),
    proUpgradeAvailable: isStripeConfigured() && !!getProPriceId(),
  })
}
