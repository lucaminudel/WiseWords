/**
 * Unit tests for the conversationCache service.
 * Mocks localStorage to test the caching logic in isolation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationCache } from '../conversationCache';
import { ConversationResponse } from '../../types/conversation';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockConversations: ConversationResponse[] = [
  { PK: 'CONVO#1', SK: 'METADATA', Title: 'Test 1', MessageBody: 'Test message 1', Author: 'Author 1', UpdatedAt: '12345', ConvoType: 'QUESTION' },
  { PK: 'CONVO#2', SK: 'METADATA', Title: 'Test 2', MessageBody: 'Test message 2', Author: 'Author 2', UpdatedAt: '12346', ConvoType: 'PROBLEM' },
];

describe('conversationCache', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    localStorage.clear();
  });

  it('should return null when cache is empty', () => {
    expect(conversationCache.get()).toBeNull();
  });

  it('should set and get the conversation list', () => {
    conversationCache.set(mockConversations);
    const cached = conversationCache.get();
    expect(cached).toEqual(mockConversations);
  });

  it('should clear the cache', () => {
    conversationCache.set(mockConversations);
    expect(conversationCache.get()).not.toBeNull(); // Ensure it's set first
    conversationCache.clear();
    expect(conversationCache.get()).toBeNull();
  });

  it('should return null if JSON parsing fails', () => {
    // Manually set invalid JSON
    localStorage.setItem('conversationListCache', 'invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(conversationCache.get()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should return null if cache version is different', () => {
    // Set cache with old version
    const oldVersionEntry = {
      version: 0, // Different from current version (1)
      data: mockConversations,
      lastSaved: Date.now(),
      size: 100
    };
    localStorage.setItem('conversationListCache', JSON.stringify(oldVersionEntry));
    
    // Should return null and clean up old cache
    expect(conversationCache.get()).toBeNull();
    expect(localStorage.getItem('conversationListCache')).toBeNull();
  });

  it('should check if cache is expired', () => {
    // Set cache that's not expired
    conversationCache.set(mockConversations);
    expect(conversationCache.isExpired()).toBe(false);
    
    // Mock an expired cache
    const expiredEntry = {
      version: 1,
      data: mockConversations,
      lastSaved: Date.now() - (20 * 60 * 1000), // 20 minutes ago (older than 15 min limit)
      size: 100
    };
    localStorage.setItem('conversationListCache', JSON.stringify(expiredEntry));
    expect(conversationCache.isExpired()).toBe(true);
  });

  it('should return cache metadata', () => {
    conversationCache.set(mockConversations);
    const metadata = conversationCache.getMetadata();
    
    expect(metadata).not.toBeNull();
    expect(metadata?.version).toBe(1);
    expect(metadata?.size).toBeGreaterThan(0);
    expect(metadata?.age).toBeGreaterThanOrEqual(0);
    expect(metadata?.lastSaved).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should return null metadata when cache is empty', () => {
    expect(conversationCache.getMetadata()).toBeNull();
  });
});
