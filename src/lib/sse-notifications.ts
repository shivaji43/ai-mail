const connections = new Map<string, ReadableStreamDefaultController<Uint8Array>>()

export function addConnection(userEmail: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  connections.set(userEmail, controller)
}

export function removeConnection(userEmail: string) {
  connections.delete(userEmail)
}

export function notifyEmailUpdate(userEmail: string, historyId: string, messageId?: string) {
  
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
    } catch (error) {
      console.error('Failed to send SSE notification:', error)
      connections.delete(userEmail)
    }
  } else {
  }
} 