/**
 * Business service layer for conversation-related operations
 * Handles business logic and coordinates between API and utilities
 */

import { conversationApi } from '../api/conversationApi';
import { conversationCache } from './conversationCache';
// Note: normalizeConversationId is handled in the API layer
import { CreateConversationRequest, ConversationResponse, Post, AppendCommentRequest } from '../types/conversation';

/**
 * High-level business service for conversation operations
 */
export class ConversationService {
    /**
     * Fetch conversations for a specific year with business logic
     * @param year - Optional year filter
     * @param forceRefresh - When true, bypasses cache and fetches from API
     */
    static async fetchConversations(year?: number, forceRefresh: boolean = false): Promise<ConversationResponse[]> {
        // If forceRefresh is false, try to get from cache first
        if (!forceRefresh) {
            const cachedConversations = conversationCache.get();
            if (cachedConversations) {
                return cachedConversations;
            }
        }

        // Fetch from API and update cache
        const conversations = await conversationApi.fetchConversations(year);
        conversationCache.set(conversations);
        return conversations;
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
     * After successful creation, updates the cache with the new conversation
     */
    static async createConversation(conversation: CreateConversationRequest): Promise<ConversationResponse> {
        // Add any business validation here
        const newConversation = await conversationApi.createConversation(conversation);
        
        // Update cache with the new conversation
        const cachedConversations = conversationCache.get();
        if (cachedConversations) {
            // Add the new conversation to the existing cache
            const updatedConversations = [newConversation, ...cachedConversations];
            try {
                conversationCache.set(updatedConversations);
            } catch (err) {
                console.error('Failed to update conversation cache after creating new conversation:', err);
                // Clear cache to ensure fresh data on next load
                conversationCache.clear();
            }
        } else {
            // If no cache exists, create one with just the new conversation
            conversationCache.set([newConversation]);
        }
        
        return newConversation;
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
     * Append a comment to a conversation
     */
    static async appendComment(
        conversationPK: string,
        parentPostSK: string,
        author: string,
        messageBody: string
    ): Promise<Post> {
        const commentRequest: AppendCommentRequest = {
            ConversationPK: conversationPK,
            ParentPostSK: parentPostSK,
            NewCommentGuid: crypto.randomUUID(),
            Author: author,
            MessageBody: messageBody,
            UtcCreationTime: new Date().toISOString()
        };
        
        return conversationApi.appendComment(commentRequest);
    }
}