// Simple in-memory storage for Gmail historyId tracking
// In a production app, this should be persisted in a database

const historyIdStorage = new Map<string, string>()

export function getLastHistoryId(userEmail: string): string | undefined {
  return historyIdStorage.get(userEmail)
}

export function setLastHistoryId(userEmail: string, historyId: string): void {
  historyIdStorage.set(userEmail, historyId)
}

export function hasHistoryId(userEmail: string): boolean {
  return historyIdStorage.has(userEmail)
} 