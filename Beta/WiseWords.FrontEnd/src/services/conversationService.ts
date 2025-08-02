/**
 * Business service layer for conversation-related operations
 * Handles business logic and coordinates between API and utilities
 */

import { conversationApi } from '../api/conversationApi';
// Note: normalizeConversationId is handled in the API layer
import { CreateConversationRequest, ConversationResponse, Post, AppendCommentRequest } from '../types/conversation';

import { conversationCache as conversationsCache } from './conversationCache';
import { conversationThreadCache } from '../services/conversationThreadCache';

/**
 * High-level business service for conversation operations
 */
export class ConversationService {
    /**
     * Fetch conversations for a specific year with business logic
     * @param year - Optional year filter
     * @param forceRefresh - When true, bypasses cache and fetches from API
     */
    static async fetchConversationsViaCachedAPI(year?: number, forceRefresh: boolean = false): Promise<ConversationResponse[]> {
        // If forceRefresh is false, try to get from cache first
        if (!forceRefresh) {
            const cachedConversations = conversationsCache.get();
            if (cachedConversations) {
                return cachedConversations;
            }
        }

        // Fetch from API and update cache
        const conversations = await conversationApi.fetchConversations(year);

        // Store in cache
        try {
            conversationsCache.set(conversations);
        } catch (err) {
            console.error('Failed to update conversations cache after fetching conversations:', err);
            
            // Clear cache to ensure fresh data on next load
            conversationsCache.clear();
        }

        // Return the conversations fetched from the API
        return conversations;
    }

    /**
     * Create a new conversation with validation
     * After successful creation, updates the cache with the new conversation
     */
    static async createConversationAndUpdateCache(conversation: CreateConversationRequest): Promise<ConversationResponse> {
        
        const newConversation = await conversationApi.createConversation(conversation);
        
        // Update cache with the new conversation
        const cachedConversations = conversationsCache.get();
        if (cachedConversations) {
            // Add the new conversation to the existing cache
            const updatedConversations = [newConversation, ...cachedConversations];
            try {
                conversationsCache.set(updatedConversations);
            } catch (err) {
                console.error('Failed to update conversation cache after creating new conversation:', err);
                // Clear cache to ensure fresh data on next load
                conversationsCache.clear();
            }
        } else {
            // If no cache exists, create one with just the new conversation
            conversationsCache.set([newConversation]);
        }
        
        return newConversation;
    }

    /**
     * Fetch conversation posts with ID normalization
     */
    static async fetchConversationPostsViaCachedAPI(conversationId: string, forceRefresh: boolean = false): Promise<Post[]> {
        // If forceRefresh is false, try to get from cache first
        if (!forceRefresh) {
            const cachedPosts = conversationThreadCache.get(conversationId);
            if (cachedPosts) {
                return cachedPosts;
            }
        }

        // Fetch from API and update cache
        const posts = await conversationApi.fetchConversationPosts(conversationId);

        // Store in cache
        try {
            conversationThreadCache.set(conversationId, posts);
        } catch (err) {
            console.error('Failed to update conversation posts cache after fetching a conversation thread:', err);

            // Clear cache to ensure fresh data on next load
            conversationThreadCache.clear();
        }

        // Return the posts fetched from the API
        return posts;
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
    static async appendCommentAndUpdateCache(
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

        const newComment = await conversationApi.appendComment(commentRequest);

        const conversationId: string = commentRequest.ConversationPK;

        // Update cache with the new comment
        const cachedPosts = conversationThreadCache.get(conversationId);
        const conversationData = cachedPosts?.find((item: Post) => item.SK === 'METADATA');
        let postsData = cachedPosts?.filter((item: Post) => item.SK !== 'METADATA');        
        if (!postsData) { postsData = []; }

        if (conversationData) {
            const updatedPosts = [...postsData, newComment];
            const updatedCacheData = [conversationData, ...updatedPosts];

            try {
                conversationThreadCache.set(conversationId, updatedCacheData);
            } catch (err) {
                console.error('Failed to update conversation posts cache after appending a comment:', err);
                // Clear cache to ensure fresh data on next load
                conversationThreadCache.clear();
            }
        }
        
        return newComment;
    }
}