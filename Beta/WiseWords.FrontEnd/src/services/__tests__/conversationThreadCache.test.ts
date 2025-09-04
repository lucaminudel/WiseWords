import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { conversationThreadCache } from '../conversationThreadCache';
import { Post } from '../../types/conversation';

const mockPost = (id: string, message: string): Post => ({
  PK: `CONVO#${id}`,
  SK: 'METADATA',
  MessageBody: message,
  Author: 'Tester',
  UpdatedAt: Date.now().toString(),
  Title: `Title for ${id}`,
  ConvoType: 'QUESTION',
});

describe('conversationThreadCache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should set and get an item correctly', () => {
    const conversationId = 'convo1';
    const data = [mockPost(conversationId, 'Hello World')];
    
    conversationThreadCache.set(conversationId, data);
    const cachedData = conversationThreadCache.get(conversationId);

    expect(cachedData).toEqual(data);
  });

  it('should return null for a non-existent item', () => {
    const cachedData = conversationThreadCache.get('non-existent');
    expect(cachedData).toBeNull();
  });

  it('should update lastAccessed timestamp when an item is accessed', () => {
    const conversationId = 'convo1';
    const data = [mockPost(conversationId, 'Some data')];
    
    // Set initial item at time 1000
    vi.setSystemTime(new Date('2025-01-01T00:00:01.000Z'));
    conversationThreadCache.set(conversationId, data);

    // Mock a future time
    vi.setSystemTime(new Date('2025-01-01T00:00:02.000Z'));

    // Access the item
    conversationThreadCache.get(conversationId);

    // Check metadata directly (for testing purposes)
    const metadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
    expect(metadata[`conversationThread_${conversationId}`].lastAccessed).toBe(new Date('2025-01-01T00:00:02.000Z').getTime());
  });

  it('should clear the cache completely', () => {
    conversationThreadCache.set('convo1', [mockPost('1', 'data1')]);
    conversationThreadCache.set('convo2', [mockPost('2', 'data2')]);

    conversationThreadCache.clear();

    expect(localStorage.getItem('conversationThreadCache_metadata')).toBeNull();
    expect(localStorage.getItem('conversationThread_convo1')).toBeNull();
    expect(localStorage.getItem('conversationThread_convo2')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('should not cache an item larger than the max cache size', () => {
    const largeString = 'a'.repeat(4 * 1024 * 1024); // 4 MB string
    const data = [mockPost('largeConvo', largeString)];
    
    conversationThreadCache.set('largeConvo', data);
    
    const cachedData = conversationThreadCache.get('largeConvo');
    expect(cachedData).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('should evict the least recently used item when cache is full', () => {
    // For this test, we can't redefine the constant, so we'll work with the real one
    // and create data that strategically fills it.
    const largeData = (id: string) => [mockPost(id, 'a'.repeat(1.2 * 1024 * 1024))]; // 1.2 MB
    
    const data1 = largeData('1');
    const data2 = largeData('2');
    const data3 = largeData('3');

    // 1. Fill the cache with two items (~2.4 MB)
    vi.setSystemTime(new Date('2025-01-01T00:00:01.000Z'));
    conversationThreadCache.set('convo1', data1);
    
    vi.setSystemTime(new Date('2025-01-01T00:00:02.000Z'));
    conversationThreadCache.set('convo2', data2);

    // At this point, cache has convo1 and convo2.
    expect(conversationThreadCache.get('convo1')).not.toBeNull();
    expect(conversationThreadCache.get('convo2')).not.toBeNull();

    // 2. Access convo1 to make it the most recently used
    vi.setSystemTime(new Date('2025-01-01T00:00:03.000Z'));
    conversationThreadCache.get('convo1');

    // 3. Add a new item that will force eviction of convo2
    vi.setSystemTime(new Date('2025-01-01T00:00:04.000Z'));
    conversationThreadCache.set('convo3', data3);

    // convo2 should be evicted as it's the least recently used
    expect(conversationThreadCache.get('convo1')).not.toBeNull();
    expect(conversationThreadCache.get('convo3')).not.toBeNull();
    expect(conversationThreadCache.get('convo2')).toBeNull();
  });

  it('should handle getting an item when its data is missing but metadata exists', () => {
    const conversationId = 'convo1';
    const key = `conversationThread_${conversationId}`;
    const metadata = {
      [key]: { key, size: 100, lastAccessed: Date.now(), lastSaved: Date.now(), version: 1 }
    };
    localStorage.setItem('conversationThreadCache_metadata', JSON.stringify(metadata));
    // Intentionally do not set the item data in localStorage

    const cachedData = conversationThreadCache.get(conversationId);
    expect(cachedData).toBeNull();

    // It should also clean up the stale metadata entry
    const updatedMetadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
    expect(updatedMetadata[key]).toBeUndefined();
  });

  // New tests for Points 2-3: versioning, timestamps, and expiry
  describe('versioning and expiry (Points 2-3)', () => {
    it('should return null and clean up cache when version is different', () => {
      const conversationId = 'convo1';
      const data = [mockPost(conversationId, 'Version test')];
      
      // Set data with current version
      conversationThreadCache.set(conversationId, data);
      
      // Manually update metadata to have old version
      const key = `conversationThread_${conversationId}`;
      const metadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
      metadata[key].version = 0; // Old version
      localStorage.setItem('conversationThreadCache_metadata', JSON.stringify(metadata));
      
      // Should return null and clean up
      const result = conversationThreadCache.get(conversationId);
      expect(result).toBeNull();
      
      // Verify cleanup
      const updatedMetadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
      expect(updatedMetadata[key]).toBeUndefined();
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should track lastSaved timestamp when setting data', () => {
      const conversationId = 'convo1';
      const data = [mockPost(conversationId, 'Timestamp test')];
      const beforeTime = Date.now();
      
      conversationThreadCache.set(conversationId, data);
      
      const metadata = conversationThreadCache.getCacheMetadata(conversationId);
      expect(metadata).not.toBeNull();
      expect(metadata!.lastSaved).toBeGreaterThanOrEqual(beforeTime);
      expect(metadata!.version).toBe(1);
    });

    it('should check if cache is expired correctly', () => {
      const conversationId = 'convo1';
      const data = [mockPost(conversationId, 'Expiry test')];
      
      // Set fresh cache
      conversationThreadCache.set(conversationId, data);
      expect(conversationThreadCache.isExpired(conversationId)).toBe(false);
      
      // Manually set old lastSaved timestamp (older than 30 minutes)
      const key = `conversationThread_${conversationId}`;
      const metadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
      metadata[key].lastSaved = Date.now() - (35 * 60 * 1000); // 35 minutes ago
      localStorage.setItem('conversationThreadCache_metadata', JSON.stringify(metadata));
      
      expect(conversationThreadCache.isExpired(conversationId)).toBe(true);
    });

    it('should return false for isExpired when conversation is not cached', () => {
      expect(conversationThreadCache.isExpired('non-existent')).toBe(false);
    });

    it('should return cache metadata for existing conversation', () => {
      const conversationId = 'convo1';
      const data = [mockPost(conversationId, 'Metadata test')];
      
      conversationThreadCache.set(conversationId, data);
      
      const metadata = conversationThreadCache.getCacheMetadata(conversationId);
      expect(metadata).not.toBeNull();
      expect(metadata!.version).toBe(1);
      expect(metadata!.size).toBeGreaterThan(0);
      expect(metadata!.age).toBeGreaterThanOrEqual(0);
      expect(metadata!.lastSaved).toBeCloseTo(Date.now(), -2); // Within 100ms
      expect(metadata!.lastAccessed).toBeCloseTo(Date.now(), -2);
    });

    it('should return null metadata for non-existent conversation', () => {
      const metadata = conversationThreadCache.getCacheMetadata('non-existent');
      expect(metadata).toBeNull();
    });

    it('should return cache statistics', () => {
      // Empty cache
      let stats = conversationThreadCache.getCacheStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
      
      // Add some conversations
      const data1 = [mockPost('1', 'Test 1')];
      const data2 = [mockPost('2', 'Test 2')];
      
      vi.setSystemTime(new Date('2025-01-01T00:00:01.000Z'));
      conversationThreadCache.set('convo1', data1);
      
      vi.setSystemTime(new Date('2025-01-01T00:00:02.000Z'));
      conversationThreadCache.set('convo2', data2);
      
      stats = conversationThreadCache.getCacheStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBe(new Date('2025-01-01T00:00:01.000Z').getTime());
      expect(stats.newestEntry).toBe(new Date('2025-01-01T00:00:02.000Z').getTime());
    });
  });
});