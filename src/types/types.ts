// NextAuth extended types
declare module "next-auth" {
  interface Session {
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

// Email categories
export type EmailCategory = 'inbox' | 'starred' | 'spam' | 'trash'

// Email-related types
export interface EmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
  labelIds: string[]
  isUnread: boolean
  internalDate: string
  isStarred: boolean
}

export interface EmailsResponse {
  messages: EmailMessage[]
  nextPageToken?: string
  resultSizeEstimate: number
}

// Full email content types
export interface EmailContent {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  body: string
  bodyHtml?: string
  attachments?: EmailAttachment[]
  labelIds: string[]
  isUnread: boolean
  internalDate: string
  isStarred: boolean
}

export interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
}

// Gmail API types
export interface GmailHeader {
  name: string
  value: string
}

export interface GmailPayload {
  headers: GmailHeader[]
  parts?: GmailPart[]
  body?: GmailBody
  mimeType?: string
}

export interface GmailPart {
  mimeType: string
  filename?: string
  headers?: GmailHeader[]
  body: GmailBody
  parts?: GmailPart[]
}

export interface GmailBody {
  data?: string
  size: number
  attachmentId?: string
}

export interface GmailMessageResponse {
  id: string
  threadId: string
  snippet: string
  payload: GmailPayload
  internalDate: string
  labelIds: string[]
}

export interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate: number
}

// Auth Provider types
export interface AuthProviderProps {
  children: React.ReactNode
}

// Email selection state
export interface EmailSelectionState {
  selectedEmailId: string | null
  selectedEmailContent: EmailContent | null
  isLoading: boolean
  error: string | null
}

// Legacy category state (keeping for compatibility)
export interface CategoryState {
  activeCategory: EmailCategory
  emails: Record<EmailCategory, EmailMessage[]>
  loading: Record<EmailCategory, boolean>
  nextPageTokens: Record<EmailCategory, string | null>
}

// Optimized state types for performance
export interface EmailsState {
  inbox: EmailMessage[]
  starred: EmailMessage[]
  spam: EmailMessage[]
  trash: EmailMessage[]
}

export interface LoadingState {
  inbox: boolean
  starred: boolean
  spam: boolean
  trash: boolean
}

export interface PageTokensState {
  inbox: string | null
  starred: string | null
  spam: string | null
  trash: string | null
}

// Email reducer action types
export type EmailsAction = 
  | { type: 'SET_EMAILS'; category: EmailCategory; emails: EmailMessage[] }
  | { type: 'APPEND_EMAILS'; category: EmailCategory; emails: EmailMessage[] }
  | { type: 'UPDATE_EMAIL'; category: EmailCategory; emailId: string; updates: Partial<EmailMessage> }
  | { type: 'UPDATE_EMAIL_ALL_CATEGORIES'; emailId: string; updates: Partial<EmailMessage> }
  | { type: 'MARK_EMAIL_AS_READ'; emailId: string }
  | { type: 'REMOVE_EMAIL'; category: EmailCategory; emailId: string }
  | { type: 'CLEAR_CATEGORY'; category: EmailCategory }

// Loading reducer action types
export type LoadingAction = 
  | { type: 'SET_LOADING'; category: EmailCategory; loading: boolean }
  | { type: 'SET_ALL_LOADING'; loading: Record<EmailCategory, boolean> }

// Page tokens reducer action types
export type PageTokensAction = 
  | { type: 'SET_TOKEN'; category: EmailCategory; token: string | null }
  | { type: 'CLEAR_TOKEN'; category: EmailCategory }
  | { type: 'CLEAR_ALL_TOKENS' }

// Component prop types
export interface EmailItemProps {
  email: EmailMessage
  isSelected: boolean
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
}

export interface VirtualizedEmailListProps {
  emails: EmailMessage[]
  height: number
  itemHeight: number
  selectedEmailId: string | null
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface CategoryFilterProps {
  activeCategory: EmailCategory
  onCategoryChange: (category: EmailCategory) => void
  emailCounts: Record<EmailCategory, number>
  loading: Record<EmailCategory, boolean>
}

export interface StarButtonProps {
  emailId: string
  isStarred: boolean
  onStarChange: (emailId: string, starred: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

export interface EmailContentProps {
  htmlContent?: string
  textContent: string
}

// Category definition type
export interface CategoryDefinition {
  id: EmailCategory
  label: string
  icon: string
}

// Hook return types
export interface UseEmailsReturn {
  emails: EmailsState
  loading: LoadingState
  pageTokens: PageTokensState
  dispatchEmails: React.Dispatch<EmailsAction>
  dispatchLoading: React.Dispatch<LoadingAction>
  dispatchPageTokens: React.Dispatch<PageTokensAction>
  fetchEmailsForCategory: (category: EmailCategory, pageToken?: string, append?: boolean) => Promise<void>
  emailCounts: Record<EmailCategory, number>
}

export interface UseEmailContentReturn {
  emailSelection: EmailSelectionState
  emailCache: Map<string, EmailContent>
  fetchEmailContent: (emailId: string) => Promise<void>
  markEmailAsRead: (emailId: string) => Promise<void>
  clearSelection: () => void
} 