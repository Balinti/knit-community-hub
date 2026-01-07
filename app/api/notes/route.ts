import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { createNoteSchema } from '@/lib/validators'
import { canCreateNote } from '@/lib/limits'

// GET /api/notes - List notes for a project
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const pageNumber = searchParams.get('page_number')
    const search = searchParams.get('search')

    let query = supabase
      .from('notes')
      .select(`
        *,
        note_photos (id, storage_path)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (pageNumber) {
      query = query.eq('page_number', parseInt(pageNumber, 10))
    }

    if (search) {
      query = query.textSearch('text_search', search)
    }

    const { data: notes, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createNoteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check limits using service role if available
    if (hasServiceRole()) {
      const serviceClient = createServiceClient()
      const canCreate = await canCreateNote(serviceClient, user.id)

      if (!canCreate.allowed) {
        return NextResponse.json(
          { error: canCreate.reason, code: 'LIMIT_EXCEEDED' },
          { status: 403 }
        )
      }
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', validation.data.project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        project_id: validation.data.project_id,
        pattern_id: validation.data.pattern_id,
        user_id: user.id,
        page_number: validation.data.page_number,
        bbox: validation.data.bbox,
        color: validation.data.color || '#fef08a',
        text: validation.data.text,
      })
      .select(`
        *,
        note_photos (id, storage_path)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
