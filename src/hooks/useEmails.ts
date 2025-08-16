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

// Initial states
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

/**
 * Custom hook for managing email state with optimized performance
 */
export function useEmails(): UseEmailsReturn {
  const { data: session } = useSession()
  
  const [emails, dispatchEmails] = useReducer(emailsReducer, initialEmailsState)
  const [loading, dispatchLoading] = useReducer(loadingReducer, initialLoadingState)
  const [pageTokens, dispatchPageTokens] = useReducer(pageTokensReducer, initialPageTokensState)

  const fetchEmailsForCategory = useCallback(async (
    category: EmailCategory,
    pageToken?: string,
    append = false
  ): Promise<void> => {
    if (!session) return

    dispatchLoading({ type: 'SET_LOADING', category, loading: true })

    try {
      const url = `/api/emails?category=${category}&maxResults=30${pageToken ? `&pageToken=${pageToken}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data: EmailsResponse = await response.json()
      
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
    } catch (error) {
      // Silently fail - don't crash the app
      console.error('Failed to fetch emails:', error)
    } finally {
      dispatchLoading({ type: 'SET_LOADING', category, loading: false })
    }
  }, [session])

  // Memoized email counts
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
    emailCounts
  }
} 