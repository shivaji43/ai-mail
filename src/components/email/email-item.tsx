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
      className={`
        relative rounded-xl border border-border/50 cursor-pointer
        backdrop-blur-md backdrop-saturate-150
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10
        hover:border-primary/30 hover:backdrop-blur-lg
        ${email.isUnread 
          ? 'bg-primary/10 border-l-4 border-l-primary shadow-md shadow-primary/20' 
          : 'bg-card/80 shadow-sm'
        } 
        ${isSelected 
          ? 'bg-primary/15 border-l-4 border-l-primary shadow-lg shadow-primary/25 scale-[1.01]' 
          : ''
        }
      `}
      onClick={handleClick}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between flex-1">
          <div className="flex-1 min-w-0 mr-4 flex flex-col">
            <div className="flex items-center space-x-3 mb-1">
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
            
            <div className="mb-2">
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
            
            <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
              {email.snippet}
            </div>
          </div>
          
          <div className="flex flex-col items-end justify-between h-full space-y-2 flex-shrink-0">
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