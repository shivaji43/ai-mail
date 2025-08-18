import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { GmailMessageResponse, InlineContentPayload, InlineAttachmentResult, GmailHeader } from '@/types/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { id: emailId, contentId } = await params
    
    // First get the email to find the attachment with this contentId
    const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`
    
    const messageResponse = await fetch(messageUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!messageResponse.ok) {
      throw new Error(`Gmail API error: ${messageResponse.status}`)
    }

    const messageData: GmailMessageResponse = await messageResponse.json()
    
    // Find the attachment with the matching contentId
    function findAttachmentByContentId(payload: InlineContentPayload, targetContentId: string): InlineAttachmentResult | null {
      if (payload.parts) {
        for (const part of payload.parts) {
          // Check headers for Content-ID
          const headers = part.headers || []
          const contentIdHeader = headers.find((h: GmailHeader) => 
            h.name.toLowerCase() === 'content-id' && 
            h.value.replace(/[<>]/g, '') === targetContentId
          )
          
          if (contentIdHeader && part.body?.attachmentId) {
            return {
              attachmentId: part.body.attachmentId,
              mimeType: part.mimeType || 'application/octet-stream'
            }
          }
          
          // Recursively search in nested parts
          if (part.parts) {
            const found = findAttachmentByContentId(part, targetContentId)
            if (found) return found
          }
        }
      }
      return null
    }

    const attachment = findAttachmentByContentId(messageData.payload, contentId)
    
    if (!attachment) {
      return NextResponse.json(
        { error: 'Inline image not found' },
        { status: 404 }
      )
    }

    // Get the attachment data
    const attachmentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/attachments/${attachment.attachmentId}`
    
    const attachmentResponse = await fetch(attachmentUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    })

    if (!attachmentResponse.ok) {
      throw new Error(`Failed to fetch attachment: ${attachmentResponse.status}`)
    }

    const attachmentData = await attachmentResponse.json()
    
    // Decode the base64 data
    const imageData = Buffer.from(attachmentData.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    
    // Return the image with appropriate headers
    return new NextResponse(imageData, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Length': imageData.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error fetching inline image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inline image' },
      { status: 500 }
    )
  }
}
