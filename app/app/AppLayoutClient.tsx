"use client"

import { useEffect } from 'react'
import { getGuestSession, createGuestSession } from '@/lib/guest-session'

interface AppLayoutClientProps {
  children: React.ReactNode
  isAuthenticated: boolean
}

export function AppLayoutClient({ children, isAuthenticated }: AppLayoutClientProps) {
  // Initialize guest session for unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      const session = getGuestSession()
      if (!session) {
        createGuestSession()
      }
    }
  }, [isAuthenticated])

  return <>{children}</>
}
