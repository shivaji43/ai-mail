"use client"

import { memo } from 'react'
import { StarButton } from './star-button'
import { EmailItemProps } from '@/types/types'

/**
 * Memoized email item component to prevent unnecessary re-renders
 */
export const EmailItem = memo(function EmailItem({
  email,
  isSelected,
  onEmailClick,
  onStarChange,
  formatDate,
  extractSenderName
}: EmailItemProps) {
  const handleClick = () => {
    onEmailClick(email)
  }

  const handleStarChange = (emailId: string, starred: boolean) => {
    onStarChange(emailId, starred)
  }

  return (
    <div 
      className={`border-b-2 border-border hover:bg-accent/50 transition-colors cursor-pointer shadow-sm hover:shadow-md ${
        email.isUnread 
          ? 'bg-primary/5 border-l-4 border-l-primary' 
          : 'bg-card'
      } ${
        isSelected 
          ? 'bg-primary/10 border-l-4 border-l-primary shadow-md' 
          : ''
      }`}
      onClick={handleClick}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center space-x-3 mb-2">
              <span 
                className={`font-semibold text-base truncate ${
                  email.isUnread 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                {extractSenderName(email.from)}
              </span>
              {email.isUnread && (
                <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0" />
              )}
            </div>
            
            <div className="mb-3">
              <span 
                className={`text-sm font-medium block truncate ${
                  email.isUnread 
                    ? 'text-foreground' 
                    : 'text-muted-foreground'
                }`}
              >
                {email.subject}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {email.snippet}
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-3 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              {formatDate(email.date)}
            </span>
            <StarButton 
              emailId={email.id}
              isStarred={email.isStarred}
              onStarChange={handleStarChange}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
})

EmailItem.displayName = 'EmailItem' 