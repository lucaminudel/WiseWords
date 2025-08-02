/**
 * Unit tests for the ConversationService with caching functionality.
 * Tests the smart caching logic for fetching and creating conversations.
 */
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ConversationService } from '../conversationService';
import { conversationApi } from '../../api/conversationApi';
import { conversationCache } from '../conversationCache';
import { ConversationResponse, CreateConversationRequest } from '../../types/conversation';

// Mock the dependencies
vi.mock('../../api/conversationApi');
vi.mock('../conversationCache');

const mockConversationApi = conversationApi as {
  fetchConversations: Mock;
  createConversation: Mock;
  fetchConversationPosts: Mock;
  updateConversation: Mock;
  deleteConversation: Mock;
  appendComment: Mock;
};

const mockConversationCache = conversationCache as {
  get: Mock;
  set: Mock;
  clear: Mock;
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

  describe('fetchConversations', () => {
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
  });

  describe('createConversation', () => {
    it('should create conversation via API and add to existing cache', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      const result = await ConversationService.createConversationAndUpdateCache(mockCreateRequest);

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationApi.createConversation).toHaveBeenCalledWith(mockCreateRequest);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.set).toHaveBeenCalledWith([mockNewConversation, ...mockConversations]);
    });

    it('should create conversation via API and create new cache when cache is empty', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(null);

      // Act
      const result = await ConversationService.createConversationAndUpdateCache(mockCreateRequest);

      // Assert
      expect(result).toEqual(mockNewConversation);
      expect(mockConversationApi.createConversation).toHaveBeenCalledWith(mockCreateRequest);
      expect(mockConversationCache.get).toHaveBeenCalledTimes(1);
      expect(mockConversationCache.set).toHaveBeenCalledWith([mockNewConversation]);
    });

    it('should handle API errors correctly and not update cache', async () => {
      // Arrange
      const apiError = new Error('Create API Error');
      mockConversationApi.createConversation.mockRejectedValue(apiError);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act & Assert
      await expect(ConversationService.createConversationAndUpdateCache(mockCreateRequest)).rejects.toThrow('Create API Error');
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should add new conversation to the beginning of the cached list', async () => {
      // Arrange
      mockConversationApi.createConversation.mockResolvedValue(mockNewConversation);
      mockConversationCache.get.mockReturnValue(mockConversations);

      // Act
      await ConversationService.createConversationAndUpdateCache(mockCreateRequest);

      // Assert
      const expectedUpdatedCache = [mockNewConversation, ...mockConversations];
      expect(mockConversationCache.set).toHaveBeenCalledWith(expectedUpdatedCache);
      // Verify the new conversation is at the beginning
      expect(expectedUpdatedCache[0]).toEqual(mockNewConversation);
      expect(expectedUpdatedCache[1]).toEqual(mockConversations[0]);
      expect(expectedUpdatedCache[2]).toEqual(mockConversations[1]);
    });
  });

  describe('other methods (non-cached)', () => {
    it('should call API directly for fetchConversationPosts', async () => {
      // Arrange
      const mockPosts = [{ PK: 'CONVO#1', SK: 'POST#1', MessageBody: 'Test post', Author: 'Author', UpdatedAt: '123', ConvoType: 'QUESTION' }];
      mockConversationApi.fetchConversationPosts.mockResolvedValue(mockPosts);

      // Act
      const result = await ConversationService.fetchConversationPostsViaCachedAPI('CONVO#1');

      // Assert
      expect(result).toEqual(mockPosts);
      expect(mockConversationApi.fetchConversationPosts).toHaveBeenCalledWith('CONVO#1');
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should call API directly for updateConversation', async () => {
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

    it('should call API directly for deleteConversation', async () => {
      // Arrange
      mockConversationApi.deleteConversation.mockResolvedValue(undefined);

      // Act
      await ConversationService.deleteConversation('CONVO#1');

      // Assert
      expect(mockConversationApi.deleteConversation).toHaveBeenCalledWith('CONVO#1');
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
    });

    it('should call API directly for appendComment', async () => {
      // Arrange
      const mockCreatedPost = { PK: 'CONVO#1', SK: '#CM#1', MessageBody: 'New comment', Author: 'Author', UpdatedAt: '123', ConvoType: 'QUESTION' };
      mockConversationApi.appendComment.mockResolvedValue(mockCreatedPost);
      
      // Mock crypto.randomUUID to return a predictable value
      const mockUUID = '12345678-1234-1234-1234-123456789abc';
      vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue(mockUUID) });
      
      // Mock Date to return a predictable ISO string
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      vi.setSystemTime(mockDate);

      // Act
      const result = await ConversationService.appendCommentAndUpdateCache('CONVO#1', '', 'Author', 'New comment');

      // Assert
      expect(result).toEqual(mockCreatedPost);
      expect(mockConversationApi.appendComment).toHaveBeenCalledWith({
        ConversationPK: 'CONVO#1',
        ParentPostSK: '',
        NewCommentGuid: mockUUID,
        Author: 'Author',
        MessageBody: 'New comment',
        UtcCreationTime: '2024-01-01T00:00:00.000Z'
      });
      expect(mockConversationCache.get).not.toHaveBeenCalled();
      expect(mockConversationCache.set).not.toHaveBeenCalled();
      
      // Cleanup
      vi.unstubAllGlobals();
      vi.useRealTimers();
    });
  });
});