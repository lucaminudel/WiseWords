/**
 * Unit tests for the conversationCache service.
 * Mocks sessionStorage to test the caching logic in isolation.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationCache } from '../conversationCache';
import { ConversationResponse } from '../../types/conversation';

// Mock sessionStorage
const sessionStorageMock = (() => {
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

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

const mockConversations: ConversationResponse[] = [
  { PK: 'CONVO#1', SK: 'METADATA', Title: 'Test 1', MessageBody: 'Test message 1', Author: 'Author 1', UpdatedAt: '12345', ConvoType: 'QUESTION' },
  { PK: 'CONVO#2', SK: 'METADATA', Title: 'Test 2', MessageBody: 'Test message 2', Author: 'Author 2', UpdatedAt: '12346', ConvoType: 'PROBLEM' },
];

describe('conversationCache', () => {
  beforeEach(() => {
    // Clear the mock storage before each test
    sessionStorage.clear();
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
    sessionStorage.setItem('conversationListCache', 'invalid-json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(conversationCache.get()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
