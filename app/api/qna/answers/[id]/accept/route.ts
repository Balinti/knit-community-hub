import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST /api/qna/answers/[id]/accept - Accept an answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: answerId } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the answer and its question
    const { data: answer, error: answerError } = await supabase
      .from('qna_answers')
      .select('id, question_id')
      .eq('id', answerId)
      .single()

    if (answerError || !answer) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 })
    }

    // Verify user owns the question
    const { data: question, error: questionError } = await supabase
      .from('qna_questions')
      .select('id, user_id')
      .eq('id', answer.question_id)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    if (question.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the question owner can accept an answer' },
        { status: 403 }
      )
    }

    // Check if there's already an accepted answer
    const { data: existingAccept } = await supabase
      .from('qna_accepts')
      .select('question_id')
      .eq('question_id', question.id)
      .single()

    if (existingAccept) {
      return NextResponse.json(
        { error: 'An answer has already been accepted for this question' },
        { status: 400 }
      )
    }

    // Accept the answer
    const { data: accept, error } = await supabase
      .from('qna_accepts')
      .insert({
        question_id: question.id,
        accepted_answer_id: answerId,
        accepted_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accept }, { status: 201 })
  } catch (error) {
    console.error('Error accepting answer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
