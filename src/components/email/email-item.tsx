"use client"

import { memo } from 'react'
import { StarButton } from './star-button'
import { EmailItemProps } from '@/types/types'
import { Button } from '@/components/ui/button'
import { Trash2, Ban, Undo2, ShieldCheck } from 'lucide-react'

export const EmailItem = memo(function EmailItem({
  email,
  isSelected,
  currentCategory,
  onEmailClick,
  onStarChange,
  onTrashClick,
  onSpamClick,
  formatDate,
  extractSenderName
}: EmailItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger email click if clicking on action buttons
    if ((e.target as Element).closest('button')) return
    onEmailClick(email)
  }

  const handleStarChange = (emailId: string, starred: boolean) => {
    onStarChange(emailId, starred)
  }

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation()
    onTrashClick?.(email.id)
  }

  const handleSpam = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSpamClick?.(email.id)
  }

  return (
    <div 
      className={`
        group flex items-center px-4 py-2 cursor-pointer border-b-2 border-gray-700 dark:border-gray-300
        transition-colors duration-150 ease-out
        hover:bg-muted/50
        ${email.isUnread 
          ? 'bg-background font-medium' 
          : 'bg-background/50 font-normal'
        } 
        ${isSelected 
          ? 'bg-primary/10 border-l-4 border-l-primary' 
          : ''
        }
      `}
      onClick={handleClick}
    >
      {/* Star button and unread indicator */}
      <div className="mr-3 flex-shrink-0 flex items-center space-x-2">
        <StarButton 
          emailId={email.id}
          isStarred={email.isStarred}
          onStarChange={handleStarChange}
          size="sm"
        />
        {email.isUnread && (
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
        )}
      </div>

      {/* Sender name */}
      <div className="w-48 flex-shrink-0 mr-4">
        <span 
          className={`text-sm truncate block ${
            email.isUnread 
              ? 'text-foreground font-semibold' 
              : 'text-muted-foreground'
          }`}
        >
          {extractSenderName(email.from)}
        </span>
      </div>

      {/* Subject and snippet */}
      <div className="flex-1 min-w-0 mr-4">
        <span 
          className={`text-sm truncate block ${
            email.isUnread 
              ? 'text-foreground' 
              : 'text-muted-foreground'
          }`}
        >
          <span className="font-medium">{email.subject}</span>
          <span className="ml-2 font-normal text-muted-foreground">- {email.snippet}</span>
        </span>
      </div>

      {/* Actions and date */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        {/* Action buttons - only show on hover or selection */}
        <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {currentCategory === 'trash' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 border-2 border-transparent hover:border-green-500 hover:bg-green-500/10 hover:text-green-600"
              onClick={handleTrash}
              title="Remove from trash"
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 border-2 border-transparent hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleTrash}
              title="Move to trash"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
          
          {currentCategory === 'spam' ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 border-2 border-transparent hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={handleSpam}
              title="Not spam"
            >
              <ShieldCheck className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 border-2 border-transparent hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
              onClick={handleSpam}
              title="Mark as spam"
            >
              <Ban className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Date */}
        <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
          {formatDate(email.date)}
        </span>
      </div>
    </div>
  )
})

EmailItem.displayName = 'EmailItem' 