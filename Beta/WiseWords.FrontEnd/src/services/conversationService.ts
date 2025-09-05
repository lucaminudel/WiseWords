/**
 * Business service layer for conversation-related operations
 * Handles business logic and coordinates between API and utilities
 */

import { conversationApi } from '../api/conversationApi';
// Note: normalizeConversationId is handled in the API layer
import { CreateConversationRequest, ConversationResponse, Post, AppendCommentRequest, AppendDrillDownRequest, AppendConclusionRequest, AppendPostRequest} from '../types/conversation';

import { conversationCache as conversationsCache } from './conversationCache';
import { conversationThreadCache } from '../services/conversationThreadCache';



/**
 * High-level business service for conversation operations
 */
export class ConversationService {
    /**
     * Fetch conversations for a specific year with business logic and background refresh
     * @param year - Optional year filter
     * @param forceRefresh - When true, bypasses cache and fetches from API
     */
    static async fetchConversationsViaCachedAPI(year?: number, forceRefresh: boolean = false): Promise<ConversationResponse[]> {
        // If forceRefresh is true, bypass cache completely
        if (forceRefresh) {
            return this._fetchAndCacheConversations(year);
        }

        // Check if cache exists
        const cachedConversations = conversationsCache.get();
        
        if (cachedConversations) {
            // Cache exists - check if expired
            if (conversationsCache.isExpired()) {
                // Cache is expired: return stale data immediately AND refresh in background
                this._refreshConversationsInBackground(year);
                return cachedConversations;
            } else {
                // Cache is fresh - return it
                return cachedConversations;
            }
        }

        // No cache exists - fetch from API normally
        return this._fetchAndCacheConversations(year);
    }

    /**
     * Private helper to fetch conversations from API and update cache
     */
    private static async _fetchAndCacheConversations(year?: number): Promise<ConversationResponse[]> {
        const conversations = await conversationApi.fetchConversations(year);

        // Store in cache
        try {
            conversationsCache.set(conversations);
        } catch (err) {
            console.warn('Failed to cache conversations:', err);
            // Clear cache to ensure fresh data on next load
            conversationsCache.clear();
        }

        return conversations;
    }

    /**
     * Private helper to refresh conversations in background with retry logic (fire and forget)
     */
    private static _refreshConversationsInBackground(year?: number): void {
        const performBackgroundRefresh = async (attempt: number = 1): Promise<void> => {
            try {
                const conversations = await this._fetchAndCacheConversations(year);
                console.log(`Background conversation refresh successful (attempt ${attempt}), cached ${conversations.length} conversations`);
            } catch (error) {
                if (attempt < 2) {
                    // Retry once after a short delay
                    console.warn(`Background conversation refresh failed (attempt ${attempt}), retrying...`, error);
                    setTimeout(() => {
                        performBackgroundRefresh(attempt + 1).catch(retryError => {
                            console.warn(`Background conversation refresh failed after retry (attempt ${attempt + 1}):`, retryError);
                        });
                    }, 2000); // 2 second delay before retry
                } else {
                    console.warn(`Background conversation refresh failed after ${attempt} attempts:`, error);
                }
                // Don't throw - this is background operation
            }
        };

        // Fire and forget - don't await this
        performBackgroundRefresh().catch(error => {
            console.warn('Background conversation refresh initialization failed:', error);
        });
    }

    /**
     * Create a new conversation with validation
     * After successful creation, updates the cache with the new conversation
     */
    static async createConversationAndUpdateCache(
        title: string,
        messageBody: string,
        author: string,
        convoType: number,
        utcCreationTime: string = new Date().toISOString()
    ): Promise<ConversationResponse> {
        const createConversationRequest: CreateConversationRequest = {
            Title: title.trim(),
            MessageBody: messageBody.trim(),
            Author: author.trim(),
            ConvoType: convoType,
            NewGuid: crypto.randomUUID(),
            UtcCreationTime: utcCreationTime
        };
        
        const newConversation = await conversationApi.createConversation(createConversationRequest);
        
        // Update cache with the new conversation (preserve original cache age)
        const cachedConversations = conversationsCache.get();
        if (cachedConversations) {
            // Add the new conversation to the existing cache, preserving original cache age
            const updatedConversations = [newConversation, ...cachedConversations];
            try {
                conversationsCache.updateDataPreservingAge(updatedConversations);
            } catch (err) {
                // Clear cache to ensure fresh data on next load
                conversationsCache.clear();
            }
        } else {
            // If no cache exists, create one with just the new conversation (fresh timestamp is correct)
            conversationsCache.set([newConversation]);
        }
        
        return newConversation;
    }

    /**
     * Fetch conversation posts with ID normalization and background refresh
     */
    static async fetchConversationPostsViaCachedAPI(conversationId: string, forceRefresh: boolean = false): Promise<Post[]> {
        // If forceRefresh is true, bypass cache completely
        if (forceRefresh) {
            return this._fetchAndCacheConversationPosts(conversationId);
        }

        // Check if cache exists
        const cachedPosts = conversationThreadCache.get(conversationId);
        
        if (cachedPosts) {
            // Cache exists - check if expired
            if (conversationThreadCache.isExpired(conversationId)) {
                // Cache is expired: return stale data immediately AND refresh in background
                this._refreshConversationPostsInBackground(conversationId);
                return cachedPosts;
            } else {
                // Cache is fresh - return it
                return cachedPosts;
            }
        }

        // No cache exists - fetch from API normally
        return this._fetchAndCacheConversationPosts(conversationId);
    }

