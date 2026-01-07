import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { isAdminEmail, isAdminConfigured } from '@/lib/admin'
import { createSupportPackSchema } from '@/lib/validators'

// GET /api/admin/packs - List all support packs (admin only)
export async function GET() {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: 'Admin not configured' },
        { status: 501 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!hasServiceRole()) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 501 }
      )
    }

    const serviceClient = createServiceClient()
    const { data: packs, error } = await serviceClient
      .from('support_packs')
      .select(`
        *,
        support_pack_items (count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ packs })
  } catch (error) {
    console.error('Error fetching packs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/packs - Create a new support pack (admin only)
export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { error: 'Admin not configured' },
        { status: 501 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!hasServiceRole()) {
      return NextResponse.json(
        { error: 'Service role not configured' },
        { status: 501 }
      )
    }

    const body = await request.json()
    const validation = createSupportPackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient()
    const { data: pack, error } = await serviceClient
      .from('support_packs')
      .insert({
        name: validation.data.name,
        description: validation.data.description,
        pattern_hash: validation.data.pattern_hash,
        price_stripe_product_id: validation.data.price_stripe_product_id,
        price_stripe_price_id: validation.data.price_stripe_price_id,
        active: validation.data.active,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A pack with this pattern hash already exists' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pack }, { status: 201 })
  } catch (error) {
    console.error('Error creating pack:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
