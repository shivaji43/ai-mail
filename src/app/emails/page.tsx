"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmailMessage, EmailCategory } from '@/types/types'
import { EmailContent as EmailContentComponent } from '@/components/email/email-content'
import { CategoryFilter } from '@/components/email/category-filter'
import { StarButton } from '@/components/email/star-button'
import { VirtualizedEmailList } from '@/components/email/virtualized-email-list'
import { useEmails } from '@/hooks/useEmails'
import { useEmailContent } from '@/hooks/useEmailContent'
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
    emailCounts
  } = useEmails()

  const {
    emailSelection,
    fetchEmailContent
  } = useEmailContent(dispatchEmails)

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
        <div className="h-full flex gap-6 p-4 sm:p-6 lg:p-8">
          {/* Email List */}
          <div className="w-1/2 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <VirtualizedEmailList
                emails={currentEmails}
                height={0} 
                itemHeight={160} 
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
          <div className="w-1/2">
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
                              <Badge key={index} variant="secondary" className="text-xs">
                                📎 {attachment.filename}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                      <EmailContentComponent
                        htmlContent={emailSelection.selectedEmailContent.bodyHtml}
                        textContent={emailSelection.selectedEmailContent.body}
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