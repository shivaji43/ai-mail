import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { GmailWatchSetupResponse } from '@/types/types'

interface UseGmailNotificationsReturn {
  isWatchActive: boolean
  isSettingUp: boolean
  watchExpiration: string | null
  setupWatch: (topicName: string) => Promise<boolean>
  stopWatch: () => Promise<boolean>
  error: string | null
}

export function useGmailNotifications(): UseGmailNotificationsReturn {
  const { data: session } = useSession()
  const [isWatchActive, setIsWatchActive] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [watchExpiration, setWatchExpiration] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedAttempt, setLastFailedAttempt] = useState<number | null>(null)

  const setupWatch = useCallback(async (topicName: string): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('Not authenticated')
      return false
    }

    // Prevent repeated attempts if we recently failed (wait 5 minutes)
    if (lastFailedAttempt && Date.now() - lastFailedAttempt < 5 * 60 * 1000) {
      return false
    }

    setIsSettingUp(true)
    setError(null)

    try {
      
      const response = await fetch('/api/gmail-watch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicName,
          labelIds: ['INBOX'], // Watch inbox changes
          labelFilterBehavior: 'INCLUDE'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup Gmail watch')
      }

      const watchData = data as GmailWatchSetupResponse
      
      setIsWatchActive(true)
      setWatchExpiration(watchData.expirationDate)
      

      // Store watch info in localStorage for persistence
      localStorage.setItem('gmail_watch', JSON.stringify({
        active: true,
        expiration: watchData.expirationDate,
        historyId: watchData.historyId,
        topicName: watchData.topicName
      }))

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setLastFailedAttempt(Date.now())
      console.error('Gmail watch setup failed:', errorMessage)
      return false
    } finally {
      setIsSettingUp(false)
    }
  }, [session, lastFailedAttempt])

  const stopWatch = useCallback(async (): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('Not authenticated')
      return false
    }

    try {
      
      const response = await fetch('/api/gmail-watch', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop Gmail watch')
      }

      setIsWatchActive(false)
      setWatchExpiration(null)
      

      // Remove from localStorage
      localStorage.removeItem('gmail_watch')

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Gmail watch stop failed:', errorMessage)
      return false
    }
  }, [session])

  // Check for existing watch on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedWatch = localStorage.getItem('gmail_watch')
      if (storedWatch) {
        const watchData = JSON.parse(storedWatch)
        const expiration = new Date(watchData.expiration)
        const now = new Date()

        // Check if watch is still valid (not expired)
        if (expiration > now && watchData.active) {
          setIsWatchActive(true)
          setWatchExpiration(watchData.expiration)
        } else {
          // Clean up expired watch
          localStorage.removeItem('gmail_watch')
        }
      }
    } catch (err) {
      console.error('Error checking stored Gmail watch:', err)
      localStorage.removeItem('gmail_watch')
    }
  }, [])

  // Auto-renew watch before expiration (every 6 days, as Gmail watch expires in 7 days)
  useEffect(() => {
    if (!isWatchActive || !watchExpiration) return

    const expirationDate = new Date(watchExpiration)
    const now = new Date()
    const sixDaysFromNow = new Date(now.getTime() + (6 * 24 * 60 * 60 * 1000))

    // If expiring within 24 hours, try to renew
    if (expirationDate < sixDaysFromNow) {
      const storedWatch = localStorage.getItem('gmail_watch')
      if (storedWatch) {
        const watchData = JSON.parse(storedWatch)
        setupWatch(watchData.topicName)
      }
    }
  }, [isWatchActive, watchExpiration, setupWatch])

  return {
    isWatchActive,
    isSettingUp,
    watchExpiration,
    setupWatch,
    stopWatch,
    error
  }
} 