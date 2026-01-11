"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getGuestSession,
  createGuestSession,
  getMinutesEngaged,
  shouldShowRegistrationPrompt,
  markPromptSeen,
  getEngagementLimitMinutes,
  GuestSession
} from '@/lib/guest-session'

interface GuestContextType {
  isGuest: boolean
  session: GuestSession | null
  minutesEngaged: number
  showPrompt: boolean
  dismissPrompt: () => void
  engagementLimit: number
}

const GuestContext = createContext<GuestContextType>({
  isGuest: false,
  session: null,
  minutesEngaged: 0,
  showPrompt: false,
  dismissPrompt: () => {},
  engagementLimit: getEngagementLimitMinutes()
})

export function useGuest() {
  return useContext(GuestContext)
}

interface GuestProviderProps {
  children: React.ReactNode
  isAuthenticated: boolean
}

export function GuestProvider({ children, isAuthenticated }: GuestProviderProps) {
  const [session, setSession] = useState<GuestSession | null>(null)
  const [minutesEngaged, setMinutesEngaged] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)

  const isGuest = !isAuthenticated

  // Initialize or get guest session
  useEffect(() => {
    if (isGuest) {
      let existingSession = getGuestSession()
      if (!existingSession) {
        existingSession = createGuestSession()
      }
      setSession(existingSession)
    }
  }, [isGuest])

  // Check engagement time periodically
  useEffect(() => {
    if (!isGuest || !session) return

    const checkEngagement = () => {
      const minutes = getMinutesEngaged()
      setMinutesEngaged(minutes)

      if (shouldShowRegistrationPrompt()) {
        setShowPrompt(true)
      }
    }

    // Check immediately
    checkEngagement()

    // Check every 30 seconds
    const interval = setInterval(checkEngagement, 30000)

    return () => clearInterval(interval)
  }, [isGuest, session])

  const dismissPrompt = useCallback(() => {
    markPromptSeen()
    setShowPrompt(false)
  }, [])

  return (
    <GuestContext.Provider
      value={{
        isGuest,
        session,
        minutesEngaged,
        showPrompt,
        dismissPrompt,
        engagementLimit: getEngagementLimitMinutes()
      }}
    >
      {children}
    </GuestContext.Provider>
  )
}
