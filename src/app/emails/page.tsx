"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmailMessage, EmailsResponse, EmailContent, EmailSelectionState, EmailCategory, CategoryState } from '@/types/types'
import { EmailContent as EmailContentComponent } from '@/components/email/email-content'
import { CategoryFilter } from '@/components/email/category-filter'
import { StarButton } from '@/components/email/star-button'

export default function EmailsPage() {
  const { data: session, status } = useSession()
  const [emailSelection, setEmailSelection] = useState<EmailSelectionState>({
    selectedEmailId: null,
    selectedEmailContent: null,
    isLoading: false,
    error: null,
  })
  const [emailCache, setEmailCache] = useState<Map<string, EmailContent>>(new Map())
  
  const [categoryState, setCategoryState] = useState<CategoryState>({
    activeCategory: 'inbox',
    emails: {
      inbox: [],
      starred: [],
      spam: [],
      trash: []
    },
    loading: {
      inbox: false,
      starred: false,
      spam: false,
      trash: false
    },
    nextPageTokens: {
      inbox: null,
      starred: null,
      spam: null,
      trash: null
    }
  })

  const fetchEmailsForCategory = async (category: EmailCategory, pageToken?: string, append = false) => {
    setCategoryState(prev => ({
      ...prev,
      loading: { ...prev.loading, [category]: true }
    }))

    try {
      const url = `/api/emails?category=${category}&maxResults=30${pageToken ? `&pageToken=${pageToken}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data: EmailsResponse = await response.json()
      
      setCategoryState(prev => ({
        ...prev,
        emails: {
          ...prev.emails,
          [category]: append ? [...prev.emails[category], ...data.messages] : data.messages
        },
        nextPageTokens: {
          ...prev.nextPageTokens,
          [category]: data.nextPageToken || null
        },
        loading: { ...prev.loading, [category]: false }
      }))
    } catch (err) {
      // Silently fail - don't crash the app
      setCategoryState(prev => ({
        ...prev,
        loading: { ...prev.loading, [category]: false }
      }))
    }
  }

  const fetchEmailContent = useCallback(async (emailId: string) => {
    if (emailCache.has(emailId)) {
      const cachedContent = emailCache.get(emailId)!
      setEmailSelection({
        selectedEmailId: emailId,
        selectedEmailContent: cachedContent,
        isLoading: false,
        error: null,
      })
      markEmailAsRead(emailId)
      return
    }

    setEmailSelection(prev => ({
      ...prev,
      selectedEmailId: emailId,
      isLoading: true,
      error: null,
    }))

    try {
      const response = await fetch(`/api/emails/${emailId}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch email content`)
      }

      const emailContent: EmailContent = await response.json()
      
      if (!emailContent || !emailContent.id) {
        throw new Error('Invalid email content received')
      }
      
      setEmailCache(prev => new Map(prev).set(emailId, emailContent))
      
      setEmailSelection({
        selectedEmailId: emailId,
        selectedEmailContent: emailContent,
        isLoading: false,
        error: null,
      })

      markEmailAsRead(emailId)
    } catch (err) {
      setEmailSelection(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      }))
    }
  }, [emailCache])

  const markEmailAsRead = async (emailId: string) => {
    try {
      await fetch(`/api/emails/${emailId}/mark-read`, {
        method: 'POST',
      })
      
      // Update all categories that might contain this email
      setCategoryState(prev => ({
        ...prev,
        emails: Object.fromEntries(
          Object.entries(prev.emails).map(([category, emails]) => [
            category,
            emails.map(email => 
              email.id === emailId 
                ? { ...email, isUnread: false, labelIds: email.labelIds.filter(id => id !== 'UNREAD') }
                : email
            )
          ])
        ) as Record<EmailCategory, EmailMessage[]>
      }))
    } catch (error) {
      // Silently fail - don't crash the app
    }
  }

  const handleStarChange = (emailId: string, starred: boolean) => {
    // Update all categories that might contain this email
    setCategoryState(prev => ({
      ...prev,
      emails: Object.fromEntries(
        Object.entries(prev.emails).map(([category, emails]) => [
          category,
          emails.map(email => 
            email.id === emailId 
              ? { 
                  ...email, 
                  isStarred: starred,
                  labelIds: starred 
                    ? [...email.labelIds.filter(id => id !== 'STARRED'), 'STARRED']
                    : email.labelIds.filter(id => id !== 'STARRED')
                }
              : email
          )
        ])
      ) as Record<EmailCategory, EmailMessage[]>
    }))

    // Update cached content if it exists
    if (emailCache.has(emailId)) {
      const cachedContent = emailCache.get(emailId)!
      setEmailCache(prev => new Map(prev).set(emailId, {
        ...cachedContent,
        isStarred: starred,
        labelIds: starred 
          ? [...cachedContent.labelIds.filter(id => id !== 'STARRED'), 'STARRED']
          : cachedContent.labelIds.filter(id => id !== 'STARRED')
      }))
    }

    // Update selection if this email is currently selected
    if (emailSelection.selectedEmailContent?.id === emailId) {
      setEmailSelection(prev => ({
        ...prev,
        selectedEmailContent: prev.selectedEmailContent ? {
          ...prev.selectedEmailContent,
          isStarred: starred,
          labelIds: starred 
            ? [...prev.selectedEmailContent.labelIds.filter(id => id !== 'STARRED'), 'STARRED']
            : prev.selectedEmailContent.labelIds.filter(id => id !== 'STARRED')
        } : null
      }))
    }
  }

  const handleCategoryChange = (category: EmailCategory) => {
    setCategoryState(prev => ({ ...prev, activeCategory: category }))
    
    // Fetch emails for the category if not already loaded
    if (categoryState.emails[category].length === 0 && !categoryState.loading[category]) {
      fetchEmailsForCategory(category)
    }
  }

  const handleEmailClick = (email: EmailMessage) => {
    fetchEmailContent(email.id)
  }

  const handleLoadMore = () => {
    const token = categoryState.nextPageTokens[categoryState.activeCategory]
    if (token) {
      fetchEmailsForCategory(categoryState.activeCategory, token, true)
    }
  }

  useEffect(() => {
    if (session) {
      // Load initial emails for inbox
      fetchEmailsForCategory('inbox')
    }
  }, [session])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const extractSenderName = (fromString: string) => {
    const match = fromString.match(/^(.+?)\s*</)
    return match ? match[1].replace(/"/g, '') : fromString
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
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

  const currentEmails = categoryState.emails[categoryState.activeCategory]
  const isLoading = categoryState.loading[categoryState.activeCategory]
  const hasMore = !!categoryState.nextPageTokens[categoryState.activeCategory]

  const emailCounts = Object.fromEntries(
    Object.entries(categoryState.emails).map(([category, emails]) => [category, emails.length])
  ) as Record<EmailCategory, number>

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Mail
              </h1>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <CategoryFilter 
        activeCategory={categoryState.activeCategory}
        onCategoryChange={handleCategoryChange}
        emailCounts={emailCounts}
        loading={categoryState.loading}
      />

      <main className="flex-1 overflow-hidden">
        <div className="h-full flex gap-6 p-4 sm:p-6 lg:p-8">
          <div className="w-1/2 flex flex-col">
            {isLoading && currentEmails.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading emails...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-2 pr-2">
                  {currentEmails.map((email) => (
                    <Card 
                      key={email.id} 
                      className={`hover:shadow-sm transition-shadow cursor-pointer ${
                        email.isUnread ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10' : ''
                      } ${
                        emailSelection.selectedEmailId === email.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
                      }`}
                      onClick={() => handleEmailClick(email)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold text-sm ${email.isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {extractSenderName(email.from)}
                              </span>
                              {email.isUnread && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate block">
                                {email.subject} - {email.snippet}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                            <StarButton 
                              emailId={email.id}
                              isStarred={email.isStarred}
                              onStarChange={handleStarChange}
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(email.date)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {currentEmails.length === 0 && !isLoading && (
                    <Card>
                      <CardContent className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">
                          No emails in {categoryState.activeCategory}.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {hasMore && (
                    <div className="text-center pt-6 pb-4">
                      <Button
                        onClick={handleLoadMore}
                        disabled={isLoading}
                        variant="outline"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
                      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading email...</p>
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
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p><span className="font-medium">From:</span> {emailSelection.selectedEmailContent.from}</p>
                        <p><span className="font-medium">To:</span> {emailSelection.selectedEmailContent.to}</p>
                        <p><span className="font-medium">Date:</span> {formatDate(emailSelection.selectedEmailContent.date)}</p>
                      </div>
                      {emailSelection.selectedEmailContent.attachments && emailSelection.selectedEmailContent.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
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