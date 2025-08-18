import { CacheEntry, CacheOptions, EmailsApiResponse } from '@/types/types'

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<EmailsApiResponse>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000

  constructor() {
    if (typeof window !== 'undefined') {
      this.cleanupExpiredEntries()
    }
  }

  private getStorageKey(key: string): string {
    return `email_cache_${key}`
  }

  private isExpired(entry: CacheEntry<EmailsApiResponse>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private cleanupExpiredEntries(): void {
    if (typeof window === 'undefined') return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('email_cache_')) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}')
                         if (entry.timestamp && this.isExpired(entry)) {
               localStorage.removeItem(key)
             }
           } catch {
             localStorage.removeItem(key)
           }
        }
      })
           } catch {
       }
  }

  set(
    key: string, 
    data: EmailsApiResponse, 
    options: CacheOptions = {}
  ): void {
    const { ttl = this.DEFAULT_TTL, storage = 'memory' } = options
    
    const entry: CacheEntry<EmailsApiResponse> = {
      data,
      timestamp: Date.now(),
      ttl
    }

    this.memoryCache.set(key, entry)
    if (storage === 'localStorage' && typeof window !== 'undefined') {
              try {
          localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry))
        } catch {
        }
    } else if (storage === 'sessionStorage' && typeof window !== 'undefined') {
              try {
          sessionStorage.setItem(this.getStorageKey(key), JSON.stringify(entry))
        } catch {
        }
    }

    if (this.memoryCache.size > 100) {
      const oldestKey = Array.from(this.memoryCache.keys())[0]
      this.memoryCache.delete(oldestKey)
    }
  }

  get(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): EmailsApiResponse | null {
    const memoryEntry = this.memoryCache.get(key)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data
    }
    if (storage !== 'memory' && typeof window !== 'undefined') {
      try {
        const storageObj = storage === 'localStorage' ? localStorage : sessionStorage
        const cached = storageObj.getItem(this.getStorageKey(key))
        
        if (cached) {
          const entry: CacheEntry<EmailsApiResponse> = JSON.parse(cached)
          
          if (!this.isExpired(entry)) {
            this.memoryCache.set(key, entry)
            return entry.data
          } else {
            storageObj.removeItem(this.getStorageKey(key))
          }
        }
      } catch {
      }
    }

    return null
  }

  has(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): boolean {
    return this.get(key, storage) !== null
  }

  delete(key: string): void {
    this.memoryCache.delete(key)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(key))
        sessionStorage.removeItem(this.getStorageKey(key))
              } catch {
        }
      }
  }

  clear(): void {
    this.memoryCache.clear()
    if (typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('email_cache_')) {
            localStorage.removeItem(key)
          }
        })

        const sessionKeys = Object.keys(sessionStorage)
        sessionKeys.forEach(key => {
          if (key.startsWith('email_cache_')) {
            sessionStorage.removeItem(key)
          }
        })
              } catch {
        }
      }
  }

  getStats(): {
    memorySize: number
    localStorageSize: number
    sessionStorageSize: number
  } {
    let localStorageSize = 0
    let sessionStorageSize = 0

    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('email_cache_')) {
            localStorageSize++
          }
        })

        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('email_cache_')) {
            sessionStorageSize++
          }
        })
              } catch {
        }
      }

      return {
      memorySize: this.memoryCache.size,
      localStorageSize,
      sessionStorageSize
    }
  }
}

export const emailCache = new CacheManager()
export const getCacheKey = (category: string, pageToken?: string, userId?: string): string => {
  return `${userId || 'anonymous'}:${category}:${pageToken || 'first'}`
}

export const cacheEmailList = (
  category: string, 
  data: EmailsApiResponse, 
  pageToken?: string, 
  userId?: string
): void => {
  const key = getCacheKey(category, pageToken, userId)
  // Use shorter cache TTL for inbox first page to allow new emails to appear faster
  const ttl = category === 'inbox' && !pageToken ? 30 * 1000 : 5 * 60 * 1000 // 30 seconds for inbox first page, 5 minutes for others
  
  emailCache.set(key, data, { 
    ttl,
    storage: 'localStorage'
  })
}

export const getCachedEmailList = (
  category: string, 
  pageToken?: string, 
  userId?: string
): EmailsApiResponse | null => {
  const key = getCacheKey(category, pageToken, userId)
  return emailCache.get(key, 'localStorage')
}

export const clearEmailCache = (): void => {
  emailCache.clear()
}

export const clearEmailCacheForCategory = (
  category: string, 
  userId?: string
): void => {
  // Clear memory cache for the category
  const keysToDelete: string[] = []
  emailCache['memoryCache'].forEach((_, key) => {
    if (key.includes(`${userId || 'anonymous'}:${category}:`)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach(key => emailCache.delete(key))

  // Clear localStorage cache for the category
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('email_cache_') && key.includes(`${userId || 'anonymous'}:${category}:`)) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore localStorage errors
    }
  }
} 