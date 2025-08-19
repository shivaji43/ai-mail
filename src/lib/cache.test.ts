/**
 * Tests for cache utilities.
 * Testing framework: Vitest (expect, describe, it, vi). If the project uses Jest, this is compatible with minimal changes
 * (replace vi with jest and import from '@jest/globals').
 */

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

// Attempt to import the cache implementation. Adjust path if repository differs.
import {
  emailCache,
  getCacheKey,
  cacheEmailList,
  getCachedEmailList,
  clearEmailCache,
  clearEmailCacheForCategory,
  updateCachesOnStarChange,
} from './cache'

// Types used by the code under test
type EmailMessage = {
  id: string
  isStarred?: boolean
  labelIds?: string[]
  [k: string]: any
}
type EmailsApiResponse = {
  messages: EmailMessage[]
  nextPageToken?: string | null
  [k: string]: any
}

declare global {
  // provide window for TypeScript
  // eslint-disable-next-line no-var
  var window: any
}

// Simple in-memory mock for Storage
class StorageMock implements Storage {
  private store = new Map<string, string>()
  get length(): number { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, value) }
  // Helper to enumerate keys like Object.keys(localStorage)
  keys(): string[] { return Array.from(this.store.keys()) }
}

const makeResponse = (messages: EmailMessage[] = [], extra: Record<string, any> = {}): EmailsApiResponse => ({
  messages,
  ...extra,
})

const now = Date.now

beforeEach(() => {
  // Mock Date.now to control TTL behavior
  let fakeNow = 1_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => fakeNow)
  // helper to advance time within tests
  ;(global as any).__advanceTime = (ms: number) => { fakeNow += ms }

  // Setup browser-like globals
  ;(globalThis as any).window = {}
  ;(globalThis as any).localStorage = new StorageMock()
  ;(globalThis as any).sessionStorage = new StorageMock()

  // Clear cache before each test (public API)
  clearEmailCache()
})

afterEach(() => {
  vi.restoreAllMocks()
  // Cleanup globals
  delete (globalThis as any).window
  delete (globalThis as any).localStorage
  delete (globalThis as any).sessionStorage
  // reset Date.now
  Date.now = now
})

describe('getCacheKey', () => {
  it('builds key with user, category and pageToken', () => {
    expect(getCacheKey('inbox', undefined, 'u1')).toBe('u1:inbox:first')
    expect(getCacheKey('inbox', 't2', 'u2')).toBe('u2:inbox:t2')
  })

  it('defaults user to anonymous and pageToken to first', () => {
    expect(getCacheKey('starred')).toBe('anonymous:starred:first')
  })
})

