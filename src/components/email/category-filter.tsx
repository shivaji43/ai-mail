"use client"

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmailCategory } from '@/types/types'

interface CategoryFilterProps {
  activeCategory: EmailCategory
  onCategoryChange: (category: EmailCategory) => void
  emailCounts: Record<EmailCategory, number>
  loading: Record<EmailCategory, boolean>
}

export function CategoryFilter({ 
  activeCategory, 
  onCategoryChange, 
  emailCounts, 
  loading 
}: CategoryFilterProps) {
  const categories: Array<{
    id: EmailCategory
    label: string
    icon: string
  }> = [
    { id: 'inbox', label: 'Inbox', icon: '📥' },
    { id: 'starred', label: 'Starred', icon: '⭐' },
    { id: 'spam', label: 'Spam', icon: '🚫' },
    { id: 'trash', label: 'Trash', icon: '🗑️' },
  ]

  return (
    <div className="flex gap-2 p-4 bg-white dark:bg-gray-800 border-b">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={activeCategory === category.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(category.id)}
          disabled={loading[category.id]}
          className="flex items-center gap-2"
        >
          <span>{category.icon}</span>
          <span>{category.label}</span>
          {emailCounts[category.id] > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">
              {emailCounts[category.id]}
            </Badge>
          )}
          {loading[category.id] && (
            <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent ml-1"></div>
          )}
        </Button>
      ))}
    </div>
  )
} 