"use client"

import { memo, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { StarButtonProps } from '@/types/types'

export const StarButton = memo(function StarButton({ emailId, isStarred, onStarChange, size = 'sm' }: StarButtonProps) {
  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onStarChange(emailId, !isStarred)
  }, [emailId, isStarred, onStarChange])

  const sizeClasses = useMemo(() => ({
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }), [])

  const iconSizeClasses = useMemo(() => ({
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }), [])

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${sizeClasses[size]} p-1 border-2 border-transparent hover:border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors rounded-full`}
      onClick={handleStarClick}
      title={isStarred ? "Remove star" : "Add star"}
    >
      <svg
        className={`${iconSizeClasses[size]} transition-colors ${
          isStarred 
            ? 'text-yellow-500 fill-current hover:text-yellow-600' 
            : 'text-muted-foreground hover:text-yellow-500'
        }`}
        fill={isStarred ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </Button>
  )
})

StarButton.displayName = 'StarButton' 