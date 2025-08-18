import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { GmailHistoryResponse, EmailMessage, GmailMessageResponse, GmailHeader } from '@/types/types'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startHistoryId = searchParams.get('startHistoryId')

    if (!startHistoryId) {
      return NextResponse.json(
        { error: 'startHistoryId parameter is required' },
        { status: 400 }
      )
    }

    console.log('📧 Fetching Gmail history from:', startHistoryId)

    // Fetch history changes
    const historyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${startHistoryId}&labelId=INBOX`
    
    const historyResponse = await fetch(historyUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!historyResponse.ok) {
      if (historyResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication expired. Please sign in again.', needsReauth: true },
          { status: 401 }
        )
      }
      throw new Error(`Gmail History API error: ${historyResponse.status} ${historyResponse.statusText}`)
    }

    const historyData: GmailHistoryResponse = await historyResponse.json()
    
    console.log('📧 History response:', {
      historyId: historyData.historyId,
      historyCount: historyData.history?.length || 0
    })

    // Extract new message IDs from messagesAdded
    const newMessageIds: string[] = []
    
    if (historyData.history) {
      for (const historyItem of historyData.history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            // Only include messages with INBOX label
            if (messageAdded.message.labelIds?.includes('INBOX')) {
              newMessageIds.push(messageAdded.message.id)
            }
          }
        }
      }
    }

    console.log('📧 Found new message IDs:', newMessageIds)

    // Fetch details for new messages
    const newMessages: EmailMessage[] = []
    
    if (newMessageIds.length > 0) {
      // Batch fetch message details
      const messagePromises = newMessageIds.slice(0, 10).map(async (messageId) => {
        try {
          const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
          
          const messageResponse = await fetch(messageUrl, {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          })

          if (!messageResponse.ok) {
            throw new Error(`Failed to fetch message ${messageId}`)
          }

          const messageData: GmailMessageResponse = await messageResponse.json()
          
          const headers = messageData.payload?.headers || []
          const subject = headers.find((h: GmailHeader) => h.name === 'Subject')?.value || 'No Subject'
          const from = headers.find((h: GmailHeader) => h.name === 'From')?.value || 'Unknown Sender'
          const date = headers.find((h: GmailHeader) => h.name === 'Date')?.value || messageData.internalDate

          return {
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
          } as EmailMessage

        } catch (error) {
          console.error('Failed to fetch message:', messageId, error)
          return null
        }
      })

      const messageResults = await Promise.all(messagePromises)
      newMessages.push(...messageResults.filter((msg): msg is EmailMessage => msg !== null))
    }

    console.log('📧 Fetched new messages:', newMessages.length)

    return NextResponse.json({
      success: true,
      historyId: historyData.historyId,
      newMessages,
      hasChanges: newMessages.length > 0
    })

  } catch (error) {
    console.error('Gmail history fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Gmail history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 