    /**
     * Private helper to fetch conversation posts from API and update cache
     */
    private static async _fetchAndCacheConversationPosts(conversationId: string): Promise<Post[]> {
        const posts = await conversationApi.fetchConversationPosts(conversationId);

        // Store in cache
        try {
            conversationThreadCache.set(conversationId, posts);
        } catch (err) {
            console.warn(`Failed to cache conversation posts for ${conversationId}:`, err);
            // Clear cache to ensure fresh data on next load
            conversationThreadCache.clear();
        }

        return posts;
    }

    /**
     * Private helper to refresh conversation posts in background with retry logic (fire and forget)
     */
    private static _refreshConversationPostsInBackground(conversationId: string): void {
        const performBackgroundRefresh = async (attempt: number = 1): Promise<void> => {
            try {
                const posts = await this._fetchAndCacheConversationPosts(conversationId);
                console.log(`Background conversation posts refresh successful (attempt ${attempt}), cached ${posts.length} posts for conversation ${conversationId}`);
            } catch (error) {
                if (attempt < 2) {
                    // Retry once after a short delay
                    console.warn(`Background conversation posts refresh failed (attempt ${attempt}) for ${conversationId}, retrying...`, error);
                    setTimeout(() => {
                        performBackgroundRefresh(attempt + 1).catch(retryError => {
                            console.warn(`Background conversation posts refresh failed after retry (attempt ${attempt + 1}) for ${conversationId}:`, retryError);
                        });
                    }, 2000); // 2 second delay before retry
                } else {
                    console.warn(`Background conversation posts refresh failed after ${attempt} attempts for ${conversationId}:`, error);
                }
                // Don't throw - this is background operation
            }
        };

        // Fire and forget - don't await this
        performBackgroundRefresh().catch(error => {
            console.warn(`Background conversation posts refresh initialization failed for ${conversationId}:`, error);
        });
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

        return this._appendPostAndUpdateCache(commentRequest, conversationApi.appendComment);
    }

    /**
     * Append a drill-down to a conversation and update the cache
     */
    static async appendDrillDownAndUpdateCache(
        conversationPK: string,
        parentPostSK: string,
        author: string,
        messageBody: string
    ): Promise<Post> {
        const drillDownRequest: AppendDrillDownRequest = {
            ConversationPK: conversationPK,
            ParentPostSK: parentPostSK,
            NewDrillDownGuid: crypto.randomUUID(),
            Author: author,
            MessageBody: messageBody,
            UtcCreationTime: new Date().toISOString()
        };

        return this._appendPostAndUpdateCache(drillDownRequest, conversationApi.appendDrillDown);
    }

    /**
     * Append a conclusion to a conversation and update the cache
     */
    static async appendConclusionAndUpdateCache(
        conversationPK: string,
        parentPostSK: string,
        author: string,
        messageBody: string
    ): Promise<Post> {
        const conclusionRequest: AppendConclusionRequest = {
            ConversationPK: conversationPK,
            ParentPostSK: parentPostSK,
            NewConclusionGuid: crypto.randomUUID(),
            Author: author,
            MessageBody: messageBody,
            UtcCreationTime: new Date().toISOString()
        };

        return this._appendPostAndUpdateCache(conclusionRequest, conversationApi.appendConclusion);
    }

    /**
     * Private generic helper to append a post and update the cache.
     * It takes a request object and the specific API function to call.
     */
    private static async _appendPostAndUpdateCache(
        request: AppendPostRequest,
        apiCall: (req: any) => Promise<Post> // Using `any` to satisfy TypeScript for different request types
    ): Promise<Post> {

        const newPost = await apiCall(request);

        const conversationId: string = request.ConversationPK;

        // Update cache with the new post (preserve original cache age)
        const cachedPosts = conversationThreadCache.get(conversationId);

        const conversationRootCachedItem = cachedPosts?.find((item: Post) => item.SK === 'METADATA');
        if (!conversationRootCachedItem) {
            throw new Error(`Conversation metadata not found in the cache for conversation id: ${conversationId}`);
        }

        let postsCachedItems = cachedPosts?.filter((item: Post) => item.SK !== 'METADATA') ?? [];
        if (!postsCachedItems) { postsCachedItems = []; }
        
        const updatedPosts = [...postsCachedItems, newPost];
        const updatedCacheData = [conversationRootCachedItem, ...updatedPosts];

        try {
            // Update cache with new post while preserving original cache age
            conversationThreadCache.updatePostsPreservingAge(conversationId, updatedCacheData);
        } catch (err) {
            // Clear cache to ensure fresh data on next load
            conversationThreadCache.clear();
        }
        
        return newPost;
    }

}