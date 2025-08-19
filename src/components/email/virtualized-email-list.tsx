"use client"

import { memo, useCallback, useRef, useEffect, useState } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { EmailItem } from './email-item'
import { VirtualizedEmailListProps } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
const EmailRow = memo(function EmailRow({ 
  index, 
  style, 
  data 
}: ListChildComponentProps) {
  const {
    emails,
    currentCategory,
    selectedEmailId,
    onEmailClick,
    onStarChange,
    onTrashClick,
    onSpamClick,
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
    <div style={style}>
      <EmailItem
        email={email}
        currentCategory={currentCategory}
        isSelected={selectedEmailId === email.id}
        onEmailClick={onEmailClick}
        onStarChange={onStarChange}
        onTrashClick={onTrashClick}
        onSpamClick={onSpamClick}
        formatDate={formatDate}
        extractSenderName={extractSenderName}
      />
    </div>
  )
})

EmailRow.displayName = 'EmailRow'


export const VirtualizedEmailList = memo(function VirtualizedEmailList({
  emails,
  itemHeight,
  currentCategory,
  selectedEmailId,
  onEmailClick,
  onStarChange,
  onTrashClick,
  onSpamClick,
  formatDate,
  extractSenderName,
  isLoading = false,
  hasMore = false,
  onLoadMore
}: VirtualizedEmailListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const newHeight = rect.height - (hasMore ? 70 : 0)
        setContainerHeight(Math.max(newHeight, 200))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [hasMore])

  const itemData = {
    emails,
    currentCategory,
    selectedEmailId,
    onEmailClick,
    onStarChange,
    onTrashClick,
    onSpamClick,
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
      <div ref={containerRef} className="h-full flex items-center justify-center bg-gradient-to-br from-background/80 to-muted/50 rounded-lg border-2 border-gray-800 dark:border-gray-200 backdrop-blur-sm">
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
      <div ref={containerRef} className="h-full flex items-center justify-center bg-gradient-to-br from-background/80 to-muted/50 rounded-lg border-2 border-gray-800 dark:border-gray-200 backdrop-blur-sm">
        <div className="text-center p-8 w-full max-w-md">
          <div className="mb-6">
            <Progress value={undefined} className="w-full h-2" />
          </div>
          <p className="mt-4 text-foreground text-lg">Loading emails...</p>
          <p className="text-muted-foreground text-sm mt-2">
            Please wait while we fetch your messages.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col bg-gradient-to-br from-background/80 to-muted/50 rounded-lg border-4 border-gray-800 dark:border-gray-200 overflow-hidden backdrop-blur-sm">
      <div className="flex-1 ">
        <List
          height={containerHeight - 12}
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
        <div className="flex-shrink-0 border-t-4 border-gray-700 dark:border-gray-300 bg-muted/50">
          <div className="text-center p-4">
            <Button
              onClick={handleLoadMore}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="min-w-[120px] border-2"
            >
              {isLoading ? (
                <>
                  <Progress value={undefined} className="w-4 h-1 mr-2" />
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