import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// PATCH /api/projects/[id]/pattern - Update pattern (last page, zoom)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { last_page, last_zoom } = body

    // Get pattern for this project
    const { data: existingPattern, error: fetchError } = await supabase
      .from('patterns')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingPattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
    }

    const updateData: { last_page?: number; last_zoom?: number } = {}
    if (typeof last_page === 'number') updateData.last_page = last_page
    if (typeof last_zoom === 'number') updateData.last_zoom = last_zoom

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: pattern, error: updateError } = await supabase
      .from('patterns')
      .update(updateData)
      .eq('id', existingPattern.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('Error updating pattern:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/projects/[id]/pattern - Get pattern with signed URL
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: pattern, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Pattern not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate signed URL for PDF if it's stored in storage
    if (pattern.source_type === 'pdf' && pattern.storage_path) {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('patterns')
        .createSignedUrl(pattern.storage_path, 3600) // 1 hour expiry

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError)
        return NextResponse.json({ error: 'Failed to generate PDF URL' }, { status: 500 })
      }

      return NextResponse.json({
        pattern: {
          ...pattern,
          signed_url: signedUrlData.signedUrl,
        },
      })
    }

    return NextResponse.json({ pattern })
  } catch (error) {
    console.error('Error fetching pattern:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
