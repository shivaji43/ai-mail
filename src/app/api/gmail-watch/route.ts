import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'

// Interface for Gmail watch request
interface GmailWatchRequest {
  topicName: string
  labelIds?: string[]
  labelFilterBehavior?: 'INCLUDE' | 'EXCLUDE'
}

// Interface for Gmail watch response
interface GmailWatchResponse {
  historyId: string
  expiration: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { topicName, labelIds = ['INBOX'], labelFilterBehavior = 'INCLUDE' } = await request.json()

    if (!topicName) {
      return NextResponse.json(
        { error: 'topicName is required' },
        { status: 400 }
      )
    }

    // Prepare the watch request
    const watchRequest: GmailWatchRequest = {
      topicName,
      labelIds,
      labelFilterBehavior
    }

    console.log('📧 Setting up Gmail watch for:', session.user?.email)
    console.log('📧 Watch request:', watchRequest)

    // Call Gmail API to set up watch
    const watchResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(watchRequest),
    })

    if (!watchResponse.ok) {
      const errorData = await watchResponse.json().catch(() => ({}))
      console.error('Gmail watch setup failed:', errorData)
      
      if (watchResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication expired. Please sign in again.', needsReauth: true },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to set up Gmail watch', 
          details: errorData.error?.message || 'Unknown error'
        },
        { status: watchResponse.status }
      )
    }

    const watchData: GmailWatchResponse = await watchResponse.json()
    
    console.log('📧 Gmail watch setup successful:', {
      historyId: watchData.historyId,
      expiration: new Date(parseInt(watchData.expiration)).toISOString()
    })

    return NextResponse.json({
      success: true,
      historyId: watchData.historyId,
      expiration: watchData.expiration,
      expirationDate: new Date(parseInt(watchData.expiration)).toISOString(),
      topicName,
      labelIds
    })

  } catch (error) {
    console.error('Gmail watch setup error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to set up Gmail watch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get current watch status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Note: Gmail API doesn't have a direct way to check current watch status
    // This would typically be stored in your database
    return NextResponse.json({
      message: 'Watch status endpoint - implement database lookup for current watch state',
      user: session.user?.email
    })

  } catch (error) {
    console.error('Gmail watch status error:', error)
    return NextResponse.json(
      { error: 'Failed to get watch status' },
      { status: 500 }
    )
  }
}

// Stop Gmail watch
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('📧 Stopping Gmail watch for:', session.user?.email)

    const stopResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/stop', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!stopResponse.ok) {
      const errorData = await stopResponse.json().catch(() => ({}))
      console.error('Gmail watch stop failed:', errorData)
      
      return NextResponse.json(
        { 
          error: 'Failed to stop Gmail watch', 
          details: errorData.error?.message || 'Unknown error'
        },
        { status: stopResponse.status }
      )
    }

    console.log('📧 Gmail watch stopped successfully')

    return NextResponse.json({
      success: true,
      message: 'Gmail watch stopped successfully'
    })

  } catch (error) {
    console.error('Gmail watch stop error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to stop Gmail watch',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 