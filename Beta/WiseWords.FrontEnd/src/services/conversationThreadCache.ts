import { Post } from '../types/conversation';

const CACHE_KEY_PREFIX = 'conversationThread_';
const METADATA_KEY = 'conversationThreadCache_metadata';
const MAX_CACHE_SIZE = 3 * 1024 * 1024; // 3 MB
const CACHE_VERSION = 1; // Point 3: Version control
const MAX_LIFETIME = 15 * 60 * 1000; // Point 3: 15 minutes lifetime (same as conversations list)

interface CacheEntry {
  key: string;
  size: number;
  lastAccessed: number;
  lastSaved: number; // Point 2: When cache was last saved/refreshed
  version: number;   // Point 3: Cache version for clean invalidation
}

interface CacheMetadata {
  [key: string]: CacheEntry;
}

class ConversationThreadCache {
  private getMetadata(): CacheMetadata {
    try {
      const metadata = localStorage.getItem(METADATA_KEY);
      return metadata ? JSON.parse(metadata) : {};
    } catch (e) {
      return {};
    }
  }

  private setMetadata(metadata: CacheMetadata): void {
    try {
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (e) {
    }
  }

  private getCacheKey(conversationId: string): string {
    return `${CACHE_KEY_PREFIX}${conversationId}`;
  }

  private evict(metadata: CacheMetadata, requiredSpace: number): CacheMetadata {
    let currentSize = Object.values(metadata).reduce((acc, entry) => acc + entry.size, 0);
    if (currentSize + requiredSpace <= MAX_CACHE_SIZE) {
      return metadata;
    }

    const sortedEntries = Object.values(metadata).sort((a, b) => a.lastAccessed - b.lastAccessed);

    while (currentSize + requiredSpace > MAX_CACHE_SIZE && sortedEntries.length > 0) {
      const entryToRemove = sortedEntries.shift();
      if (entryToRemove) {
        try {
          localStorage.removeItem(entryToRemove.key);
          currentSize -= entryToRemove.size;
          delete metadata[entryToRemove.key];
        } catch (e) {
        }
      }
    }
    return metadata;
  }

  public get(conversationId: string): Post[] | null {
    const metadata = this.getMetadata();
    const key = this.getCacheKey(conversationId);
    const entry = metadata[key];

    if (!entry) {
      return null;
    }

    // Point 3: Check version - if different, delete and return null
    if (entry.version !== CACHE_VERSION) {
      try {
        localStorage.removeItem(key);
        delete metadata[key];
        this.setMetadata(metadata);
      } catch (e) {
        // Ignore cleanup errors
      }
      return null;
    }

    try {
      const item = localStorage.getItem(key);
      if (!item) {
        // Data is missing, remove from metadata
        delete metadata[key];
        this.setMetadata(metadata);
        return null;
      }

      // Update last accessed time for LRU
      entry.lastAccessed = Date.now();
      this.setMetadata(metadata);
      return JSON.parse(item);
    } catch (e) {
      // Clean up corrupted cache entry
      delete metadata[key];
      this.setMetadata(metadata);
      try {
        localStorage.removeItem(key);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  public set(conversationId: string, data: Post[]): void {
    const key = this.getCacheKey(conversationId);
    let metadata = this.getMetadata();

    try {
      const dataString = JSON.stringify(data);
      const size = new TextEncoder().encode(dataString).length;

      // If item is larger than the entire cache, don't cache it.
      if (size > MAX_CACHE_SIZE) {
        // Ensure it's not already in cache
        if (metadata[key]) {
            localStorage.removeItem(key);
            delete metadata[key];
            this.setMetadata(metadata);
        }
        return;
      }

      metadata = this.evict(metadata, size);

      localStorage.setItem(key, dataString);
      const now = Date.now();
      metadata[key] = {
        key,
        size,
        lastAccessed: now,
        lastSaved: now,      // Point 2: Track when cache was saved
        version: CACHE_VERSION, // Point 3: Store current version
      };
      this.setMetadata(metadata);
    } catch (e) {
    }
  }

  public clear(): void {
    const metadata = this.getMetadata();
    for (const key in metadata) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
      }
    }
    localStorage.removeItem(METADATA_KEY);
  }

  /**
   * Checks if a specific conversation's cache has expired.
   * @param conversationId - The conversation ID to check
   * @returns {boolean} True if cache exists and has expired
   */
  public isExpired(conversationId: string): boolean {
    try {
      const metadata = this.getMetadata();
      const key = this.getCacheKey(conversationId);
      const entry = metadata[key];

      if (!entry) {
        return false; // No cache means not expired
      }

      // Check version first
      if (entry.version !== CACHE_VERSION) {
        return true; // Different version is considered expired
      }

      return (Date.now() - entry.lastSaved) > MAX_LIFETIME;
    } catch (error) {
      return true; // Treat corrupted cache as expired
    }
  }

  /**
   * Gets cache metadata for a specific conversation for debugging/monitoring.
   * @param conversationId - The conversation ID to get metadata for
   * @returns {object | null} Cache metadata or null if no cache
   */
  public getCacheMetadata(conversationId: string): { 
    version: number; 
    lastSaved: number; 
    lastAccessed: number; 
    size: number; 
    age: number 
  } | null {
    try {
      const metadata = this.getMetadata();
      const key = this.getCacheKey(conversationId);
      const entry = metadata[key];

      if (!entry) {
        return null;
      }

      return {
        version: entry.version,
        lastSaved: entry.lastSaved,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
        age: Date.now() - entry.lastSaved
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Gets overall cache statistics for debugging/monitoring.
   * @returns {object} Cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    try {
      const metadata = this.getMetadata();
      const entries = Object.values(metadata);

      if (entries.length === 0) {
        return {
          totalEntries: 0,
          totalSize: 0,
          oldestEntry: null,
          newestEntry: null
        };
      }

      const totalSize = entries.reduce((acc, entry) => acc + entry.size, 0);
      const lastSavedTimes = entries.map(entry => entry.lastSaved);

      return {
        totalEntries: entries.length,
        totalSize,
        oldestEntry: Math.min(...lastSavedTimes),
        newestEntry: Math.max(...lastSavedTimes)
      };
    } catch (error) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }
}

export const conversationThreadCache = new ConversationThreadCache();
