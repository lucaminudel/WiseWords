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
      [key]: { key, size: 100, lastAccessed: Date.now() }
    };
    localStorage.setItem('conversationThreadCache_metadata', JSON.stringify(metadata));
    // Intentionally do not set the item data in localStorage

    const cachedData = conversationThreadCache.get(conversationId);
    expect(cachedData).toBeNull();

    // It should also clean up the stale metadata entry
    const updatedMetadata = JSON.parse(localStorage.getItem('conversationThreadCache_metadata') || '{}');
    expect(updatedMetadata[key]).toBeUndefined();
  });
});