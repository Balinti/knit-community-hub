import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { isAdminEmail, isAdminConfigured } from '@/lib/admin'
import { createPackItemSchema } from '@/lib/validators'

// POST /api/admin/packs/items - Add item to support pack (admin only)
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
    const validation = createPackItemSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const serviceClient = createServiceClient()

    // Verify pack exists
    const { data: pack, error: packError } = await serviceClient
      .from('support_packs')
      .select('id')
      .eq('id', validation.data.pack_id)
      .single()

    if (packError || !pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 })
    }

    const { data: item, error } = await serviceClient
      .from('support_pack_items')
      .insert({
        pack_id: validation.data.pack_id,
        kind: validation.data.kind,
        title: validation.data.title,
        body: validation.data.body,
        url: validation.data.url,
        page_number: validation.data.page_number,
        bbox: validation.data.bbox,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Error creating pack item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
