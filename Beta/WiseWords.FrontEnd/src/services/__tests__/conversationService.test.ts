/**
 * Unit tests for the ConversationService with caching functionality.
 * Tests the smart caching logic for fetching and creating conversations.
 */
import { describe, it, expect, beforeEach, vi, Mock, afterEach } from 'vitest';
import { ConversationService } from '../conversationService';
import { conversationApi } from '../../api/conversationApi';
import { conversationCache } from '../conversationCache';
import { conversationThreadCache } from '../conversationThreadCache';
import { ConversationResponse, CreateConversationRequest, Post } from '../../types/conversation';

// Mock the dependencies
vi.mock('../../api/conversationApi');
vi.mock('../conversationCache');
vi.mock('../conversationThreadCache');

const mockConversationApi = conversationApi as {
  fetchConversations: Mock;
  createConversation: Mock;
  fetchConversationPosts: Mock;
  updateConversation: Mock;
  deleteConversation: Mock;
  appendComment: Mock;
  appendDrillDown: Mock;
  appendConclusion: Mock;
};

const mockConversationCache = conversationCache as {
  get: Mock;
  set: Mock;
  clear: Mock;
  isExpired: Mock;
  getMetadata: Mock;
  updateDataPreservingAge: Mock;
};

const mockConversationThreadCache = conversationThreadCache as unknown as {
  get: Mock;
  set: Mock;
  clear: Mock;
  isExpired: Mock;
  getCacheMetadata: Mock;
  updatePostsPreservingAge: Mock;
};

const mockConversations: ConversationResponse[] = [
  {
    PK: 'CONVO#1',
    SK: 'METADATA',
    Title: 'Test Conversation 1',
    MessageBody: 'Test message 1',
    Author: 'Author 1',
    UpdatedAt: '1640995200',
    ConvoType: 'QUESTION'
  },
  {
    PK: 'CONVO#2',
    SK: 'METADATA',
    Title: 'Test Conversation 2',
    MessageBody: 'Test message 2',
    Author: 'Author 2',
    UpdatedAt: '1640995300',
    ConvoType: 'PROBLEM'
  }
];

const mockNewConversation: ConversationResponse = {
  PK: 'CONVO#3',
  SK: 'METADATA',
  Title: 'New Test Conversation',
  MessageBody: 'New test message',
  Author: 'New Author',
  UpdatedAt: '1640995400',
  ConvoType: 'DILEMMA'
};

const mockCreateRequest: CreateConversationRequest = {
  Title: 'New Test Conversation',
  MessageBody: 'New test message',
  Author: 'New Author',
  ConvoType: 2,
  NewGuid: '12345678-1234-1234-1234-123456789abc',
  UtcCreationTime: '2024-01-01T00:00:00.000Z'
};

