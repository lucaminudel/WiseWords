/**
 * Business service layer for conversation-related operations
 * Handles business logic and coordinates between API and utilities
 */

import { conversationApi } from '../api/conversationApi';
// Note: normalizeConversationId is handled in the API layer
import { CreateConversationRequest, ConversationResponse, Post } from '../types/conversation';

/**
 * High-level business service for conversation operations
 */
export class ConversationService {
    /**
     * Fetch conversations for a specific year with business logic
     */
    static async fetchConversations(year?: number): Promise<ConversationResponse[]> {
        return conversationApi.fetchConversations(year);
    }

    /**
     * Fetch conversation posts with ID normalization
     */
    static async fetchConversationPosts(conversationId: string): Promise<Post[]> {
        // ID normalization is handled in the API layer
        return conversationApi.fetchConversationPosts(conversationId);
    }

    /**
     * Create a new conversation with validation
     */
    static async createConversation(conversation: CreateConversationRequest): Promise<ConversationResponse> {
        // Add any business validation here
        return conversationApi.createConversation(conversation);
    }

    /**
     * Update an existing conversation
     */
    static async updateConversation(
        conversationId: string, 
        updates: Partial<ConversationResponse>
    ): Promise<ConversationResponse> {
        return conversationApi.updateConversation(conversationId, updates);
    }

    /**
     * Delete a conversation
     */
    static async deleteConversation(conversationId: string): Promise<void> {
        return conversationApi.deleteConversation(conversationId);
    }

    /**
     * Add a post to a conversation
     */
    static async addPost(conversationId: string, post: Partial<Post>): Promise<Post> {
        return conversationApi.addPost(conversationId, post);
    }
}