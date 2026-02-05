"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmailMessage, EmailCategory } from '@/types/types'
import { updateCachesOnStarChange } from '@/lib/cache'
import { EmailContent as EmailContentComponent } from '@/components/email/email-content'
import { CategoryFilter } from '@/components/email/category-filter'
import { StarButton } from '@/components/email/star-button'
import { VirtualizedEmailList } from '@/components/email/virtualized-email-list'
import { AttachmentDownload } from '@/components/email/attachment-download'
import { EmailSearch } from '@/components/email/email-search'
import { useEmails } from '@/hooks/useEmails'
import { useEmailContent } from '@/hooks/useEmailContent'
import { useGmailNotifications } from '@/hooks/useGmailNotifications'
import { useEmailUpdates } from '@/hooks/useEmailUpdates'
import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function EmailsPage() {
  const { data: session, status } = useSession()
  const [activeCategory, setActiveCategory] = useState<EmailCategory>('inbox')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [useLocalSearch, setUseLocalSearch] = useState(false)

  const {
    emails,
    loading,
    pageTokens,
    dispatchEmails,
    fetchEmailsForCategory,
    refreshEmails,
    fetchNewEmailsFromHistory,
    searchEmails,
    filterEmailsLocally,
    emailCounts
  } = useEmails()

  const {
    emailSelection,
    fetchEmailContent,
    updateEmailStarStatus
  } = useEmailContent(dispatchEmails)

  const {
    isWatchActive,
    isSettingUp,
    setupWatch
  } = useGmailNotifications()

  const handleEmailUpdate = useCallback((historyId?: string, messageId?: string) => {
    console.log('Real-time update received:', { historyId, messageId, activeCategory })
    if (activeCategory === 'inbox' && historyId) {
      fetchNewEmailsFromHistory(historyId, 'inbox')
    }
  }, [activeCategory, fetchNewEmailsFromHistory])

  const { isConnected: isUpdateStreamConnected } = useEmailUpdates({
    onEmailUpdate: handleEmailUpdate,
    enabled: isWatchActive
  })

  useEffect(() => {
    console.log('Real-time update system status:', {
      isWatchActive,
      isUpdateStreamConnected,
      activeCategory
    })
  }, [isWatchActive, isUpdateStreamConnected, activeCategory])

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

  const handleTrashClick = useCallback(async (emailId: string) => {
    try {
      const isInTrash = activeCategory === 'trash'
      const endpoint = isInTrash ? `/api/emails/${emailId}/untrash` : `/api/emails/${emailId}/trash`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (response.ok) {
        // Remove from current category
        dispatchEmails({ type: 'REMOVE_EMAIL', category: activeCategory, emailId })
        
        const emailToMove = emails[activeCategory].find(e => e.id === emailId)
        if (emailToMove) {
          if (isInTrash) {
            // Remove from trash - move back to inbox
            const restoredEmail: EmailMessage = {
              ...emailToMove,
              labelIds: ['INBOX']
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'inbox', email: restoredEmail })
          } else {
            // Move to trash
            const trashedEmail: EmailMessage = {
              ...emailToMove,
              labelIds: ['TRASH']
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'trash', email: trashedEmail })
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle trash action:', error)
    }
  }, [emails, activeCategory, dispatchEmails])

  const handleSpamClick = useCallback(async (emailId: string) => {
    try {
      const isInSpam = activeCategory === 'spam'
      const endpoint = isInSpam ? `/api/emails/${emailId}/unspam` : `/api/emails/${emailId}/spam`
      
      const response = await fetch(endpoint, {
        method: 'POST',
      })

      if (response.ok) {
        // Remove from current category
        dispatchEmails({ type: 'REMOVE_EMAIL', category: activeCategory, emailId })
        
        const emailToMove = emails[activeCategory].find(e => e.id === emailId)
        if (emailToMove) {
          if (isInSpam) {
            // Mark as not spam - move back to inbox
            const restoredEmail: EmailMessage = {
              ...emailToMove,
              labelIds: ['INBOX']
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'inbox', email: restoredEmail })
          } else {
            // Mark as spam
            const spammedEmail: EmailMessage = {
              ...emailToMove,
              labelIds: ['SPAM']
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'spam', email: spammedEmail })
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle spam action:', error)
    }
  }, [emails, activeCategory, dispatchEmails])

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
        // 1) Update selected email panel + cache
        updateEmailStarStatus(emailId, starred)

        // 2) Update labelIds and isStarred for any category where this email exists
        const categories: EmailCategory[] = ['inbox', 'starred', 'spam', 'trash']
        let sourceEmail: EmailMessage | undefined
        categories.forEach((category) => {
          const existing = emails[category].find(e => e.id === emailId)
          if (existing) {
            if (!sourceEmail) sourceEmail = existing
            const updatedLabelIds = starred
              ? Array.from(new Set([...(existing.labelIds || []), 'STARRED']))
              : (existing.labelIds || []).filter(l => l !== 'STARRED')

            dispatchEmails({
              type: 'UPDATE_EMAIL',
              category,
              emailId,
              updates: { isStarred: starred, labelIds: updatedLabelIds }
            })
          }
        })

        // 3) Move between category lists
        if (starred) {
          // Ensure it appears in the starred list
          const alreadyInStarred = emails.starred.some(e => e.id === emailId)
          if (!alreadyInStarred && sourceEmail) {
            const updatedForStarred: EmailMessage = {
              ...sourceEmail,
              isStarred: true,
              labelIds: Array.from(new Set([...(sourceEmail.labelIds || []), 'STARRED']))
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'starred', email: updatedForStarred })
          }
          // Remove from inbox so it "moves" to Starred in the UI
          const existsInInbox = emails.inbox.some(e => e.id === emailId)
          if (existsInInbox) {
            dispatchEmails({ type: 'REMOVE_EMAIL', category: 'inbox', emailId })
          }
        } else {
          // Ensure it disappears from the starred list
          const existsInStarred = emails.starred.some(e => e.id === emailId)
          if (existsInStarred) {
            dispatchEmails({ type: 'REMOVE_EMAIL', category: 'starred', emailId })
          }
          // Optionally ensure presence in inbox only if it has INBOX label
          const inInbox = emails.inbox.some(e => e.id === emailId)
          const reference = sourceEmail || emails.starred.find(e => e.id === emailId)
          if (!inInbox && reference && (reference.labelIds || []).includes('INBOX')) {
            const updatedForInbox: EmailMessage = {
              ...reference,
              isStarred: false,
              labelIds: (reference.labelIds || []).filter(l => l !== 'STARRED')
            }
            dispatchEmails({ type: 'PREPEND_EMAIL', category: 'inbox', email: updatedForInbox })
          }
        }
        
        // 4) Update cached lists for inbox/starred to reflect the change
        try {
          const userId: string | undefined = session?.user?.email || undefined
          const base = sourceEmail || emails.starred.find(e => e.id === emailId) || emails.inbox.find(e => e.id === emailId)
          if (base) {
            const updatedForCache: EmailMessage = {
              ...base,
              isStarred: starred,
              labelIds: starred
                ? Array.from(new Set([...(base.labelIds || []), 'STARRED']))
                : (base.labelIds || []).filter(l => l !== 'STARRED')
            }
            updateCachesOnStarChange(updatedForCache, starred, userId)
          }
        } catch {}
      }
    } catch (error) {
      console.error('Failed to update star:', error)
    }
  }, [emails, dispatchEmails, updateEmailStarStatus, session])

  const handleCategoryChange = useCallback((category: EmailCategory) => {
    // If switching away from search, clear search mode
    if (category !== 'search' && isSearchMode) {
      setIsSearchMode(false)
      setSearchQuery('')
      setUseLocalSearch(false)
    }
    
    setActiveCategory(category)
    
    if (category !== 'search' && emails[category].length === 0 && !loading[category]) {
      fetchEmailsForCategory(category)
    }
  }, [emails, loading, fetchEmailsForCategory, isSearchMode])

  const handleLoadMore = useCallback(() => {
    const token = pageTokens[activeCategory]
    if (token && !loading[activeCategory]) {
      if (activeCategory === 'search' && searchQuery && !useLocalSearch) {
        searchEmails(searchQuery, token, true)
      } else if (activeCategory !== 'search' || !useLocalSearch) {
        fetchEmailsForCategory(activeCategory, token, true)
      }
      // Local search doesn't support pagination - all results are already filtered
    }
  }, [activeCategory, pageTokens, loading, fetchEmailsForCategory, searchEmails, searchQuery, useLocalSearch])

  const handleRefresh = useCallback(() => {
    if (!loading[activeCategory]) {
      refreshEmails(activeCategory)
    }
  }, [activeCategory, loading, refreshEmails])

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setIsSearchMode(true)
    
    // For simple queries (single words without Gmail operators), try local search first
    const isSimpleQuery = !query.includes(':') && !query.includes('@') && query.split(' ').length <= 2
    
    if (isSimpleQuery && emails.inbox.length > 0) {
      // Use local search for simple queries on loaded emails
      setUseLocalSearch(true)
      setActiveCategory('search')
      // The currentEmails useMemo will handle filtering
    } else {
      // Use Gmail API search for complex queries or when no emails are loaded
      setUseLocalSearch(false)
      setActiveCategory('search')
      await searchEmails(query)
    }
  }, [searchEmails, emails.inbox.length])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setIsSearchMode(false)
    setUseLocalSearch(false)
    setActiveCategory('inbox')
    // Clear search results
    dispatchEmails({ type: 'SET_EMAILS', category: 'search', emails: [] })
  }, [dispatchEmails])

  const currentEmails = useMemo(() => {
    if (isSearchMode && activeCategory === 'search') {
      if (useLocalSearch && searchQuery) {
        // Use local filtering for simple searches
        return filterEmailsLocally(searchQuery, 'inbox')
      }
      // Use API search results
      return emails.search || []
    }
    return emails[activeCategory] || []
  }, [emails, activeCategory, isSearchMode, useLocalSearch, searchQuery, filterEmailsLocally])

  const isLoading = loading[activeCategory]
  const hasMore = !!pageTokens[activeCategory]

  useEffect(() => {
    if (session && emails.inbox.length === 0 && !loading.inbox) {
      fetchEmailsForCategory('inbox')
    }
  }, [session, emails.inbox.length, loading.inbox, fetchEmailsForCategory])

  useEffect(() => {
    if (!session || !session.user?.email) return

    if (!isWatchActive && activeCategory === 'inbox' && !isSettingUp) {
      const topicName = process.env.NEXT_PUBLIC_GMAIL_TOPIC_NAME || 'projects/zero-455106/topics/gmail-notifications'
      
      console.log('Setting up Gmail push notifications for real-time updates...')
      setupWatch(topicName).then(success => {
        if (success) {
          console.log('Gmail push notifications enabled - no more polling needed!')
        } else {
          console.log('Gmail push notifications failed - falling back to manual refresh')
        }
      })
    }
  }, [session, activeCategory, isWatchActive, isSettingUp, setupWatch])

  useEffect(() => {
    if (!session || activeCategory !== 'inbox' || isWatchActive) return

    console.log('Push notifications not active, using fallback polling every 5 minutes')
    
    const interval = setInterval(() => {
      if (!loading.inbox) {
        console.log('Fallback: Auto-refreshing inbox for new emails...')
        refreshEmails('inbox')
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [session, activeCategory, loading.inbox, refreshEmails, isWatchActive])

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
      <header className="bg-card shadow-sm border-b-4 border-gray-800 dark:border-gray-200 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                AI Mail
              </h1>
            </div>
            
            {/* Search Bar - Center */}
            <div className="flex-1 max-w-2xl mx-4">
              <EmailSearch
                onSearch={handleSearch}
                onClear={handleClearSearch}
                placeholder="Search emails (e.g., 'from:john', 'has:attachment', 'important')..."
                isSearching={loading.search}
                searchQuery={searchQuery}
              />
            </div>
            
            <div className="flex items-center space-x-3">
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
                className="flex items-center gap-2 border-2"
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
              <Button variant="outline" className="border-2" onClick={() => window.location.href = '/'}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <CategoryFilter 
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        emailCounts={emailCounts}
        loading={loading}
        isSearchMode={isSearchMode}
      />

      <main className="flex-1 overflow-hidden">
        <div className="h-full flex gap-4 p-4 sm:p-6 lg:p-8">
          <div className="w-2/5 flex flex-col min-h-0">
            {isSearchMode && activeCategory === 'search' && (
              <div className="mb-3 px-3 py-2 bg-muted/50 rounded-md border text-sm text-muted-foreground">
                <span className="font-medium">
                  {useLocalSearch ? '🔍 Local search' : '🌐 Gmail search'} 
                </span>
                {searchQuery && (
                  <span> - &ldquo;{searchQuery}&rdquo; ({currentEmails.length} results)</span>
                )}
              </div>
            )}
            <div className="flex-1 min-h-0">
              <VirtualizedEmailList
                emails={currentEmails}
                height={0} 
                itemHeight={48} 
                currentCategory={activeCategory}
                selectedEmailId={emailSelection.selectedEmailId}
                onEmailClick={handleEmailClick}
                onStarChange={handleStarChange}
                onTrashClick={handleTrashClick}
                onSpamClick={handleSpamClick}
                formatDate={formatDate}
                extractSenderName={extractSenderName}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={handleLoadMore}
              />
            </div>
          </div>

          <div className="w-3/5">
            <Card className="h-full flex flex-col border-4 border-gray-800 dark:border-gray-200">
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