"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebounced } from '@/hooks/useDebounced'
import { EmailSearchProps } from '@/types/types'

export function EmailSearch({ 
  onSearch, 
  onClear, 
  placeholder = "Search emails...", 
  isSearching = false,
  searchQuery = "",
  enableAutoSearch = true,
  autoSearchDelay = 800
}: EmailSearchProps) {
  const [query, setQuery] = useState(searchQuery)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounced(query, autoSearchDelay)

  useEffect(() => {
    setQuery(searchQuery)
  }, [searchQuery])

  // Auto-search with debouncing
  useEffect(() => {
    if (enableAutoSearch && debouncedQuery.trim() && debouncedQuery !== searchQuery) {
      onSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, enableAutoSearch, searchQuery, onSearch])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }, [query, onSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    onClear()
    inputRef.current?.focus()
  }, [onClear])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear()
    }
  }, [handleClear])

  return (
    <form onSubmit={handleSubmit} className="flex items-center space-x-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 border-2"
          disabled={isSearching}
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            disabled={isSearching}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Button 
        type="submit" 
        disabled={!query.trim() || isSearching}
        variant="outline"
        size="sm"
        className="border-2"
      >
        {isSearching ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : (
          "Search"
        )}
      </Button>
    </form>
  )
}