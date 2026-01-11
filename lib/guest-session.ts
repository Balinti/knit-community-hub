// Guest session utilities for allowing users to try the app before registering

const GUEST_SESSION_KEY = 'knitflow_guest_session'
const GUEST_PROJECTS_KEY = 'knitflow_guest_projects'
const ENGAGEMENT_LIMIT_MINUTES = 3 // Minutes before prompting registration

export interface GuestSession {
  startedAt: number // timestamp
  hasSeenPrompt: boolean
  projectCount: number
}

export interface GuestProject {
  id: string
  name: string
  craft_type: string
  status: string
  created_at: string
  updated_at: string
  notes: GuestNote[]
  counters: GuestCounter[]
}

export interface GuestNote {
  id: string
  content: string
  page_number?: number
  created_at: string
}

export interface GuestCounter {
  id: string
  name: string
  current_value: number
  target_value?: number
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === 'undefined') return null

  const stored = localStorage.getItem(GUEST_SESSION_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored) as GuestSession
  } catch {
    return null
  }
}

export function createGuestSession(): GuestSession {
  const session: GuestSession = {
    startedAt: Date.now(),
    hasSeenPrompt: false,
    projectCount: 0
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session))
  }

  return session
}

export function updateGuestSession(updates: Partial<GuestSession>): GuestSession | null {
  const current = getGuestSession()
  if (!current) return null

  const updated = { ...current, ...updates }

  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated))
  }

  return updated
}

export function getMinutesEngaged(): number {
  const session = getGuestSession()
  if (!session) return 0

  return Math.floor((Date.now() - session.startedAt) / 1000 / 60)
}

export function shouldShowRegistrationPrompt(): boolean {
  const session = getGuestSession()
  if (!session) return false
  if (session.hasSeenPrompt) return false

  return getMinutesEngaged() >= ENGAGEMENT_LIMIT_MINUTES
}

export function markPromptSeen(): void {
  updateGuestSession({ hasSeenPrompt: true })
}

export function getEngagementLimitMinutes(): number {
  return ENGAGEMENT_LIMIT_MINUTES
}

// Guest project storage
export function getGuestProjects(): GuestProject[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem(GUEST_PROJECTS_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored) as GuestProject[]
  } catch {
    return []
  }
}

export function saveGuestProject(project: GuestProject): void {
  const projects = getGuestProjects()
  const existingIndex = projects.findIndex(p => p.id === project.id)

  if (existingIndex >= 0) {
    projects[existingIndex] = project
  } else {
    projects.push(project)
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects))
  }

  // Update session project count
  updateGuestSession({ projectCount: projects.length })
}

export function deleteGuestProject(projectId: string): void {
  const projects = getGuestProjects().filter(p => p.id !== projectId)

  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects))
  }

  updateGuestSession({ projectCount: projects.length })
}

export function clearGuestData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GUEST_SESSION_KEY)
    localStorage.removeItem(GUEST_PROJECTS_KEY)
  }
}

export function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
