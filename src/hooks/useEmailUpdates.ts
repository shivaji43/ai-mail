'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { EmailUpdateEvent } from '@/types/types'

interface UseEmailUpdatesProps {
  onEmailUpdate: (historyId?: string, messageId?: string) => void
  enabled?: boolean
}

export function useEmailUpdates({ onEmailUpdate, enabled = true }: UseEmailUpdatesProps) {
  const { data: session } = useSession()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!session?.user?.email || !enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') return

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }


    const eventSource = new EventSource('/api/email-updates')
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      reconnectAttempts.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data: EmailUpdateEvent = JSON.parse(event.data)
        
        if (data.type === 'connected') {
        } else if (data.type === 'email_update') {
          onEmailUpdate(data.historyId, data.messageId)
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Email updates stream error:', error)
      eventSource.close()

      // Implement exponential backoff for reconnection
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current++
          connect()
        }, delay)
      } else {
      }
    }
  }, [session, enabled, onEmailUpdate])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    if (enabled && session?.user?.email) {
      connect()
    } else {
      disconnect()
    }

    return disconnect
  }, [session, enabled, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected: typeof window !== 'undefined' && 
                 typeof EventSource !== 'undefined' && 
                 eventSourceRef.current?.readyState === EventSource.OPEN,
    reconnectAttempts: reconnectAttempts.current
  }
} 