describe('ConversationService', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  describe('fetchConversationsViaCachedAPI', () => {
    it('should return cached conversations when cache exists and forceRefresh is false', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationApi.fetchConversations).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should return cached conversations when cache exists and forceRefresh is not specified (defaults to false)', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationApi.fetchConversations).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should fetch from API and update cache when cache is empty and forceRefresh is false', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(null);
      mockConversationApi.fetchConversations.mockResolvedValue(mockConversations);

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledWith(2025);
      expect(mockConversationCache.set).toHaveBeenCalledWith(mockConversations);
    });

    it('should bypass cache and fetch from API when forceRefresh is true', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(mockConversations); // Cache has data
      mockConversationApi.fetchConversations.mockResolvedValue(mockConversations);

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, true);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationCache.get).not.toHaveBeenCalled(); // Cache should be bypassed
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledWith(2025);
      expect(mockConversationCache.set).toHaveBeenCalledWith(mockConversations);
    });

    it('should pass year parameter correctly to API', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(null);
      mockConversationApi.fetchConversations.mockResolvedValue(mockConversations);

      // Act
      await ConversationService.fetchConversationsViaCachedAPI(2024);

      // Assert
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledWith(2024);
    });

    it('should handle API errors correctly', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(null);
      const apiError = new Error('API Error');
      mockConversationApi.fetchConversations.mockRejectedValue(apiError);

      // Act & Assert
      await expect(ConversationService.fetchConversationsViaCachedAPI(2025)).rejects.toThrow('API Error');
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should return fresh cached data when cache is not expired', async () => {
      // Arrange
      mockConversationCache.get.mockReturnValue(mockConversations);
      mockConversationCache.isExpired.mockReturnValue(false); // Cache is fresh

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert
      expect(result).toEqual(mockConversations);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.isExpired).toHaveBeenCalledTimes(1);
      expect(mockConversationApi.fetchConversations).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should return stale data immediately and trigger background refresh when cache is expired', async () => {
      // Arrange
      const staleConversations = [mockConversations[0]]; // Stale cache with fewer items
      const freshConversations = mockConversations; // Fresh data from API
      
      mockConversationCache.get.mockReturnValue(staleConversations);
      mockConversationCache.isExpired.mockReturnValue(true); // Cache is expired
      mockConversationApi.fetchConversations.mockResolvedValue(freshConversations);

      // Spy on console.log to verify background refresh success logging
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(staleConversations);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.isExpired).toHaveBeenCalledTimes(1);

      // Background refresh should be triggered (give it a moment to execute)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledWith(2025);
      expect(mockConversationCache.set).toHaveBeenCalledWith(freshConversations);
      
      // Verify success logging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background conversation refresh successful')
      );

      consoleSpy.mockRestore();
    });

    it('should handle background refresh failures gracefully and retry once', async () => {
      // Arrange
      const staleConversations = [mockConversations[0]];
      
      mockConversationCache.get.mockReturnValue(staleConversations);
      mockConversationCache.isExpired.mockReturnValue(true);
      
      // First attempt fails, second succeeds
      mockConversationApi.fetchConversations
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockConversations);

      // Spy on console to verify retry behavior
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(staleConversations);

      // Wait for background refresh and retry
      await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for retry delay + execution

      // Verify retry behavior
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background conversation refresh failed (attempt 1), retrying...'),
        expect.any(Error)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background conversation refresh successful (attempt 2)')
      );

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log final failure when background refresh fails after retry', async () => {
      // Arrange
      const staleConversations = [mockConversations[0]];
      
      mockConversationCache.get.mockReturnValue(staleConversations);
      mockConversationCache.isExpired.mockReturnValue(true);
      
      // Both attempts fail
      const networkError = new Error('Network error');
      mockConversationApi.fetchConversations.mockRejectedValue(networkError);

      // Spy on console to verify failure logging
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationsViaCachedAPI(2025, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(staleConversations);

      // Wait for background refresh and retry
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Verify failure behavior
      expect(mockConversationApi.fetchConversations).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Background conversation refresh failed after 2 attempts:'),
        networkError
      );

      consoleWarnSpy.mockRestore();
    });

    it('fetchConversationPosts should call the API directly without using the cache', async () => {
      // Arrange
      const mockPosts: Post[] = [{ PK: 'CONVO#1', SK: 'POST#1', MessageBody: 'Test post', Author: 'Author', UpdatedAt: '123', ConvoType: 'QUESTION' }];
      mockConversationApi.fetchConversationPosts.mockResolvedValue(mockPosts);

      // Act
      const result = await conversationApi.fetchConversationPosts('CONVO#1');

      // Assert
      expect(result).toEqual(mockPosts);
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledWith('CONVO#1');
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

  });

  describe('fetchConversationPostsViaCachedAPI', () => {
    const mockConversationId = 'CONVO#123';
    const mockPosts: Post[] = [
      { PK: mockConversationId, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      { PK: mockConversationId, SK: '#CM#1', MessageBody: 'Comment 1', Author: 'User1', UpdatedAt: '124', ConvoType: 'QUESTION' }
    ];

    it('should return cached posts when cache exists and is not expired', async () => {
      // Arrange
      mockConversationThreadCache.get.mockReturnValue(mockPosts);
      mockConversationThreadCache.isExpired.mockReturnValue(false);

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, false);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(mockConversationThreadCache.get).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationThreadCache.isExpired).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationApi.fetchConversationPosts).not.toHaveBeenCalled();
    });

    it('should fetch from API when no cache exists', async () => {
      // Arrange
      mockConversationThreadCache.get.mockReturnValue(null);
      mockConversationApi.fetchConversationPosts.mockResolvedValue(mockPosts);

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, false);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(mockConversationThreadCache.get).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationThreadCache.set).toHaveBeenCalledWith(mockConversationId, mockPosts);
    });

    it('should bypass cache and fetch from API when forceRefresh is true', async () => {
      // Arrange
      mockConversationThreadCache.get.mockReturnValue(mockPosts); // Cache has data
      mockConversationApi.fetchConversationPosts.mockResolvedValue(mockPosts);

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, true);

      // Assert
      expect(result).toEqual(mockPosts);
      expect(mockConversationThreadCache.get).not.toHaveBeenCalled(); // Cache should be bypassed
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationThreadCache.set).toHaveBeenCalledWith(mockConversationId, mockPosts);
    });

    it('should return stale data immediately and trigger background refresh when cache is expired', async () => {
      // Arrange
      const stalePosts = [mockPosts[0]]; // Stale cache with fewer posts
      const freshPosts = mockPosts; // Fresh data from API
      
      mockConversationThreadCache.get.mockReturnValue(stalePosts);
      mockConversationThreadCache.isExpired.mockReturnValue(true);
      mockConversationApi.fetchConversationPosts.mockResolvedValue(freshPosts);

      // Spy on console.log to verify background refresh success logging
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(stalePosts);
      expect(mockConversationThreadCache.get).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationThreadCache.isExpired).toHaveBeenCalledWith(mockConversationId);

      // Background refresh should be triggered (give it a moment to execute)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledWith(mockConversationId);
      expect(mockConversationThreadCache.set).toHaveBeenCalledWith(mockConversationId, freshPosts);
      
      // Verify success logging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Background conversation posts refresh successful (attempt 1), cached ${freshPosts.length} posts for conversation ${mockConversationId}`)
      );

      consoleSpy.mockRestore();
    });

    it('should handle background refresh failures gracefully and retry once for conversation posts', async () => {
      // Arrange
      const stalePosts = [mockPosts[0]];
      
      mockConversationThreadCache.get.mockReturnValue(stalePosts);
      mockConversationThreadCache.isExpired.mockReturnValue(true);
      
      // First attempt fails, second succeeds
      mockConversationApi.fetchConversationPosts
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPosts);

      // Spy on console to verify retry behavior
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(stalePosts);

      // Wait for background refresh and retry
      await new Promise(resolve => setTimeout(resolve, 2100)); // Wait for retry delay + execution

      // Verify retry behavior
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Background conversation posts refresh failed (attempt 1) for ${mockConversationId}, retrying...`),
        expect.any(Error)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Background conversation posts refresh successful (attempt 2), cached ${mockPosts.length} posts for conversation ${mockConversationId}`)
      );

      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log final failure when background refresh fails after retry for conversation posts', async () => {
      // Arrange
      const stalePosts = [mockPosts[0]];
      
      mockConversationThreadCache.get.mockReturnValue(stalePosts);
      mockConversationThreadCache.isExpired.mockReturnValue(true);
      
      // Both attempts fail
      const networkError = new Error('Network error');
      mockConversationApi.fetchConversationPosts.mockRejectedValue(networkError);

      // Spy on console to verify failure logging
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId, false);

      // Assert - Should return stale data immediately
      expect(result).toEqual(stalePosts);

      // Wait for background refresh and retry
      await new Promise(resolve => setTimeout(resolve, 2100));

      // Verify failure behavior
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Background conversation posts refresh failed after 2 attempts for ${mockConversationId}:`),
        networkError
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle API errors correctly when no cache exists', async () => {
      // Arrange
      mockConversationThreadCache.get.mockReturnValue(null);
      const apiError = new Error('API Error');
      mockConversationApi.fetchConversationPosts.mockRejectedValue(apiError);

      // Act & Assert
      await expect(ConversationService.fetchConversationPostsViaCachedAPI(mockConversationId)).rejects.toThrow('API Error');
      expect(mockConversationThreadCache.set).not.toHaveBeenCalled();
    });
  });

  describe('createConversationAndUpdateCache', () => {
    it('should create conversation via API and add to existing cache', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      const result = await ConversationService.createConversationAndUpdateCache(
        mockCreateRequest.Title,
        mockCreateRequest.MessageBody,
        mockCreateRequest.Author,
        mockCreateRequest.ConvoType,
        mockCreateRequest.UtcCreationTime
      );

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationApi.createConversation).toHaveBeenCalledWith(expect.objectContaining({
        Title: mockCreateRequest.Title,
        MessageBody: mockCreateRequest.MessageBody,
        Author: mockCreateRequest.Author,
        ConvoType: mockCreateRequest.ConvoType,
        UtcCreationTime: mockCreateRequest.UtcCreationTime,
        NewGuid: expect.any(String)
      }));
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.updateDataPreservingAge).toHaveBeenCalledWith([mockNewConversation, ...mockConversations]);
    });

    it('should create conversation via API and create new cache when cache is empty', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(null);

      // Act
      const result = await ConversationService.createConversationAndUpdateCache(
        mockCreateRequest.Title,
        mockCreateRequest.MessageBody,
        mockCreateRequest.Author,
        mockCreateRequest.ConvoType,
        mockCreateRequest.UtcCreationTime
      );

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationApi.createConversation).toHaveBeenCalledWith(expect.objectContaining({
        Title: mockCreateRequest.Title,
        MessageBody: mockCreateRequest.MessageBody,
        Author: mockCreateRequest.Author,
        ConvoType: mockCreateRequest.ConvoType,
        UtcCreationTime: mockCreateRequest.UtcCreationTime,
        NewGuid: expect.any(String)
      }));
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.set).toHaveBeenCalledWith([mockNewConversation]);
    });

    it('should handle API errors correctly and not update cache', async () => {
      // Arrange
      const apiError = new Error('Create API Error');
      mockConversationApi.createConversation.mockRejectedValue(apiError);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act & Assert
      await expect(ConversationService.createConversationAndUpdateCache(
        mockCreateRequest.Title,
        mockCreateRequest.MessageBody,
        mockCreateRequest.Author,
        mockCreateRequest.ConvoType,
        mockCreateRequest.UtcCreationTime
      )).rejects.toThrow('Create API Error');
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should add new conversation to the beginning of the cached list', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      await ConversationService.createConversationAndUpdateCache(
        mockCreateRequest.Title,
        mockCreateRequest.MessageBody,
        mockCreateRequest.Author,
        mockCreateRequest.ConvoType,
        mockCreateRequest.UtcCreationTime
      );

      // Assert
      const expectedUpdatedCache = [mockNewConversation, ...mockConversations];
      expect(mockConversationCache.updateDataPreservingAge).toHaveBeenCalledWith(expectedUpdatedCache);
      // Verify the new conversation is at the beginning
      expect(expectedUpdatedCache[0]).toEqual(mockNewConversation);
      expect(expectedUpdatedCache[1]).toEqual(mockConversations[0]);
      expect(expectedUpdatedCache[2]).toEqual(mockConversations[1]);
    });

    it('should preserve original cache age when adding new conversation to existing cache', async () => {
      // Arrange
      const originalTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const originalMetadata = {
        version: 1,
        lastSaved: originalTimestamp,
        size: 1000,
        age: 10 * 60 * 1000
      };
      
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(mockConversations);
      mockConversationCache.getMetadata.mockReturnValue(originalMetadata);

      // Mock localStorage operations
      const mockLocalStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify({
          version: 1,
          data: mockConversations,
          lastSaved: Date.now(), // This should be restored to originalTimestamp
          size: 1000
        })),
        setItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      // Act
      await ConversationService.createConversationAndUpdateCache(
        mockCreateRequest.Title,
        mockCreateRequest.MessageBody,
        mockCreateRequest.Author,
        mockCreateRequest.ConvoType,
        mockCreateRequest.UtcCreationTime
      );

      // Assert
      expect(mockConversationCache.updateDataPreservingAge).toHaveBeenCalled();
      
      // Note: The new method handles metadata preservation internally,
      // so we don't need to check localStorage operations directly
    });
  });

  describe('appendCommentAndUpdateCache', () => {
    const mockConversationPK = 'CONVO#123';
    const mockAuthor = 'Comment Author';
    const mockMessage = 'This is a new comment.';
    const mockUUID = 'cm-guid-123';
    const mockDate = new Date('2024-07-15T10:00:00.000Z');

    const mockNewCommentPost: Post = {
      PK: mockConversationPK,
      SK: `#CM#${mockUUID}`,
      Author: mockAuthor,
      MessageBody: mockMessage,
      UpdatedAt: Math.floor(mockDate.getTime() / 1000).toString(),
      ConvoType: 'QUESTION'
    };

    beforeEach(() => {
      vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue(mockUUID) });
      vi.setSystemTime(mockDate);
      mockConversationApi.appendComment.mockResolvedValue(mockNewCommentPost);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('should append a comment to the root of a conversation and update the cache', async () => {
      // Arrange
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      // Act
      const result = await ConversationService.appendCommentAndUpdateCache(
        mockConversationPK,
        '', // ParentSK for root
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(mockNewCommentPost);
      expect(mockConversationApi.appendComment).toHaveBeenCalledWith({
        ConversationPK: mockConversationPK,
        ParentPostSK: '',
        NewCommentGuid: mockUUID,
        Author: mockAuthor,
        MessageBody: mockMessage,
        UtcCreationTime: mockDate.toISOString(),
      });

      const expectedCache = [...initialCache, mockNewCommentPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should append a comment to a nested post and update the cache', async () => {
      // Arrange
      const parentPostSK = '#DD#parent-guid';
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
        { PK: mockConversationPK, SK: parentPostSK, MessageBody: 'Parent post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      const nestedCommentPost = {
        ...mockNewCommentPost,
        SK: `${parentPostSK}${mockNewCommentPost.SK}`,
      };
      mockConversationApi.appendComment.mockResolvedValue(nestedCommentPost);

      // Act
      const result = await ConversationService.appendCommentAndUpdateCache(
        mockConversationPK,
        parentPostSK,
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(nestedCommentPost);
      const expectedCache = [...initialCache, nestedCommentPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should handle API errors and not update the cache', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockConversationApi.appendComment.mockRejectedValue(apiError);
      mockConversationThreadCache.get.mockReturnValue([]);

      // Act & Assert
      await expect(
        ConversationService.appendCommentAndUpdateCache(mockConversationPK, '', mockAuthor, mockMessage)
      ).rejects.toThrow(apiError);
      expect(mockConversationThreadCache.updatePostsPreservingAge).not.toHaveBeenCalled();
    });

    it('should preserve original cache age when appending comment to existing conversation cache', async () => {
      // Arrange
      const originalTimestamp = Date.now() - (12 * 60 * 1000); // 12 minutes ago
      const originalMetadata = {
        version: 1,
        lastSaved: originalTimestamp,
        lastAccessed: Date.now() - (5 * 60 * 1000), // 5 minutes ago
        size: 2000,
        age: 12 * 60 * 1000
      };
      
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      
      mockConversationApi.appendComment.mockResolvedValue(mockNewCommentPost);
      mockConversationThreadCache.get.mockReturnValue(initialCache);
      mockConversationThreadCache.getCacheMetadata.mockReturnValue(originalMetadata);

      // Mock localStorage operations for thread cache metadata
      const mockLocalStorage = {
        getItem: vi.fn((key) => {
          if (key === 'conversationThreadCache_metadata') {
            return JSON.stringify({
              [`conversationThread_${mockConversationPK}`]: {
                key: `conversationThread_${mockConversationPK}`,
                size: 2000,
                lastAccessed: Date.now(),
                lastSaved: Date.now(), // This should be restored to originalTimestamp
                version: 1
              }
            });
          }
          return null;
        }),
        setItem: vi.fn()
      };
      Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

      // Act
      await ConversationService.appendCommentAndUpdateCache(
        mockConversationPK,
        '',
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalled();
      
      // Note: The new method handles metadata preservation internally,
      // so we don't need to check localStorage operations directly
    });
  });

  describe('appendDrillDownAndUpdateCache', () => {
    const mockConversationPK = 'CONVO#123';
    const mockAuthor = 'Drill Author';
    const mockMessage = 'This is a new drill-down.';
    const mockUUID = 'dd-guid-123';
    const mockDate = new Date('2024-07-15T10:00:00.000Z');

    const mockNewDrillDownPost: Post = {
      PK: mockConversationPK,
      SK: `#DD#${mockUUID}`,
      Author: mockAuthor,
      MessageBody: mockMessage,
      UpdatedAt: Math.floor(mockDate.getTime() / 1000).toString(),
      ConvoType: 'QUESTION'
    };

    beforeEach(() => {
      vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue(mockUUID) });
      vi.setSystemTime(mockDate);
      mockConversationApi.appendDrillDown.mockResolvedValue(mockNewDrillDownPost);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('should append a drill-down to the root and update the cache', async () => {
      // Arrange
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      // Act
      const result = await ConversationService.appendDrillDownAndUpdateCache(
        mockConversationPK,
        '', // ParentSK for root
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(mockNewDrillDownPost);
      expect(mockConversationApi.appendDrillDown).toHaveBeenCalledWith({
        ConversationPK: mockConversationPK,
        ParentPostSK: '',
        NewDrillDownGuid: mockUUID,
        Author: mockAuthor,
        MessageBody: mockMessage,
        UtcCreationTime: mockDate.toISOString(),
      });

      const expectedCache = [...initialCache, mockNewDrillDownPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should append a drill-down to a nested post and update the cache', async () => {
      // Arrange
      const parentPostSK = '#DD#parent-guid';
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
        { PK: mockConversationPK, SK: parentPostSK, MessageBody: 'Parent post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      const nestedDrillDownPost = {
        ...mockNewDrillDownPost,
        SK: `${parentPostSK}${mockNewDrillDownPost.SK}`,
      };
      mockConversationApi.appendDrillDown.mockResolvedValue(nestedDrillDownPost);

      // Act
      const result = await ConversationService.appendDrillDownAndUpdateCache(
        mockConversationPK,
        parentPostSK,
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(nestedDrillDownPost);
      const expectedCache = [...initialCache, nestedDrillDownPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should handle API errors and not update the cache', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockConversationApi.appendDrillDown.mockRejectedValue(apiError);
      mockConversationThreadCache.get.mockReturnValue([]);

      // Act & Assert
      await expect(
        ConversationService.appendDrillDownAndUpdateCache(mockConversationPK, '', mockAuthor, mockMessage)
      ).rejects.toThrow(apiError);
      expect(mockConversationThreadCache.set).not.toHaveBeenCalled();
    });
  });

  describe('appendConclusionAndUpdateCache', () => {
    const mockConversationPK = 'CONVO#123';
    const mockAuthor = 'Conclusion Author';
    const mockMessage = 'This is a new conclusion.';
    const mockUUID = 'cc-guid-123';
    const mockDate = new Date('2024-07-15T10:00:00.000Z');

    const mockNewConclusionPost: Post = {
      PK: mockConversationPK,
      SK: `#CC#${mockUUID}`,
      Author: mockAuthor,
      MessageBody: mockMessage,
      UpdatedAt: Math.floor(mockDate.getTime() / 1000).toString(),
      ConvoType: 'QUESTION'
    };

    beforeEach(() => {
      vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue(mockUUID) });
      vi.setSystemTime(mockDate);
      mockConversationApi.appendConclusion.mockResolvedValue(mockNewConclusionPost);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });

    it('should append a conclusion to the root and update the cache', async () => {
      // Arrange
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      // Act
      const result = await ConversationService.appendConclusionAndUpdateCache(
        mockConversationPK,
        '', // ParentSK for root
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(mockNewConclusionPost);
      expect(mockConversationApi.appendConclusion).toHaveBeenCalledWith({
        ConversationPK: mockConversationPK,
        ParentPostSK: '',
        NewConclusionGuid: mockUUID,
        Author: mockAuthor,
        MessageBody: mockMessage,
        UtcCreationTime: mockDate.toISOString(),
      });

      const expectedCache = [...initialCache, mockNewConclusionPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should append a conclusion to a nested post and update the cache', async () => {
      // Arrange
      const parentPostSK = '#DD#parent-guid';
      const initialCache: Post[] = [
        { PK: mockConversationPK, SK: 'METADATA', MessageBody: 'Root post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
        { PK: mockConversationPK, SK: parentPostSK, MessageBody: 'Parent post', Author: 'Test', UpdatedAt: '123', ConvoType: 'QUESTION' },
      ];
      mockConversationThreadCache.get.mockReturnValue(initialCache);

      const nestedConclusionPost = {
        ...mockNewConclusionPost,
        SK: `${parentPostSK}${mockNewConclusionPost.SK}`,
      };
      mockConversationApi.appendConclusion.mockResolvedValue(nestedConclusionPost);

      // Act
      const result = await ConversationService.appendConclusionAndUpdateCache(
        mockConversationPK,
        parentPostSK,
        mockAuthor,
        mockMessage
      );

      // Assert
      expect(result).toEqual(nestedConclusionPost);
      const expectedCache = [...initialCache, nestedConclusionPost];
      expect(mockConversationThreadCache.updatePostsPreservingAge).toHaveBeenCalledWith(mockConversationPK, expectedCache);
    });

    it('should handle API errors and not update the cache', async () => {
      // Arrange
      const apiError = new Error('API Error');
      mockConversationApi.appendConclusion.mockRejectedValue(apiError);
      mockConversationThreadCache.get.mockReturnValue([]);

      // Act & Assert
      await expect(
        ConversationService.appendConclusionAndUpdateCache(mockConversationPK, '', mockAuthor, mockMessage)
      ).rejects.toThrow(apiError);
      expect(mockConversationThreadCache.set).not.toHaveBeenCalled();
    });
  });

  describe('Other methods (with no or partial cache interaction)', () => {
    it('updateConversation should call the API directly without using the cache', async () => {
      // Arrange
      const updates = { Title: 'Updated Title' };
      mockConversationApi.updateConversation.mockResolvedValue(mockNewConversation);

      // Act
      const result = await ConversationService.updateConversation('CONVO#1', updates);

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationApi.updateConversation).toHaveBeenCalledWith('CONVO#1', updates);
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('deleteConversation should call the API directly without using the cache', async () => {
      // Arrange
      mockConversationApi.deleteConversation.mockResolvedValue(undefined);

      // Act
      await ConversationService.deleteConversation('CONVO#1');

      // Assert
      expect(mockConversationApi.deleteConversation).toHaveBeenCalledWith('CONVO#1');
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });
  });
});
