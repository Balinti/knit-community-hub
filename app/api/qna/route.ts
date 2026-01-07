import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET /api/qna - List Q&A for a project or pattern hash
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')
    const patternHash = searchParams.get('pattern_hash')
    const search = searchParams.get('search')
    const includeShared = searchParams.get('include_shared') === 'true'

    let query = supabase
      .from('qna_questions')
      .select(`
        *,
        profiles:user_id (display_name),
        qna_answers (
          *,
          profiles:user_id (display_name)
        ),
        qna_accepts (*)
      `)
      .order('created_at', { ascending: false })

    // If searching by project, get user's own questions
    if (projectId) {
      if (includeShared && patternHash) {
        // Get own questions for this project OR shared questions with same pattern hash
        query = query.or(
          `and(project_id.eq.${projectId},user_id.eq.${user.id}),and(visibility.eq.shared,pattern_hash.eq.${patternHash})`
        )
      } else {
        query = query.eq('project_id', projectId).eq('user_id', user.id)
      }
    } else if (patternHash && includeShared) {
      // Get shared questions for a pattern hash (for Q&A discovery)
      query = query.eq('pattern_hash', patternHash).eq('visibility', 'shared')
    } else {
      // Default: get all user's questions
      query = query.eq('user_id', user.id)
    }

    // Full-text search
    if (search) {
      query = query.textSearch('search_vector', search)
    }

    const { data: questions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching Q&A:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
