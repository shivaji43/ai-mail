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

// Category state
export interface CategoryState {
  activeCategory: EmailCategory
  emails: Record<EmailCategory, EmailMessage[]>
  loading: Record<EmailCategory, boolean>
  nextPageTokens: Record<EmailCategory, string | null>
} 