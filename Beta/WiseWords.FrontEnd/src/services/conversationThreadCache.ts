import { Post } from '../types/conversation';

const CACHE_KEY_PREFIX = 'conversationThread_';
const METADATA_KEY = 'conversationThreadCache_metadata';
const MAX_CACHE_SIZE = 3 * 1024 * 1024; // 3 MB

interface CacheEntry {
  key: string;
  size: number;
  lastAccessed: number;
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
      console.error('Error reading cache metadata from localStorage', e);
      return {};
    }
  }

  private setMetadata(metadata: CacheMetadata): void {
    try {
      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.error('Error writing cache metadata to localStorage', e);
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
          console.error(`Error removing cache entry ${entryToRemove.key} from localStorage`, e);
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

    try {
      const item = localStorage.getItem(key);
      if (!item) {
        // Data is missing, remove from metadata
        delete metadata[key];
        this.setMetadata(metadata);
        return null;
      }

      entry.lastAccessed = Date.now();
      this.setMetadata(metadata);
      return JSON.parse(item);
    } catch (e) {
      console.error(`Error reading cache item ${key} from localStorage`, e);
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
        console.warn(`Item with key ${key} is too large to be cached.`);
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
      metadata[key] = {
        key,
        size,
        lastAccessed: Date.now(),
      };
      this.setMetadata(metadata);
    } catch (e) {
      console.error(`Error writing item ${key} to localStorage`, e);
    }
  }

  public clear(): void {
    const metadata = this.getMetadata();
    for (const key in metadata) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error(`Error removing item ${key} from localStorage during clear`, e);
      }
    }
    localStorage.removeItem(METADATA_KEY);
  }
}

export const conversationThreadCache = new ConversationThreadCache();
