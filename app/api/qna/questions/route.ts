import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceClient, hasServiceRole } from '@/lib/supabase/service'
import { createQuestionSchema } from '@/lib/validators'
import { canAskQuestion } from '@/lib/limits'

// POST /api/qna/questions - Create a new question
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createQuestionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check limits using service role if available
    if (hasServiceRole()) {
      const serviceClient = createServiceClient()
      const canAsk = await canAskQuestion(serviceClient, user.id)

      if (!canAsk.allowed) {
        return NextResponse.json(
          { error: canAsk.reason, code: 'LIMIT_EXCEEDED' },
          { status: 403 }
        )
      }
    }

    // Verify project ownership if project_id provided
    if (validation.data.project_id) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', validation.data.project_id)
        .eq('user_id', user.id)
        .single()

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const { data: question, error } = await supabase
      .from('qna_questions')
      .insert({
        user_id: user.id,
        project_id: validation.data.project_id,
        pattern_hash: validation.data.pattern_hash,
        note_id: validation.data.note_id,
        page_number: validation.data.page_number,
        bbox: validation.data.bbox,
        title: validation.data.title,
        body: validation.data.body,
        visibility: validation.data.visibility,
      })
      .select(`
        *,
        profiles:user_id (display_name),
        qna_answers (
          *,
          profiles:user_id (display_name)
        ),
        qna_accepts (*)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment usage counter
    if (hasServiceRole()) {
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const serviceClient = createServiceClient()

        // Upsert usage counter - increment questions_asked
        const { data: existing } = await serviceClient
          .from('usage_counters')
          .select('questions_asked')
          .eq('user_id', user.id)
          .eq('month', monthStart)
          .single()

        if (existing) {
          await serviceClient
            .from('usage_counters')
            .update({ questions_asked: existing.questions_asked + 1 })
            .eq('user_id', user.id)
            .eq('month', monthStart)
        } else {
          await serviceClient
            .from('usage_counters')
            .insert({
              user_id: user.id,
              month: monthStart,
              questions_asked: 1,
            })
        }
      } catch (e) {
        console.error('Error incrementing usage counter:', e)
      }
    }

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    console.error('Error creating question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
