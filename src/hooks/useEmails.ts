import { useReducer, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
  EmailsState,
  LoadingState,
  PageTokensState,
  EmailsAction,
  LoadingAction,
  PageTokensAction,
  EmailCategory,
  EmailsResponse,
  UseEmailsReturn
} from '@/types/types'
import { getCachedEmailList, cacheEmailList, clearEmailCacheForCategory } from '@/lib/cache'
const initialEmailsState: EmailsState = {
  inbox: [],
  starred: [],
  spam: [],
  trash: []
}

const initialLoadingState: LoadingState = {
  inbox: false,
  starred: false,
  spam: false,
  trash: false
}

const initialPageTokensState: PageTokensState = {
  inbox: null,
  starred: null,
  spam: null,
  trash: null
}

// Reducers
function emailsReducer(state: EmailsState, action: EmailsAction): EmailsState {
  switch (action.type) {
    case 'SET_EMAILS':
      return {
        ...state,
        [action.category]: action.emails
      }
    
    case 'APPEND_EMAILS':
      return {
        ...state,
        [action.category]: [...state[action.category], ...action.emails]
      }
    
    case 'PREPEND_EMAIL':
      // Check if email already exists to avoid duplicates
      const existingEmails = state[action.category]
      const emailExists = existingEmails.some(email => email.id === action.email.id)
      
      if (emailExists) {
        return state // Don't add duplicate
      }
      
      return {
        ...state,
        [action.category]: [action.email, ...existingEmails]
      }
    
    case 'UPDATE_EMAIL':
      return {
        ...state,
        [action.category]: state[action.category].map(email =>
          email.id === action.emailId ? { ...email, ...action.updates } : email
        )
      }
    
    case 'UPDATE_EMAIL_ALL_CATEGORIES':
      const updatedState: EmailsState = { ...state }
      Object.keys(updatedState).forEach(category => {
        const categoryKey = category as EmailCategory
        updatedState[categoryKey] = updatedState[categoryKey].map(email =>
          email.id === action.emailId ? { ...email, ...action.updates } : email
        )
      })
      return updatedState
    
    case 'MARK_EMAIL_AS_READ':
      const readUpdatedState: EmailsState = { ...state }
      Object.keys(readUpdatedState).forEach(category => {
        const categoryKey = category as EmailCategory
        readUpdatedState[categoryKey] = readUpdatedState[categoryKey].map(email =>
          email.id === action.emailId 
            ? { 
                ...email, 
                isUnread: false,
                labelIds: email.labelIds.filter(id => id !== 'UNREAD')
              } 
            : email
        )
      })
      return readUpdatedState
    
    case 'REMOVE_EMAIL':
      return {
        ...state,
        [action.category]: state[action.category].filter(email => email.id !== action.emailId)
      }
    
    case 'CLEAR_CATEGORY':
      return {
        ...state,
        [action.category]: []
      }
    
    default:
      return state
  }
}

function loadingReducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        [action.category]: action.loading
      }
    
    case 'SET_ALL_LOADING':
      return action.loading
    
    default:
      return state
  }
}

function pageTokensReducer(state: PageTokensState, action: PageTokensAction): PageTokensState {
  switch (action.type) {
    case 'SET_TOKEN':
      return {
        ...state,
        [action.category]: action.token
      }
    
    case 'CLEAR_TOKEN':
      return {
        ...state,
        [action.category]: null
      }
    
    case 'CLEAR_ALL_TOKENS':
      return initialPageTokensState
    
    default:
      return state
  }
}


