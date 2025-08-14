"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface StarButtonProps {
  emailId: string
  isStarred: boolean
  onStarChange: (emailId: string, starred: boolean) => void
  size?: 'sm' | 'md' | 'lg'
}

export function StarButton({ emailId, isStarred, onStarChange, size = 'sm' }: StarButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleStarClick = async (e: React.MouseEvent) => {
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
    } catch (error) {
      // Silently fail - don't crash the app
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'h-6 w-6 text-sm',
    md: 'h-8 w-8 text-base',
    lg: 'h-10 w-10 text-lg'
  }

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
              ? 'text-yellow-500 hover:text-yellow-600' 
              : 'text-gray-400 hover:text-yellow-500'
          }`}
        >
          {isStarred ? '⭐' : '☆'}
        </span>
      )}
    </Button>
  )
} 