describe('CacheManager via public wrappers', () => {
  it('cacheEmailList sets shorter TTL for inbox first page and stores in localStorage', () => {
    const resp = makeResponse([{ id: 'm1' }])
    cacheEmailList('inbox', resp, undefined, 'userA')

    const key = getCacheKey('inbox', undefined, 'userA') // userA:inbox:first
    // Should be retrievable from localStorage path through getCachedEmailList
    const out = getCachedEmailList('inbox', undefined, 'userA')
    expect(out).toEqual(resp)

    // It also populates memory cache; get again should still match
    const out2 = getCachedEmailList('inbox', undefined, 'userA')
    expect(out2).toEqual(resp)

    // Inspect that localStorage contains the entry under email_cache_* key
    const keys = (globalThis as any).localStorage.keys() as string[]
    const hasEmailCacheKey = keys.some(k => k.startsWith('email_cache_') && k.includes(key))
    expect(hasEmailCacheKey).toBe(true)
  })

  it('uses default TTL for non-inbox or paginated pages', () => {
    const resp1 = makeResponse([{ id: 'mA' }])
    cacheEmailList('starred', resp1, undefined, 'u1')

    const resp2 = makeResponse([{ id: 'mB' }])
    cacheEmailList('inbox', resp2, 'page2', 'u1') // paginated inbox should use long TTL

    expect(getCachedEmailList('starred', undefined, 'u1')).toEqual(resp1)
    expect(getCachedEmailList('inbox', 'page2', 'u1')).toEqual(resp2)
  })

  it('respects TTL expiration for inbox short TTL (30s)', () => {
    const resp = makeResponse([{ id: 'm1' }])
    cacheEmailList('inbox', resp, undefined, 'uX')

    // Fresh
    expect(getCachedEmailList('inbox', undefined, 'uX')).toEqual(resp)

    // Advance beyond 30s
    ;(global as any).__advanceTime(31_000)
    expect(getCachedEmailList('inbox', undefined, 'uX')).toBeNull()
  })

  it('respects TTL expiration for long TTL (5 minutes)', () => {
    const resp = makeResponse([{ id: 'm1' }])
    cacheEmailList('starred', resp, undefined, 'uY')

    expect(getCachedEmailList('starred', undefined, 'uY')).toEqual(resp)
    ;(global as any).__advanceTime(4 * 60 * 1000 + 59_000) // < 5 minutes
    expect(getCachedEmailList('starred', undefined, 'uY')).toEqual(resp)
    ;(global as any).__advanceTime(2_000) // cross 5 minutes
    expect(getCachedEmailList('starred', undefined, 'uY')).toBeNull()
  })

  it('clearEmailCache removes all email_cache_* entries from storages and memory', () => {
    cacheEmailList('inbox', makeResponse([{ id: 'a' }]), undefined, 'u1')
    cacheEmailList('starred', makeResponse([{ id: 'b' }]), undefined, 'u2')

    expect(getCachedEmailList('inbox', undefined, 'u1')).not.toBeNull()
    expect(getCachedEmailList('starred', undefined, 'u2')).not.toBeNull()

    clearEmailCache()

    expect(getCachedEmailList('inbox', undefined, 'u1')).toBeNull()
    expect(getCachedEmailList('starred', undefined, 'u2')).toBeNull()

    // Storage keys cleared
    const lsKeys = (globalThis as any).localStorage.keys() as string[]
    const ssKeys = (globalThis as any).sessionStorage.keys() as string[]
    expect(lsKeys.some((k: string) => k.startsWith('email_cache_'))).toBe(false)
    expect(ssKeys.some((k: string) => k.startsWith('email_cache_'))).toBe(false)
  })

  it('clearEmailCacheForCategory only removes entries for the category and user', () => {
    const u1Inbox = makeResponse([{ id: 'i1' }])
    const u1Starred = makeResponse([{ id: 's1' }])
    const u2Inbox = makeResponse([{ id: 'i2' }])

    cacheEmailList('inbox', u1Inbox, undefined, 'u1')
    cacheEmailList('starred', u1Starred, undefined, 'u1')
    cacheEmailList('inbox', u2Inbox, undefined, 'u2')

    expect(getCachedEmailList('inbox', undefined, 'u1')).toEqual(u1Inbox)
    expect(getCachedEmailList('starred', undefined, 'u1')).toEqual(u1Starred)
    expect(getCachedEmailList('inbox', undefined, 'u2')).toEqual(u2Inbox)

    clearEmailCacheForCategory('inbox', 'u1')

    expect(getCachedEmailList('inbox', undefined, 'u1')).toBeNull()     // removed
    expect(getCachedEmailList('starred', undefined, 'u1')).toEqual(u1Starred) // untouched
    expect(getCachedEmailList('inbox', undefined, 'u2')).toEqual(u2Inbox)     // untouched
  })
})

describe('Storage modes and eviction', () => {
  it('reads from sessionStorage when requested', () => {
    const resp = makeResponse([{ id: 'sess' }])
    const key = getCacheKey('inbox', 'p1', 'uS')

    // Directly set via emailCache.set to sessionStorage
    // TTL 5m for non-first inbox page
    emailCache.set(key, resp as any, { ttl: 5 * 60 * 1000, storage: 'sessionStorage' })

    const out = emailCache.get(key, 'sessionStorage')
    expect(out).toEqual(resp)
  })

  it('evicts oldest memory entry once more than 100 are stored', () => {
    // Fill memory cache with 101 entries
    for (let i = 0; i < 101; i++) {
      const key = `anonymous:cat:${i}`
      emailCache.set(key, makeResponse([{ id: `m${i}` }]) as any, { ttl: 5 * 60 * 1000, storage: 'memory' })
    }
    // After insertion, the first key should have been evicted
    const first = emailCache.get('anonymous:cat:0', 'memory')
    const last = emailCache.get('anonymous:cat:100', 'memory')
    expect(first).toBeNull()
    expect(last).not.toBeNull()
  })
})

