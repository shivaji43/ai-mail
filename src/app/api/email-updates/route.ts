import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { addConnection, removeConnection } from '@/lib/sse-notifications'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userEmail = session.user.email

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this user
      addConnection(userEmail, controller)
      
      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
    },
    cancel() {
      removeConnection(userEmail)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

 