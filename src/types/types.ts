// NextAuth extended types
declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
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
  cached?: boolean
  responseTime?: number
  needsReauth?: boolean
}

export interface EmailsApiResponse {
  messages: EmailMessage[]
  nextPageToken?: string | null
  resultSizeEstimate: number
  cached?: boolean
  responseTime?: number
  historyId?: string
}

export interface CacheEntry<T = EmailsApiResponse> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number
  storage?: 'memory' | 'localStorage' | 'sessionStorage'
}

export interface JWTUser {
  name?: string | null
  email?: string | null
  picture?: string | null
  sub?: string
}

export interface ExtendedJWT {
  accessToken?: string
  refreshToken?: string
  accessTokenExpires?: number
  error?: string
  user?: JWTUser
  name?: string | null
  email?: string | null
  picture?: string | null
  sub?: string
  iat?: number
  exp?: number
  jti?: string
  [key: string]: unknown
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

// Inline content types
export interface InlineContentPayload {
  headers?: GmailHeader[]
  parts?: InlineContentPayload[]
  body?: GmailBody
  mimeType?: string
}

export interface GmailAttachmentData {
  data: string
  size: number
}

export interface InlineAttachmentResult {
  attachmentId: string
  mimeType: string
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
  | { type: 'PREPEND_EMAIL'; category: EmailCategory; email: EmailMessage }
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

export interface EmailItemProps {
  email: EmailMessage
  isSelected: boolean
  currentCategory: EmailCategory
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  onTrashClick?: (emailId: string) => void
  onSpamClick?: (emailId: string) => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
}

export interface VirtualizedEmailListProps {
  emails: EmailMessage[]
  height: number
  itemHeight: number
  currentCategory: EmailCategory
  selectedEmailId: string | null
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  onTrashClick?: (emailId: string) => void
  onSpamClick?: (emailId: string) => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export interface EmailRowData {
  emails: EmailMessage[]
  currentCategory: EmailCategory
  selectedEmailId: string | null
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  onTrashClick?: (emailId: string) => void
  onSpamClick?: (emailId: string) => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
}

export interface EmailLayoutProps {
  currentEmails: EmailMessage[]
  emailSelection: EmailSelectionState
  isLoading: boolean
  hasMore: boolean
  onEmailClick: (email: EmailMessage) => void
  onStarChange: (emailId: string, starred: boolean) => void
  onLoadMore: () => void
  formatDate: (date: string) => string
  extractSenderName: (from: string) => string
  fetchEmailContent: (emailId: string) => Promise<void>
}

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface IconProps {
  size?: IconSize
  className?: string
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
  emailId?: string
}

export interface EmailContentState {
  showHtml: boolean
  error: string | null
  contentDimensions: {
    width: string
    maxWidth: string
  }
}

export interface EmailContentProcessingOptions {
  maxWidth?: string
  fontSize?: 'xs' | 'sm' | 'base' | 'lg'
  compactMode?: boolean
}

// Gmail Push Notifications Types
export interface GmailPubSubMessage {
  message: {
    data: string // base64url-encoded JSON
    messageId: string
    publishTime: string
    attributes?: Record<string, string>
  }
  subscription: string
}

export interface GmailNotificationData {
  emailAddress: string
  historyId: string
}

export interface GmailWatchRequest {
  topicName: string
  labelIds?: string[]
  labelFilterBehavior?: 'INCLUDE' | 'EXCLUDE'
}

export interface GmailWatchResponse {
  historyId: string
  expiration: string
}

export interface GmailWatchSetupResponse {
  success: boolean
  historyId: string
  expiration: string
  expirationDate: string
  topicName: string
  labelIds: string[]
}

export interface GmailHistoryItem {
  id: string
  messages?: GmailMessageResponse[]
  messagesAdded?: Array<{
    message: GmailMessageResponse
  }>
  messagesDeleted?: Array<{
    message: Pick<GmailMessageResponse, 'id' | 'threadId'>
  }>
  labelsAdded?: Array<{
    message: Pick<GmailMessageResponse, 'id' | 'threadId'>
    labelIds: string[]
  }>
  labelsRemoved?: Array<{
    message: Pick<GmailMessageResponse, 'id' | 'threadId'>
    labelIds: string[]
  }>
}

export interface GmailHistoryResponse {
  history?: GmailHistoryItem[]
  nextPageToken?: string
  historyId: string
}

export interface GmailMessageAdded {
  message: {
    id: string
    threadId: string
    labelIds?: string[]
  }
}

export interface GmailMessageDeleted {
  message: {
    id: string
    threadId: string
  }
}

export interface GmailLabelAdded {
  message: {
    id: string
    threadId: string
    labelIds?: string[]
  }
  labelIds: string[]
}

export interface GmailLabelRemoved {
  message: {
    id: string
    threadId: string
    labelIds?: string[]
  }
  labelIds: string[]
}

// Real-time Email Updates Types
export interface EmailUpdateEvent {
  type: 'connected' | 'email_update'
  historyId?: string
  messageId?: string
  timestamp: number
}

export interface UseEmailUpdatesProps {
  onEmailUpdate: (historyId?: string, messageId?: string) => void
  enabled?: boolean
}

export interface UseEmailUpdatesReturn {
  isConnected: boolean
  reconnectAttempts: number
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
  fetchEmailsForCategory: (category: EmailCategory, pageToken?: string, append?: boolean, forceRefresh?: boolean) => Promise<void>
  refreshEmails: (category?: EmailCategory) => Promise<void>
  fetchNewEmailsFromHistory: (historyId: string, category?: EmailCategory) => Promise<void>
  addNewEmail: (messageId: string, category?: EmailCategory) => Promise<void>
  emailCounts: Record<EmailCategory, number>
}

export interface UseEmailContentReturn {
  emailSelection: EmailSelectionState
  emailCache: Map<string, EmailContent>
  fetchEmailContent: (emailId: string) => Promise<void>
  markEmailAsRead: (emailId: string) => Promise<void>
  updateEmailStarStatus: (emailId: string, starred: boolean) => void
  clearSelection: () => void
}