import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { GmailListResponse, GmailMessageResponse, GmailHeader, EmailCategory } from '@/types/types'

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
    const pageToken = searchParams.get('pageToken') || ''
    const maxResults = parseInt(searchParams.get('maxResults') || '30')
    const category = (searchParams.get('category') || 'inbox') as EmailCategory

    // Build query based on category
    let query = ''
    switch (category) {
      case 'inbox':
        query = 'in:inbox -in:spam -in:trash'
        break
      case 'starred':
        query = 'is:starred -in:trash'
        break
      case 'spam':
        query = 'in:spam'
        break
      case 'trash':
        query = 'in:trash'
        break
    }

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`)
    }

    const listData: GmailListResponse = await listResponse.json()

    const messagePromises = listData.messages?.map(async (message: { id: string }) => {
      const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
      
      const messageResponse = await fetch(messageUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (messageResponse.ok) {
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
        }
      }
      return null
    }) || []

    const messages = await Promise.all(messagePromises)
    const validMessages = messages.filter(Boolean)

    return NextResponse.json({
      messages: validMessages,
      nextPageToken: listData.nextPageToken,
      resultSizeEstimate: listData.resultSizeEstimate,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
} 