export function useEmails(): UseEmailsReturn {
  const { data: session } = useSession()
  
  const [emails, dispatchEmails] = useReducer(emailsReducer, initialEmailsState)
  const [loading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState)
  const [pageTokens, dispatchPageTokens] = useReducer(pageTokensReducer, initialPageTokensState)

  const fetchEmailsForCategory = useCallback(async (
    category: EmailCategory,
    pageToken?: string,
    append = false,
    forceRefresh = false
  ): Promise<void> => {
    if (!session?.accessToken) return

    dispatchLoading({ type: 'SET_LOADING', category, loading: true })

    try {
      const userId = session?.user?.email || 'anonymous'
      
      // Skip cache if force refresh is requested
      if (!forceRefresh) {
        const cachedData = getCachedEmailList(category, pageToken, userId)
        if (cachedData && !append) {
          console.log(`📧 Using cached data for ${category} (${cachedData.messages.length} emails)`)
          
          dispatchEmails({ type: 'SET_EMAILS', category, emails: cachedData.messages })
          dispatchPageTokens({
            type: 'SET_TOKEN',
            category,
            token: cachedData.nextPageToken || null
          })
          
          return
        }
      }

      const params = new URLSearchParams({
        category,
        maxResults: '50',
        ...(pageToken && { pageToken }),
        ...(forceRefresh && { forceRefresh: 'true' }),
      })

      const response = await fetch(`/api/emails?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        if (response.status === 401 && errorData.needsReauth) {
          window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href)
          return
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch emails`)
      }

      const data: EmailsResponse & { cached?: boolean; responseTime?: number; historyId?: string } = await response.json()
      
      if (data.responseTime) {
        console.log(`📧 Fetched ${data.messages.length} emails for ${category} in ${data.responseTime}ms ${data.cached ? '(server cached)' : '(fresh)'}`)
      }
      
      if (!data.cached && !append) {
        cacheEmailList(category, data, pageToken, userId)
      }
      
      if (append) {
        dispatchEmails({ type: 'APPEND_EMAILS', category, emails: data.messages })
      } else {
        dispatchEmails({ type: 'SET_EMAILS', category, emails: data.messages })
      }

      dispatchPageTokens({
        type: 'SET_TOKEN',
        category,
        token: data.nextPageToken || null
      })

      // Store the historyId for future history API calls (only for first page)
      if (data.historyId && !pageToken && session?.user?.email) {
        localStorage.setItem(`lastHistoryId_${session.user.email}`, data.historyId)
        console.log('📧 Stored initial historyId:', data.historyId)
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error)
      
      if (error instanceof Error && error.message.includes('Authentication expired')) {
        window.location.href = '/api/auth/signin?callbackUrl=' + encodeURIComponent(window.location.href)
      }
    } finally {
      dispatchLoading({ type: 'SET_LOADING', category, loading: false })
    }
  }, [session])

  const refreshEmails = useCallback((category: EmailCategory = 'inbox') => {
    const userId = session?.user?.email || 'anonymous'
    // Clear cache for the category to ensure fresh data
    clearEmailCacheForCategory(category, userId)
    return fetchEmailsForCategory(category, undefined, false, true)
  }, [fetchEmailsForCategory, session])

  const fetchNewEmailsFromHistory = useCallback(async (historyId: string, category: EmailCategory = 'inbox') => {
    if (!session?.accessToken) return

    try {
      console.log('📧 Fetching new emails from history:', historyId)
      
      // Get the last known historyId from localStorage
      const lastHistoryId = localStorage.getItem(`lastHistoryId_${session.user?.email}`)
      
      if (!lastHistoryId) {
        console.log('📧 No previous historyId found, doing full refresh instead')
        return refreshEmails(category)
      }
      
      const response = await fetch(`/api/gmail-history?startHistoryId=${lastHistoryId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch Gmail history')
      }

      const data = await response.json()
      
      if (data.success) {
        // Update the stored historyId
        localStorage.setItem(`lastHistoryId_${session.user?.email}`, data.historyId)
        
        if (data.hasChanges && data.newMessages.length > 0) {
          console.log('📧 Adding', data.newMessages.length, 'new emails to top of list')
          
          // Add new emails to the top of the list
          for (const email of data.newMessages.reverse()) { // Reverse to maintain chronological order
            dispatchEmails({ 
              type: 'PREPEND_EMAIL', 
              category, 
              email 
            })
          }
        } else {
          console.log('📧 No new messages found in history')
        }
      }
    } catch (error) {
      console.error('Failed to fetch new emails from history:', error)
      // Fallback to full refresh
      refreshEmails(category)
    }
  }, [session, dispatchEmails, refreshEmails])

  const addNewEmail = useCallback(async (messageId: string, category: EmailCategory = 'inbox') => {
    if (!session?.accessToken) return

    try {
      console.log('📧 Fetching new email for real-time update:', messageId)
      
      const response = await fetch(`/api/emails/single/${messageId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch new email')
      }

      const data = await response.json()
      
      if (data.success && data.email) {
        console.log('📧 Adding new email to top of list:', data.email.subject)
        
        // Add the new email to the top of the list
        dispatchEmails({ 
          type: 'PREPEND_EMAIL', 
          category, 
          email: data.email 
        })
      }
    } catch (error) {
      console.error('Failed to fetch and add new email:', error)
    }
  }, [session, dispatchEmails])

  const emailCounts = useMemo(() => {
    const counts: Record<EmailCategory, number> = {
      inbox: emails.inbox.length,
      starred: emails.starred.length,
      spam: emails.spam.length,
      trash: emails.trash.length
    }
    return counts
  }, [emails])

  return {
    emails,
    loading,
    pageTokens,
    dispatchEmails,
    dispatchLoading,
    dispatchPageTokens,
    fetchEmailsForCategory,
    refreshEmails,
    fetchNewEmailsFromHistory,
    addNewEmail,
    emailCounts
  }
} 