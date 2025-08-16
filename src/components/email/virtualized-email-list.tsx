"use client"

import { memo, useCallback, useRef, useEffect, useState } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { EmailItem } from './email-item'
import { VirtualizedEmailListProps } from '@/types/types'
import { Button } from '@/components/ui/button'

/**
 * Row component for react-window
 */
const EmailRow = memo(function EmailRow({ 
  index, 
  style, 
  data 
}: ListChildComponentProps) {
  const {
    emails,
    selectedEmailId,
    onEmailClick,
    onStarChange,
    formatDate,
    extractSenderName
  } = data

  const email = emails[index]
  
  if (!email) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div style={style} className="pb-1">
      <EmailItem
        email={email}
        isSelected={selectedEmailId === email.id}
        onEmailClick={onEmailClick}
        onStarChange={onStarChange}
        formatDate={formatDate}
        extractSenderName={extractSenderName}
      />
    </div>
  )
})

EmailRow.displayName = 'EmailRow'

/**
 * Virtualized email list component for optimal performance with large datasets
 */
export const VirtualizedEmailList = memo(function VirtualizedEmailList({
  emails,
  itemHeight,
  selectedEmailId,
  onEmailClick,
  onStarChange,
  formatDate,
  extractSenderName,
  isLoading = false,
  hasMore = false,
  onLoadMore
}: VirtualizedEmailListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  // Calculate container height dynamically
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newHeight = rect.height - (hasMore ? 70 : 0) // Account for load more button
        setContainerHeight(Math.max(newHeight, 200))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [hasMore])

  // Data passed to each row
  const itemData = {
    emails,
    selectedEmailId,
    onEmailClick,
    onStarChange,
    formatDate,
    extractSenderName
  }

  const handleLoadMore = useCallback(() => {
    if (onLoadMore && !isLoading) {
      onLoadMore()
    }
  }, [onLoadMore, isLoading])

  if (emails.length === 0 && !isLoading) {
    return (
      <div ref={containerRef} className="h-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📧</div>
          <p className="text-foreground text-lg">
            No emails found.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Your inbox is empty or try selecting a different category.
          </p>
        </div>
      </div>
    )
  }

  if (emails.length === 0 && isLoading) {
    return (
      <div ref={containerRef} className="h-full flex items-center justify-center bg-muted/30 rounded-lg border border-border">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-6 text-foreground text-lg">Loading emails...</p>
          <p className="text-muted-foreground text-sm mt-2">
            Please wait while we fetch your messages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-muted/30 rounded-lg border border-border overflow-hidden">
      <div className="flex-1">
        <List
          height={containerHeight}
          itemCount={emails.length}
          itemSize={itemHeight}
          itemData={itemData}
          width="100%"
          className="scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/50"
        >
          {EmailRow}
        </List>
      </div>
      
      {hasMore && (
        <div className="flex-shrink-0 border-t border-border bg-muted/50">
          <div className="text-center p-4">
            <Button
              onClick={handleLoadMore}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="min-w-[120px]"
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
        </div>
      )}
    </div>
  )
})

VirtualizedEmailList.displayName = 'VirtualizedEmailList' 