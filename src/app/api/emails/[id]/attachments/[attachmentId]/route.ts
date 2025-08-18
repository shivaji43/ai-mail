import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { id: messageId, attachmentId } = await params
    
    const attachmentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`
    
    const attachmentResponse = await fetch(attachmentUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!attachmentResponse.ok) {
      throw new Error(`Gmail API error: ${attachmentResponse.status} ${attachmentResponse.statusText}`)
    }

    const attachmentData = await attachmentResponse.json()
    
    if (!attachmentData.data) {
      throw new Error('No attachment data found')
    }

    const binaryData = Buffer.from(
      attachmentData.data.replace(/-/g, '+').replace(/_/g, '/'), 
      'base64'
    )

    const url = new URL(request.url)
    const filename = url.searchParams.get('filename') || 'attachment'
    const mimeType = url.searchParams.get('mimeType') || 'application/octet-stream'

    return new NextResponse(binaryData, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': binaryData.length.toString(),
      },
    })
  } catch (error) {
    console.error('Attachment download error:', error)
    return NextResponse.json(
      { error: 'Failed to download attachment' },
      { status: 500 }
    )
  }
}

