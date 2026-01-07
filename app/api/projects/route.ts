import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { createProjectSchema } from '@/lib/validators'
import { canCreateProject } from '@/lib/limits'

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        *,
        patterns (id, source_type, original_filename, link_url, pattern_hash, last_page, last_zoom)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createProjectSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check limits using service role if available
    if (hasServiceRole()) {
      const serviceClient = createServiceClient()
      const canCreate = await canCreateProject(serviceClient, user.id)

      if (!canCreate.allowed) {
        return NextResponse.json(
          { error: canCreate.reason, code: 'LIMIT_EXCEEDED' },
          { status: 403 }
        )
      }
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: validation.data.name,
        craft_type: validation.data.craft_type,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create main counter for the project
    await supabase
      .from('counters')
      .insert({
        project_id: project.id,
        user_id: user.id,
        name: null, // Main counter has no name
        current_value: 0,
      })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
