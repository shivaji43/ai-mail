const connections = new Map<string, ReadableStreamDefaultController<Uint8Array>>()

export function addConnection(userEmail: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  connections.set(userEmail, controller)
  console.log('📡 SSE connection established for:', userEmail)
}

export function removeConnection(userEmail: string) {
  connections.delete(userEmail)
  console.log('📡 SSE connection closed for:', userEmail)
}

export function notifyEmailUpdate(userEmail: string, historyId: string, messageId?: string) {
  console.log('📡 Attempting to notify user:', userEmail, 'Active connections:', connections.size)
  
  const controller = connections.get(userEmail)
  if (controller) {
    try {
      const data = `data: ${JSON.stringify({ 
        type: 'email_update', 
        historyId,
        messageId,
        timestamp: Date.now() 
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
      console.log('📡 ✅ Successfully sent email update notification to:', userEmail, messageId ? `(messageId: ${messageId})` : '')
    } catch (error) {
      console.error('📡 ❌ Failed to send SSE notification:', error)
      connections.delete(userEmail)
    }
  } else {
    console.log('📡 ❌ No active SSE connection found for user:', userEmail)
  }
} 