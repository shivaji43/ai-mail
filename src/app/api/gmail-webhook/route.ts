import { NextRequest, NextResponse } from 'next/server'
interface PubSubMessage {
  message: {
    data: string 
    messageId: string
    publishTime: string
  }
  subscription: string
}

interface GmailNotification {
  emailAddress: string
  historyId: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 Received Gmail webhook notification')
    
    // Parse the Pub/Sub message
    const pubsubMessage: PubSubMessage = await request.json()
    
    if (!pubsubMessage.message?.data) {
      console.error('No message data in webhook')
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    // Decode the base64url-encoded data
    const decodedData = Buffer.from(pubsubMessage.message.data, 'base64url').toString('utf-8')
    const notification: GmailNotification = JSON.parse(decodedData)
    
    console.log('📧 Gmail notification:', {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      pubsubMessageId: pubsubMessage.message.messageId
    })

    // Process Gmail notification and fetch new messages via History API
    try {
      // Clear inbox cache for this user to force refresh
      const { clearEmailCacheForCategory } = await import('@/lib/cache')
      clearEmailCacheForCategory('inbox', notification.emailAddress)
      
      // Notify connected clients with the historyId so they can fetch changes
      const { notifyEmailUpdate } = await import('@/lib/sse-notifications')
      notifyEmailUpdate(notification.emailAddress, notification.historyId)
      
      console.log('📧 Cache invalidated and clients notified for user:', notification.emailAddress)
      console.log('📧 Successfully processed Gmail notification for:', notification.emailAddress)
      
    } catch (error) {
      console.error('📧 Error processing Gmail notification:', error)
    }

    // Acknowledge the message by returning 200
    return NextResponse.json({ 
      success: true, 
      emailAddress: notification.emailAddress,
      historyId: notification.historyId 
    })

  } catch (error) {
    console.error('Gmail webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'Gmail webhook endpoint is running',
    timestamp: new Date().toISOString()
  })
} 