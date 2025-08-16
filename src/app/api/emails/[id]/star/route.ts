import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing Gmail permissions' },
        { status: 401 }
      )
    }

    const { id } = await params
    const messageId = id
    const { starred } = await request.json()

    const modifyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`
    
    const modifyResponse = await fetch(modifyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: starred ? ['STARRED'] : [],
        removeLabelIds: starred ? [] : ['STARRED']
      })
    })

    if (!modifyResponse.ok) {
      throw new Error(`Gmail API error: ${modifyResponse.status} ${modifyResponse.statusText}`)
    }

    return NextResponse.json({ success: true, starred })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update star status' },
      { status: 500 }
    )
  }
} 