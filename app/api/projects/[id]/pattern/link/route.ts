import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { patternLinkSchema } from '@/lib/validators'

// POST /api/projects/[id]/pattern/link - Save pattern link
export async function POST(
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

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = patternLinkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check if there's an existing pattern for this project
    const { data: existingPattern } = await supabase
      .from('patterns')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (existingPattern) {
      // Update existing pattern record
      const { data: pattern, error: updateError } = await supabase
        .from('patterns')
        .update({
          source_type: 'link',
          storage_path: null,
          original_filename: null,
          link_url: validation.data.link_url,
          pattern_hash: null, // Links don't have a hash
        })
        .eq('id', existingPattern.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ pattern })
    }

    // Create new pattern record
    const { data: pattern, error: patternError } = await supabase
      .from('patterns')
      .insert({
        project_id: projectId,
        user_id: user.id,
        source_type: 'link',
        link_url: validation.data.link_url,
      })
      .select()
      .single()

    if (patternError) {
      return NextResponse.json({ error: patternError.message }, { status: 500 })
    }

    return NextResponse.json({ pattern }, { status: 201 })
  } catch (error) {
    console.error('Error saving pattern link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
