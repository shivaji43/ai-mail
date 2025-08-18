import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { GmailMessageResponse, GmailHeader, EmailMessage } from '@/types/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { messageId } = await params


    // Fetch the specific message
    const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
    
    const messageResponse = await fetch(messageUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!messageResponse.ok) {
      if (messageResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication expired. Please sign in again.', needsReauth: true },
          { status: 401 }
        )
      }
      throw new Error(`Gmail API error: ${messageResponse.status} ${messageResponse.statusText}`)
    }

    const messageData: GmailMessageResponse = await messageResponse.json()
    
    const headers = messageData.payload?.headers || []
    const subject = headers.find((h: GmailHeader) => h.name === 'Subject')?.value || 'No Subject'
    const from = headers.find((h: GmailHeader) => h.name === 'From')?.value || 'Unknown Sender'
    const date = headers.find((h: GmailHeader) => h.name === 'Date')?.value || messageData.internalDate

    const emailMessage: EmailMessage = {
      id: messageData.id,
      threadId: messageData.threadId,
      subject,
      from,
      date,
      snippet: messageData.snippet,
      labelIds: messageData.labelIds || [],
      isUnread: messageData.labelIds?.includes('UNREAD') || false,
      isStarred: messageData.labelIds?.includes('STARRED') || false,
      internalDate: messageData.internalDate,
    }


    return NextResponse.json({
      success: true,
      email: emailMessage
    })

  } catch (error) {
    console.error('Single email fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 