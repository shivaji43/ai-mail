import { useState, useCallback } from 'react'
import {
  EmailSelectionState,
  EmailContent,
  UseEmailContentReturn,
  EmailsAction
} from '@/types/types'

const initialEmailSelection: EmailSelectionState = {
  selectedEmailId: null,
  selectedEmailContent: null,
  isLoading: false,
  error: null
}

export function useEmailContent(dispatchEmails?: React.Dispatch<EmailsAction>): UseEmailContentReturn {
  const [emailSelection, setEmailSelection] = useState<EmailSelectionState>(initialEmailSelection)
  const [emailCache, setEmailCache] = useState<Map<string, EmailContent>>(new Map())

  const markEmailAsRead = useCallback(async (emailId: string): Promise<void> => {
    try {
      await fetch(`/api/emails/${emailId}/mark-read`, {
        method: 'POST',
      })
      
      if (dispatchEmails) {
        dispatchEmails({
          type: 'MARK_EMAIL_AS_READ',
          emailId
        })
      }
    } catch (error) {
      console.error('Failed to mark email as read:', error)
    }
  }, [dispatchEmails])

  const updateEmailStarStatus = useCallback((emailId: string, starred: boolean): void => {
    // Update selection panel if this email is currently selected
    setEmailSelection(prev => {
      if (prev.selectedEmailId === emailId && prev.selectedEmailContent) {
        const updatedLabelIds = starred
          ? Array.from(new Set([...(prev.selectedEmailContent.labelIds || []), 'STARRED']))
          : (prev.selectedEmailContent.labelIds || []).filter(l => l !== 'STARRED')

        return {
          ...prev,
          selectedEmailContent: {
            ...prev.selectedEmailContent,
            isStarred: starred,
            labelIds: updatedLabelIds
          }
        }
      }
      return prev
    })

    // Update cache entry if present
    setEmailCache(prev => {
      const cached = prev.get(emailId)
      if (!cached) return prev
      const updatedLabelIds = starred
        ? Array.from(new Set([...(cached.labelIds || []), 'STARRED']))
        : (cached.labelIds || []).filter(l => l !== 'STARRED')
      const next = new Map(prev)
      next.set(emailId, { ...cached, isStarred: starred, labelIds: updatedLabelIds })
      return next
    })
  }, [])

  const fetchEmailContent = useCallback(async (emailId: string): Promise<void> => {
    if (emailCache.has(emailId)) {
      const cachedContent = emailCache.get(emailId)!
      setEmailSelection({
        selectedEmailId: emailId,
        selectedEmailContent: cachedContent,
        isLoading: false,
        error: null,
      })
      await markEmailAsRead(emailId)
      return
    }

    setEmailSelection(prev => ({
      ...prev,
      selectedEmailId: emailId,
      isLoading: true,
      error: null,
    }))

    try {
      const response = await fetch(`/api/emails/${emailId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch email content`)
      }

      const emailContent: EmailContent = await response.json()
      
      if (!emailContent || !emailContent.id) {
        throw new Error('Invalid email content received')
      }
      
      setEmailCache(prev => new Map(prev).set(emailId, emailContent))
      
      setEmailSelection({
        selectedEmailId: emailId,
        selectedEmailContent: emailContent,
        isLoading: false,
        error: null,
      })

      await markEmailAsRead(emailId)
    } catch (err) {
      setEmailSelection(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }))
    }
  }, [emailCache, markEmailAsRead])

  const clearSelection = useCallback((): void => {
    setEmailSelection(initialEmailSelection)
  }, [])

  return {
    emailSelection,
    emailCache,
    fetchEmailContent,
    markEmailAsRead,
    updateEmailStarStatus,
    clearSelection
  }
} 