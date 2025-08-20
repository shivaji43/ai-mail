import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { 
  GmailListResponse, 
  GmailMessageResponse, 
  GmailHeader, 
  EmailCategory, 
  EmailMessage,
  EmailsApiResponse,
  CacheEntry
} from '@/types/types'

const emailCache = new Map<string, CacheEntry<EmailsApiResponse>>()
const CACHE_TTL = 5 * 60 * 1000
const BATCH_SIZE = 50
const MAX_CONCURRENT_BATCHES = 3

function getCacheKey(category: EmailCategory, pageToken: string, userId: string): string {
  return `${userId}:${category}:${pageToken || 'first'}`
}

function isValidCache(cacheEntry: { timestamp: number; ttl: number } | undefined): boolean {
  if (!cacheEntry) return false
  return Date.now() - cacheEntry.timestamp < cacheEntry.ttl
}

async function fetchEmailBatch(
  messageIds: string[], 
  accessToken: string, 
  startIndex: number = 0
): Promise<EmailMessage[]> {
  const batch = messageIds.slice(startIndex, startIndex + BATCH_SIZE)
  
  const batchPromises = batch.map(async (messageId) => {
    const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`
    
    try {
      const messageResponse = await fetch(messageUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      })

      if (!messageResponse.ok) {
        if (messageResponse.status === 401) {
          throw new Error('UNAUTHORIZED')
        }
        return null
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
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        throw error
      }
      return null
    }
  })

  const results = await Promise.allSettled(batchPromises)
  return results
    .filter((result): result is PromiseFulfilledResult<EmailMessage> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value)
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions', needsReauth: true },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get('pageToken') || ''
    const maxResults = Math.min(parseInt(searchParams.get('maxResults') || '50'), 50)
    const category = (searchParams.get('category') || 'inbox') as EmailCategory
    const forceRefresh = searchParams.get('forceRefresh') === 'true'
    const searchQuery = searchParams.get('search') || ''
    const userId = session.user?.email || 'anonymous'

    // Include search query in cache key to ensure different results are cached separately
    const cacheKey = searchQuery 
      ? `${userId}:search:${encodeURIComponent(searchQuery)}:${pageToken || 'first'}`
      : getCacheKey(category, pageToken, userId)
    const cachedData = emailCache.get(cacheKey)
    
    // Skip cache if force refresh is requested
    if (!forceRefresh && isValidCache(cachedData) && cachedData) {
      return NextResponse.json({
        ...cachedData.data,
        cached: true,
        responseTime: Date.now() - startTime
      })
    }

    let query = ''
    
    // If there's a search query, use it directly (Gmail search supports natural language)
    if (searchQuery) {
      // Combine user search with basic filtering to exclude spam/trash unless explicitly searched
      const userQuery = searchQuery.trim()
      // Check if user is explicitly searching in spam/trash
      const isSearchingSpamTrash = userQuery.includes('in:spam') || userQuery.includes('in:trash')
      
      if (isSearchingSpamTrash) {
        query = userQuery
      } else {
        // Default to excluding spam and trash unless explicitly included
        query = `${userQuery} -in:spam -in:trash`
      }
    } else {
      // Default category-based queries
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
    }

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${pageToken ? `&pageToken=${pageToken}` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}`
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!listResponse.ok) {
      if (listResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication expired. Please sign in again.', needsReauth: true },
          { status: 401 }
        )
      }
      throw new Error(`Gmail API error: ${listResponse.status} ${listResponse.statusText}`)
    }

    const listData: GmailListResponse = await listResponse.json()

    if (!listData.messages || listData.messages.length === 0) {
      const emptyResult: EmailsApiResponse = {
        messages: [],
        nextPageToken: null,
        resultSizeEstimate: 0,
        responseTime: Date.now() - startTime,
        cached: false
      }
      
      emailCache.set(cacheKey, {
        data: emptyResult,
        timestamp: Date.now(),
        ttl: 60 * 1000
      })
      
      return NextResponse.json(emptyResult)
    }

    const messageIds = listData.messages.map(msg => msg.id)
    
    try {
      const allMessages: EmailMessage[] = []
      const batches: Promise<EmailMessage[]>[] = []
      
      for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        if (batches.length >= MAX_CONCURRENT_BATCHES) {
          const completedBatch = await Promise.race(batches)
          allMessages.push(...completedBatch)
          batches.splice(batches.findIndex(b => b === Promise.resolve(completedBatch)), 1)
        }
        
        batches.push(fetchEmailBatch(messageIds, session.accessToken, i))
      }
      
      const remainingResults = await Promise.all(batches)
      remainingResults.forEach(batch => allMessages.push(...batch))

      const validMessages = allMessages.filter(Boolean)
      
      const result: EmailsApiResponse = {
        messages: validMessages,
        nextPageToken: listData.nextPageToken,
        resultSizeEstimate: listData.resultSizeEstimate,
        responseTime: Date.now() - startTime,
        cached: false
      }

      // Use shorter cache TTL for inbox first page to allow new emails to appear faster
      const cacheTTL = category === 'inbox' && !pageToken ? 30 * 1000 : CACHE_TTL // 30 seconds for inbox first page, 5 minutes for others

      emailCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: cacheTTL
      })

      if (emailCache.size > 100) {
        const oldestKey = Array.from(emailCache.keys())[0]
        emailCache.delete(oldestKey)
      }

      // Get the current historyId for future history API calls (only for first page)
      if (!pageToken) {
        try {
          const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
          })
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json()
            result.historyId = profileData.historyId
          }
        } catch (error) {
          console.error('Failed to fetch profile for historyId:', error)
        }
      }

      return NextResponse.json(result)
      
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Authentication expired. Please sign in again.', needsReauth: true },
          { status: 401 }
        )
      }
      throw error
    }
    
  } catch (error) {
    console.error('Email fetch error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch emails', 
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 