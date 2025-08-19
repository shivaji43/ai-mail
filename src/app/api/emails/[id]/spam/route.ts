import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emailId = params.id

    // Mark email as spam using Gmail API
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          addLabelIds: ['SPAM'],
          removeLabelIds: ['INBOX']
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Gmail API spam error:', errorData)
      return NextResponse.json(
        { error: 'Failed to mark email as spam' },
        { status: response.status }
      )
    }

    const result = await response.json()
    
    return NextResponse.json({ 
      success: true,
      message: result
    })
  } catch (error) {
    console.error('Error marking email as spam:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
