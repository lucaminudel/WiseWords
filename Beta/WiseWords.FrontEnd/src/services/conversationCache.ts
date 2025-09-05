/**
 * A caching service using localStorage to persist the conversation list
 * across browser sessions with version control and expiry tracking.
 */
import { ConversationResponse } from '../types/conversation';

const CACHE_KEY = 'conversationListCache';
const CACHE_VERSION = 1;
const MAX_LIFETIME = 15 * 60 * 1000; // 15 minutes

interface CacheEntry {
  version: number;
  data: ConversationResponse[];
  lastSaved: number;
  size: number;
}

export const conversationCache = {
  /**
   * Retrieves the cached list of conversations.
   * @returns {ConversationResponse[] | null} The cached data or null if not found or expired.
   */
  get: (): ConversationResponse[] | null => {
    try {
      const cachedEntry = localStorage.getItem(CACHE_KEY);
      if (cachedEntry) {
        const entry: CacheEntry = JSON.parse(cachedEntry);
        
        // Check version - if different, delete and return null
        if (entry.version !== CACHE_VERSION) {
          localStorage.removeItem(CACHE_KEY);
          return null;
        }
        
        return entry.data;
      }
      return null;
    } catch (error) {
      console.error('Error parsing conversation cache:', error);
      // Clean up corrupted cache
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  },

  /**
   * Stores the conversation list in the cache with timestamp and version.
   * @param {ConversationResponse[]} conversations - The list of conversations to cache.
   */
  set: (conversations: ConversationResponse[]): void => {
    try {
      const dataString = JSON.stringify(conversations);
      const entry: CacheEntry = {
        version: CACHE_VERSION,
        data: conversations,
        lastSaved: Date.now(),
        size: new TextEncoder().encode(dataString).length
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
      console.error('Error saving conversation cache:', error);
    }
  },

  /**
   * Clears the conversation list from the cache.
   */
  clear: (): void => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (error) {
    }
  },

  /**
   * Checks if the cached data has expired.
   * @returns {boolean} True if cache exists and has expired.
   */
  isExpired: (): boolean => {
    try {
      const cachedEntry = localStorage.getItem(CACHE_KEY);
      if (cachedEntry) {
        const entry: CacheEntry = JSON.parse(cachedEntry);
        
        // Check version first
        if (entry.version !== CACHE_VERSION) {
          return true;
        }
        
        return (Date.now() - entry.lastSaved) > MAX_LIFETIME;
      }
      return false; // No cache means not expired
    } catch (error) {
      return true; // Treat corrupted cache as expired
    }
  },

  /**
   * Gets cache metadata for debugging/monitoring.
   * @returns {object | null} Cache metadata or null if no cache.
   */
  getMetadata: (): { version: number; lastSaved: number; size: number; age: number } | null => {
    try {
      const cachedEntry = localStorage.getItem(CACHE_KEY);
      if (cachedEntry) {
        const entry: CacheEntry = JSON.parse(cachedEntry);
        return {
          version: entry.version,
          lastSaved: entry.lastSaved,
          size: entry.size,
          age: Date.now() - entry.lastSaved
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Updates cache data while preserving the original lastSaved timestamp.
   * This prevents new content from artificially "freshening" old cache data.
   * @param {ConversationResponse[]} conversations - The updated conversation list
   */
  updateDataPreservingAge: (conversations: ConversationResponse[]): void => {
    try {
      // Get original metadata before updating
      const originalMetadata = conversationCache.getMetadata();
      
      // Update cache with new data (this will set a new timestamp)
      conversationCache.set(conversations);
      
      // Restore original timestamp if we had cached data before
      if (originalMetadata) {
        conversationCache._restoreOriginalTimestamp(originalMetadata.lastSaved, originalMetadata.version);
      }
    } catch (error) {
      console.error('Error updating conversation cache while preserving age:', error);
      // Fallback to regular set if preservation fails
      conversationCache.set(conversations);
    }
  },

  /**
   * Private helper to restore the original lastSaved timestamp
   * @param {number} originalLastSaved - The original timestamp to restore
   * @param {number} originalVersion - The original version to verify compatibility
   */
  _restoreOriginalTimestamp: (originalLastSaved: number, originalVersion: number): void => {
    try {
      const currentEntry = localStorage.getItem(CACHE_KEY);
      if (currentEntry) {
        const entry: CacheEntry = JSON.parse(currentEntry);
        
        // Only restore if versions match (ensure we're modifying the right data)
        if (entry.version === originalVersion) {
          entry.lastSaved = originalLastSaved;
          localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
        }
      }
    } catch (error) {
      console.warn('Failed to restore original cache timestamp:', error);
      // Don't throw - this is a non-critical optimization
    }
  }
};
