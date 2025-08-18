import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { GmailMessageResponse, GmailPart, GmailPayload, EmailContent, EmailAttachment } from '@/types/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { id } = await params
    const messageId = id
    const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
    
    const messageResponse = await fetch(messageUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!messageResponse.ok) {
      throw new Error(`Gmail API error: ${messageResponse.status} ${messageResponse.statusText}`)
    }

    const messageData: GmailMessageResponse = await messageResponse.json()
    const emailContent = parseEmailContent(messageData)
    return NextResponse.json(emailContent)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch email content' },
      { status: 500 }
    )
  }
}

function parseEmailContent(messageData: GmailMessageResponse): EmailContent {
  const headers = messageData.payload?.headers || []
  
  // Extract headers
  const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
  const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender'
  const to = headers.find(h => h.name === 'To')?.value || ''
  const date = headers.find(h => h.name === 'Date')?.value || messageData.internalDate
  
  const { body, bodyHtml } = extractBody(messageData.payload)
  const attachments = extractAttachments(messageData.payload)
  
  return {
    id: messageData.id,
    threadId: messageData.threadId,
    subject,
    from,
    to,
    date,
    body,
    bodyHtml,
    attachments,
    labelIds: messageData.labelIds || [],
    isUnread: messageData.labelIds?.includes('UNREAD') || false,
    isStarred: messageData.labelIds?.includes('STARRED') || false,
    internalDate: messageData.internalDate,
  }
}

function extractBody(payload: GmailPayload): { body: string; bodyHtml?: string } {
  let textBody = ''
  let htmlBody = ''
  
  function processBodyPart(part: GmailPart) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textBody = decodeBase64(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      htmlBody = decodeBase64(part.body.data)
    } else if (part.parts) {
      part.parts.forEach(processBodyPart)
    }
  }
  
  if (payload.body?.data) {
    if (payload.mimeType === 'text/plain') {
      textBody = decodeBase64(payload.body.data)
    } else if (payload.mimeType === 'text/html') {
      htmlBody = decodeBase64(payload.body.data)
    }
  }
  
  if (payload.parts) {
    payload.parts.forEach(processBodyPart)
  }
  
  return {
    body: textBody || htmlBody || 'No content available',
    bodyHtml: htmlBody || undefined,
  }
}

function extractAttachments(payload: GmailPayload): EmailAttachment[] {
  const attachments: EmailAttachment[] = []
  
  function processAttachmentPart(part: GmailPart) {
    if (part.filename && part.body?.attachmentId) {
      // Check if this is an inline attachment
      const isInline = isInlineAttachment(part)
      
      // Only include non-inline attachments for download
      if (!isInline) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        })
      }
    }
    
    if (part.parts) {
      part.parts.forEach(processAttachmentPart)
    }
  }
  
  if (payload.parts) {
    payload.parts.forEach(processAttachmentPart)
  }
  
  return attachments
}

function isInlineAttachment(part: GmailPart): boolean {
  const headers = part.headers || []
  
  // Check for Content-Disposition header
  const contentDisposition = headers.find(h => 
    h.name.toLowerCase() === 'content-disposition'
  )?.value?.toLowerCase()
  
  // Check for Content-ID header (indicates inline image)
  const contentId = headers.find(h => 
    h.name.toLowerCase() === 'content-id'
  )?.value
  
  // Check for X-Attachment-Id header
  const xAttachmentId = headers.find(h => 
    h.name.toLowerCase() === 'x-attachment-id'
  )?.value
  
  // Inline if:
  // 1. Content-Disposition is "inline"
  // 2. Has Content-ID (used for cid: references in HTML)
  // 3. Has X-Attachment-Id (Gmail's inline indicator)
  // 4. Is an image with a generic/generated filename
  const hasInlineDisposition = contentDisposition?.includes('inline')
  const hasContentId = !!contentId
  const hasXAttachmentId = !!xAttachmentId
  const isGeneratedImageName = !!(part.mimeType?.startsWith('image/') && 
    (part.filename?.match(/^(image|img|attachment)\d*\.(jpg|jpeg|png|gif|webp)$/i) ||
     part.filename?.match(/^[a-f0-9-]{8,}$/i))) // UUID-like filenames
  
  return hasInlineDisposition || hasContentId || hasXAttachmentId || isGeneratedImageName
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  } catch {
    return 'Failed to decode content'
  }
} 