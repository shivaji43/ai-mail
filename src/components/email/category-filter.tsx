"use client"

import { memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryFilterProps, CategoryDefinition, EmailCategory } from '@/types/types'

export const CategoryFilter = memo(function CategoryFilter({ 
  activeCategory, 
  onCategoryChange, 
  emailCounts, 
  loading,
  isSearchMode = false
}: CategoryFilterProps) {
  const categories: CategoryDefinition[] = useMemo(() => {
    const baseCategories: CategoryDefinition[] = [
      { id: 'inbox' as EmailCategory, label: 'Inbox', icon: '📥' },
      { id: 'starred' as EmailCategory, label: 'Starred', icon: '⭐' },
      { id: 'spam' as EmailCategory, label: 'Spam', icon: '🚫' },
      { id: 'trash' as EmailCategory, label: 'Trash', icon: '🗑️' },
    ]
    
    if (isSearchMode) {
      baseCategories.push({ id: 'search' as EmailCategory, label: 'Search Results', icon: '🔍' })
    }
    
    return baseCategories
  }, [isSearchMode])

  return (
    <div className="flex gap-2 p-4 bg-card border-b-4 border-gray-800 dark:border-gray-200">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={activeCategory === category.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(category.id)}
          disabled={loading[category.id]}
          className="flex items-center gap-1 relative border-2"
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
})

CategoryFilter.displayName = 'CategoryFilter' 