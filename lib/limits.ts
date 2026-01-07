import { SupabaseClient } from '@supabase/supabase-js'

// Free tier limits
export const FREE_LIMITS = {
  maxProjects: 3,
  maxNotes: 30,
  maxPhotosPerProject: 1,
  maxQuestionsPerMonth: 3,
}

// Pro tier has unlimited (use large numbers for comparison)
export const PRO_LIMITS = {
  maxProjects: Infinity,
  maxNotes: Infinity,
  maxPhotosPerProject: Infinity,
  maxQuestionsPerMonth: Infinity,
}

export type PlanType = 'free' | 'pro'

export interface UserLimits {
  plan: PlanType
  limits: typeof FREE_LIMITS
  usage: {
    projects: number
    notes: number
    photosInProject: number
    questionsThisMonth: number
  }
}

// Check if user is pro based on entitlements
export async function isPro(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'pro')
    .eq('status', 'active')
    .or('ends_at.is.null,ends_at.gt.now()')
    .limit(1)
    .single()

  return !!data
}

// Get user's current usage and limits
export async function getUserLimits(
  supabase: SupabaseClient,
  userId: string,
  projectId?: string
): Promise<UserLimits> {
  const plan = await isPro(supabase, userId) ? 'pro' : 'free'
  const limits = plan === 'pro' ? PRO_LIMITS : FREE_LIMITS

  // Count projects
  const { count: projectsCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Count notes
  const { count: notesCount } = await supabase
    .from('notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  // Count photos in specific project if provided
  let photosInProject = 0
  if (projectId) {
    const { count: photosCount } = await supabase
      .from('note_photos')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('user_id', userId)
    photosInProject = photosCount || 0
  }

  // Count questions this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const { data: usageData } = await supabase
    .from('usage_counters')
    .select('questions_asked')
    .eq('user_id', userId)
    .eq('month', monthStart)
    .single()

  return {
    plan,
    limits,
    usage: {
      projects: projectsCount || 0,
      notes: notesCount || 0,
      photosInProject,
      questionsThisMonth: usageData?.questions_asked || 0,
    },
  }
}

// Check if user can create a new project
export async function canCreateProject(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, limits, usage } = await getUserLimits(supabase, userId)

  if (usage.projects >= limits.maxProjects) {
    return {
      allowed: false,
      reason: plan === 'free'
        ? `Free plan allows up to ${FREE_LIMITS.maxProjects} projects. Upgrade to Pro for unlimited projects.`
        : 'Project limit reached.',
    }
  }

  return { allowed: true }
}

// Check if user can create a new note
export async function canCreateNote(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, limits, usage } = await getUserLimits(supabase, userId)

  if (usage.notes >= limits.maxNotes) {
    return {
      allowed: false,
      reason: plan === 'free'
        ? `Free plan allows up to ${FREE_LIMITS.maxNotes} notes. Upgrade to Pro for unlimited notes.`
        : 'Note limit reached.',
    }
  }

  return { allowed: true }
}

// Check if user can add a photo to a note in this project
export async function canAddPhoto(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, limits, usage } = await getUserLimits(supabase, userId, projectId)

  if (usage.photosInProject >= limits.maxPhotosPerProject) {
    return {
      allowed: false,
      reason: plan === 'free'
        ? `Free plan allows up to ${FREE_LIMITS.maxPhotosPerProject} photo per project. Upgrade to Pro for unlimited photos.`
        : 'Photo limit reached.',
    }
  }

  return { allowed: true }
}

// Check if user can ask a question this month
export async function canAskQuestion(
  supabase: SupabaseClient,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { plan, limits, usage } = await getUserLimits(supabase, userId)

  if (usage.questionsThisMonth >= limits.maxQuestionsPerMonth) {
    return {
      allowed: false,
      reason: plan === 'free'
        ? `Free plan allows up to ${FREE_LIMITS.maxQuestionsPerMonth} questions per month. Upgrade to Pro for unlimited questions.`
        : 'Monthly question limit reached.',
    }
  }

  return { allowed: true }
}

// Increment question count for this month
export async function incrementQuestionCount(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Upsert the usage counter
  await supabase
    .from('usage_counters')
    .upsert(
      {
        user_id: userId,
        month: monthStart,
        questions_asked: 1,
      },
      {
        onConflict: 'user_id,month',
        ignoreDuplicates: false,
      }
    )

  // If record exists, increment
  await supabase.rpc('increment_questions', {
    p_user_id: userId,
    p_month: monthStart,
  }).catch(() => {
    // Fallback: just update directly
    supabase
      .from('usage_counters')
      .update({ questions_asked: supabase.rpc('', {}) })
  })
}
