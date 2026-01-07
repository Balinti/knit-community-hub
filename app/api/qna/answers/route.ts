import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAnswerSchema } from '@/lib/validators'

// POST /api/qna/answers - Create a new answer
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = createAnswerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Verify question exists and user can answer it
    // User can answer if:
    // 1. They own the question
    // 2. Question is shared and they have a pattern with same hash
    const { data: question, error: questionError } = await supabase
      .from('qna_questions')
      .select('id, user_id, visibility, pattern_hash')
      .eq('id', validation.data.question_id)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Check if user can answer
    let canAnswer = question.user_id === user.id

    if (!canAnswer && question.visibility === 'shared' && question.pattern_hash) {
      // Check if user has a pattern with the same hash
      const { data: pattern } = await supabase
        .from('patterns')
        .select('id')
        .eq('user_id', user.id)
        .eq('pattern_hash', question.pattern_hash)
        .limit(1)
        .single()

      canAnswer = !!pattern
    }

    if (!canAnswer) {
      return NextResponse.json(
        { error: 'You cannot answer this question' },
        { status: 403 }
      )
    }

    const { data: answer, error } = await supabase
      .from('qna_answers')
      .insert({
        question_id: validation.data.question_id,
        user_id: user.id,
        body: validation.data.body,
      })
      .select(`
        *,
        profiles:user_id (display_name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ answer }, { status: 201 })
  } catch (error) {
    console.error('Error creating answer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
