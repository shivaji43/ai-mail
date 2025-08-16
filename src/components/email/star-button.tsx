"use client"

import { useState, memo, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { StarButtonProps } from '@/types/types'

export const StarButton = memo(function StarButton({ emailId, isStarred, onStarChange, size = 'sm' }: StarButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleStarClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (loading) return

    setLoading(true)
    
    try {
      const response = await fetch(`/api/emails/${emailId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ starred: !isStarred }),
      })

      if (response.ok) {
        onStarChange(emailId, !isStarred)
      } else {
        // Silently fail - don't crash the app
      }
    } catch {
      // Silently fail - don't crash the app
    } finally {
      setLoading(false)
    }
  }, [emailId, isStarred, onStarChange, loading])

  const sizeClasses = useMemo(() => ({
    sm: 'h-6 w-6 text-sm',
    md: 'h-8 w-8 text-base',
    lg: 'h-10 w-10 text-lg'
  }), [])

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${sizeClasses[size]} p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors`}
      onClick={handleStarClick}
      disabled={loading}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent"></div>
      ) : (
        <span 
          className={`transition-colors ${
            isStarred 
              ? 'text-primary hover:text-primary/80' 
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          {isStarred ? '⭐' : '☆'}
        </span>
      )}
    </Button>
  )
})

StarButton.displayName = 'StarButton' 