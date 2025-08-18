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
    
    const pubsubMessage: PubSubMessage = await request.json()
    
    if (!pubsubMessage.message?.data) {
      console.error('No message data in webhook')
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    const decodedData = Buffer.from(pubsubMessage.message.data, 'base64url').toString('utf-8')
    const notification: GmailNotification = JSON.parse(decodedData)
    

    try {
      const { clearEmailCacheForCategory } = await import('@/lib/cache')
      clearEmailCacheForCategory('inbox', notification.emailAddress)
      
      const { notifyEmailUpdate } = await import('@/lib/sse-notifications')
      notifyEmailUpdate(notification.emailAddress, notification.historyId)
      
      
    } catch (error) {
      console.error('Error processing Gmail notification:', error)
    }

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

export async function GET() {
  return NextResponse.json({ 
    status: 'Gmail webhook endpoint is running',
    timestamp: new Date().toISOString()
  })
}
 