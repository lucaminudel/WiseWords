/**
 * A simple caching service using sessionStorage to persist the conversation list
 * across page loads within the same browser tab.
 */
import { ConversationResponse } from '../types/conversation';

const CACHE_KEY = 'conversationListCache';

export const conversationCache = {
  /**
   * Retrieves the cached list of conversations.
   * @returns {ConversationResponse[] | null} The cached data or null if not found.
   */
  get: (): ConversationResponse[] | null => {
    try {
      const cachedData = sessionStorage.getItem(CACHE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData) as ConversationResponse[];
      }
      return null;
    } catch (error) {
      console.error('Error getting conversation cache:', error);
      return null;
    }
  },

  /**
   * Stores the conversation list in the cache.
   * @param {ConversationResponse[]} conversations - The list of conversations to cache.
   */
  set: (conversations: ConversationResponse[]): void => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error setting conversation cache:', error);
    }
  },

  /**
   * Clears the conversation list from the cache.
   */
  clear: (): void => {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Error clearing conversation cache:', error);
    }
  },
};
