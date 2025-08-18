"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailMessage, EmailCategory } from '@/types/types'
import { EmailContent as EmailContentComponent } from '@/components/email/email-content'
import { CategoryFilter } from '@/components/email/category-filter'
import { StarButton } from '@/components/email/star-button'
import { VirtualizedEmailList } from '@/components/email/virtualized-email-list'
import { AttachmentDownload } from '@/components/email/attachment-download'
import { useEmails } from '@/hooks/useEmails'
import { useEmailContent } from '@/hooks/useEmailContent'
import { useGmailNotifications } from '@/hooks/useGmailNotifications'
import { useEmailUpdates } from '@/hooks/useEmailUpdates'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function EmailsPage() {
  const { data: session, status } = useSession()
  const [activeCategory, setActiveCategory] = useState<EmailCategory>('inbox')
  
  // Use optimized hooks
  const {
    emails,
    loading,
    pageTokens,
    dispatchEmails,
    fetchEmailsForCategory,
    refreshEmails,
    fetchNewEmailsFromHistory,
    emailCounts
  } = useEmails()

  const {
    emailSelection,
    fetchEmailContent
  } = useEmailContent(dispatchEmails)

  const {
    isWatchActive,
    isSettingUp,
    setupWatch
  } = useGmailNotifications()

  // Handle real-time email updates
  const handleEmailUpdate = useCallback((historyId?: string, messageId?: string) => {
    console.log('📧 Real-time update received:', { historyId, messageId, activeCategory })
    if (activeCategory === 'inbox' && historyId) {
      // Use the history API to fetch only new messages
      fetchNewEmailsFromHistory(historyId, 'inbox')
    }
  }, [activeCategory, fetchNewEmailsFromHistory])

  const { isConnected: isUpdateStreamConnected } = useEmailUpdates({
    onEmailUpdate: handleEmailUpdate,
    enabled: isWatchActive
  })

  // Debug logging for real-time updates
  useEffect(() => {
    console.log('📧 Real-time update system status:', {
      isWatchActive,
      isUpdateStreamConnected,
      activeCategory
    })
  }, [isWatchActive, isUpdateStreamConnected, activeCategory])

  // Memoized stable callback functions
  const formatDate = useCallback((dateString: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateString))
    } catch {
      return dateString
    }
  }, [])

  const extractSenderName = useCallback((fromString: string) => {
    const match = fromString.match(/^(.+?)\s*</)
    return match ? match[1].replace(/"/g, '') : fromString
  }, [])

  const handleEmailClick = useCallback((email: EmailMessage) => {
    fetchEmailContent(email.id)
  }, [fetchEmailContent])

  const handleStarChange = useCallback(async (emailId: string, starred: boolean) => {
    try {
      const response = await fetch(`/api/emails/${emailId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ starred }),
      })

      if (response.ok) {
        // Update email in all categories
        dispatchEmails({
          type: 'UPDATE_EMAIL_ALL_CATEGORIES',
          emailId,
          updates: { 
            isStarred: starred,
            labelIds: starred 
              ? ['STARRED'] // Simplified - would need current labelIds in real implementation
              : [] // Simplified - would need to filter out STARRED properly
          }
        })
      }
    } catch (error) {
      console.error('Failed to update star:', error)
    }
  }, [dispatchEmails])

  const handleCategoryChange = useCallback((category: EmailCategory) => {
    setActiveCategory(category)
    
    // Fetch emails for the category if not already loaded
    if (emails[category].length === 0 && !loading[category]) {
      fetchEmailsForCategory(category)
    }
  }, [emails, loading, fetchEmailsForCategory])

  const handleLoadMore = useCallback(() => {
    const token = pageTokens[activeCategory]
    if (token && !loading[activeCategory]) {
      fetchEmailsForCategory(activeCategory, token, true)
    }
  }, [activeCategory, pageTokens, loading, fetchEmailsForCategory])

  const handleRefresh = useCallback(() => {
    if (!loading[activeCategory]) {
      refreshEmails(activeCategory)
    }
  }, [activeCategory, loading, refreshEmails])

  // Memoize current emails and derived state
  const currentEmails = useMemo(() => 
    emails[activeCategory] || [], 
    [emails, activeCategory]
  )

  const isLoading = loading[activeCategory]
  const hasMore = !!pageTokens[activeCategory]

  // Initial load effect
  useEffect(() => {
    if (session && emails.inbox.length === 0 && !loading.inbox) {
      fetchEmailsForCategory('inbox')
    }
  }, [session, emails.inbox.length, loading.inbox, fetchEmailsForCategory])

  // Setup Gmail push notifications instead of polling
  useEffect(() => {
    if (!session || !session.user?.email) return

    // Only setup if not already active and we're viewing inbox
    if (!isWatchActive && activeCategory === 'inbox' && !isSettingUp) {
      // Use your actual Google Cloud project ID
      const topicName = process.env.NEXT_PUBLIC_GMAIL_TOPIC_NAME || 'projects/zero-455106/topics/gmail-notifications'
      
      console.log('🔔 Setting up Gmail push notifications for real-time updates...')
      setupWatch(topicName).then(success => {
        if (success) {
          console.log('🔔 Gmail push notifications enabled - no more polling needed!')
        } else {
          console.log('⚠️ Gmail push notifications failed - falling back to manual refresh')
        }
      })
    }
  }, [session, activeCategory, isWatchActive, isSettingUp, setupWatch])

  // Fallback: Auto-refresh inbox every 5 minutes only if push notifications are not active
  useEffect(() => {
    if (!session || activeCategory !== 'inbox' || isWatchActive) return

    console.log('⚠️ Push notifications not active, using fallback polling every 5 minutes')
    
    const interval = setInterval(() => {
      if (!loading.inbox) {
        console.log('🔄 Fallback: Auto-refreshing inbox for new emails...')
        refreshEmails('inbox')
      }
    }, 5 * 60 * 1000) // 5 minutes as fallback

    return () => clearInterval(interval)
  }, [session, activeCategory, loading.inbox, refreshEmails, isWatchActive])

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Unauthenticated state
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your emails.
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
              <header className="bg-card shadow-sm border-b border-border flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                AI Mail
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {/* Gmail Push Notifications Status */}
              <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  isWatchActive && isUpdateStreamConnected ? 'bg-green-500' : 
                  isWatchActive ? 'bg-yellow-500' :
                  isSettingUp ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-muted-foreground">
                  {isWatchActive && isUpdateStreamConnected ? 'Live' : 
                   isWatchActive ? 'Watch Active' :
                   isSettingUp ? 'Setting up...' : 'Manual'}
                </span>
              </div>

              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={loading[activeCategory]}
                className="flex items-center gap-2"
              >
                <svg 
                  className={`w-4 h-4 ${loading[activeCategory] ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading[activeCategory] ? 'Refreshing...' : 'Refresh'}
              </Button>
              <ThemeToggle />
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <CategoryFilter 
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        emailCounts={emailCounts}
        loading={loading}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex gap-4 p-4 sm:p-6 lg:p-8">
          {/* Email List */}
          <div className="w-2/5 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <VirtualizedEmailList
                emails={currentEmails}
                height={0} 
                itemHeight={120} 
                selectedEmailId={emailSelection.selectedEmailId}
                onEmailClick={handleEmailClick}
                onStarChange={handleStarChange}
                formatDate={formatDate}
                extractSenderName={extractSenderName}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            </div>
          </div>

          {/* Email Content Panel */}
          <div className="w-3/5">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle>Email Details</CardTitle>
                {emailSelection.selectedEmailContent && (
                  <StarButton 
                    emailId={emailSelection.selectedEmailContent.id}
                    isStarred={emailSelection.selectedEmailContent.isStarred}
                    onStarChange={handleStarChange}
                    size="md"
                  />
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-6">
                {emailSelection.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-4 text-muted-foreground">Loading email...</p>
                    </div>
                  </div>
                ) : emailSelection.error ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-red-600 dark:text-red-400 mb-4">
                        Error: {emailSelection.error}
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => emailSelection.selectedEmailId && fetchEmailContent(emailSelection.selectedEmailId)}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : emailSelection.selectedEmailContent ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 mb-4 pb-4 border-b">
                      <h2 className="text-xl font-bold mb-2">
                        {emailSelection.selectedEmailContent.subject}
                      </h2>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><span className="font-medium">From:</span> {emailSelection.selectedEmailContent.from}</p>
                        <p><span className="font-medium">To:</span> {emailSelection.selectedEmailContent.to}</p>
                        <p><span className="font-medium">Date:</span> {formatDate(emailSelection.selectedEmailContent.date)}</p>
                      </div>
                      {emailSelection.selectedEmailContent.attachments && emailSelection.selectedEmailContent.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Attachments ({emailSelection.selectedEmailContent.attachments.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {emailSelection.selectedEmailContent.attachments.map((attachment, index) => (
                              <AttachmentDownload
                                key={index}
                                emailId={emailSelection.selectedEmailContent!.id}
                                attachment={attachment}
                                variant="badge"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      <EmailContentComponent
                        htmlContent={emailSelection.selectedEmailContent.bodyHtml}
                        textContent={emailSelection.selectedEmailContent.body}
                        emailId={emailSelection.selectedEmailContent.id}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center">
                      Select an email to view its content
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
} 