describe('updateCachesOnStarChange', () => {
  it('on starring: removes from inbox and adds/updates in starred (ensure STARRED label and isStarred true)', () => {
    const email: EmailMessage = { id: 'e1', isStarred: false, labelIds: ['INBOX'] }
    const inboxBefore = makeResponse([{ id: 'e1', isStarred: false, labelIds: ['INBOX'] }, { id: 'other' }])
    const starredBefore = makeResponse([{ id: 's0', isStarred: true, labelIds: ['STARRED'] }])

    // Seed caches
    cacheEmailList('inbox', inboxBefore, undefined, 'u1')
    cacheEmailList('starred', starredBefore, undefined, 'u1')

    // Act
    updateCachesOnStarChange(email, true, 'u1')

    // Assert: removed from inbox
    const inboxAfter = getCachedEmailList('inbox', undefined, 'u1')!
    expect(inboxAfter.messages.some(m => m.id === 'e1')).toBe(false)

    // Assert: added/updated at top in starred
    const starredAfter = getCachedEmailList('starred', undefined, 'u1')!
    expect(starredAfter.messages[0].id).toBe('e1')
    expect(starredAfter.messages[0].isStarred).toBe(true)
    expect(starredAfter.messages[0].labelIds?.includes('STARRED')).toBe(true)
  })

  it('on unstarring: removes from starred and prepends to inbox only if email has INBOX label', () => {
    const email: EmailMessage = { id: 'e2', isStarred: true, labelIds: ['INBOX', 'STARRED'] }
    const inboxBefore = makeResponse([{ id: 'i0' }])
    const starredBefore = makeResponse([{ id: 'e2', isStarred: true, labelIds: ['STARRED'] }, { id: 's0' }])

    cacheEmailList('inbox', inboxBefore, undefined, 'u2')
    cacheEmailList('starred', starredBefore, undefined, 'u2')

    updateCachesOnStarChange(email, false, 'u2')

    const starredAfter = getCachedEmailList('starred', undefined, 'u2')!
    expect(starredAfter.messages.some(m => m.id === 'e2')).toBe(false)

    const inboxAfter = getCachedEmailList('inbox', undefined, 'u2')!
    expect(inboxAfter.messages[0].id).toBe('e2')
    expect(inboxAfter.messages[0].isStarred).toBe(false)
    expect(inboxAfter.messages[0].labelIds?.includes('STARRED')).toBe(false)
  })

  it('on unstarring: does not add to inbox if missing INBOX label', () => {
    const email: EmailMessage = { id: 'e3', isStarred: true, labelIds: ['STARRED'] }
    const inboxBefore = makeResponse([{ id: 'i1' }])
    const starredBefore = makeResponse([{ id: 'e3', isStarred: true, labelIds: ['STARRED'] }])

    cacheEmailList('inbox', inboxBefore, undefined, 'u3')
    cacheEmailList('starred', starredBefore, undefined, 'u3')

    updateCachesOnStarChange(email, false, 'u3')

    const starredAfter = getCachedEmailList('starred', undefined, 'u3')!
    expect(starredAfter.messages.some(m => m.id === 'e3')).toBe(false)

    const inboxAfter = getCachedEmailList('inbox', undefined, 'u3')!
    expect(inboxAfter.messages.some(m => m.id === 'e3')).toBe(false)
  })

  it('is resilient to errors (best-effort try/catch)', () => {
    const email: EmailMessage = { id: 'boom', labelIds: ['INBOX'] }
    const resp = makeResponse([{ id: 'x' }])
    cacheEmailList('inbox', resp, undefined, 'u4')
    cacheEmailList('starred', resp, undefined, 'u4')

    // Force getCachedEmailList to throw during update
    const spy = vi.spyOn(require('./cache'), 'getCachedEmailList').mockImplementation(() => {
      throw new Error('fail')
    })
    // Should not throw
    expect(() => updateCachesOnStarChange(email, true, 'u4')).not.toThrow()
    spy.mockRestore()
  })
})

describe('Robustness to storage errors', () => {
  it('ignores storage set errors gracefully', () => {
    const original = (globalThis as any).localStorage.setItem.bind((globalThis as any).localStorage)
    ;(globalThis as any).localStorage.setItem = vi.fn(() => { throw new Error('quota exceeded') })

    const resp = makeResponse([{ id: 'm' }])
    cacheEmailList('starred', resp, undefined, 'usr')

    // Should still have memory cache path available immediately after set()
    const key = getCacheKey('starred', undefined, 'usr')
    const viaMemory = (require('./cache').emailCache as any).get(key, 'memory')
    expect(viaMemory).toEqual(resp)

    // Restore
    ;(globalThis as any).localStorage.setItem = original
  })

  it('cleanupExpiredEntries prunes invalid or expired entries in localStorage on construction (window defined)', async () => {
    // Insert a malformed entry
    const badKey = 'email_cache_bad'
    ;(globalThis as any).localStorage.setItem(badKey, '{ not json')

    // Insert an expired entry
    const expiredKey = 'email_cache_exp'
    const expiredEntry = JSON.stringify({ data: { x: 1 }, timestamp: Date.now() - (10 * 60 * 1000), ttl: 1000 })
    ;(globalThis as any).localStorage.setItem(expiredKey, expiredEntry)

    // Re-import module to force constructor call and cleanup
    const modPath = './cache'
    // Clear from module cache to re-run side effects
    // @ts-ignore
    const resolved = await import(modPath)
    // Expect cleanup removed both keys
    const lsKeys = (globalThis as any).localStorage.keys() as string[]
    expect(lsKeys.includes(badKey)).toBe(false)
    expect(lsKeys.includes(expiredKey)).toBe(false)

    // Access exported emailCache to avoid TS unused errors
    expect(resolved.emailCache).toBeDefined()
  })
})