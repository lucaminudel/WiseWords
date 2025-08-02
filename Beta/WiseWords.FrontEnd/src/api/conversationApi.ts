/**
 * Pure API communication layer for conversation-related endpoints
 */

import { CreateConversationRequest, ConversationResponse, Post, ApiError, AppendCommentRequest, AppendDrillDownRequest, AppendConclusionRequest } from '../types/conversation';

/**
 * Base API configuration
 */
const API_CONFIG = {
    baseUrl: 'http://localhost:3000',
    headers: {
        'Content-Type': 'application/json',
    },
} as const;

/**
 * Generic API error class
 */
class ConversationApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public response?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    try {
        const response = await fetch(url, {
            headers: API_CONFIG.headers,
            ...options,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to fetch ${endpoint}: ${response.status} ${response.statusText}`;
            
            try {
                const errorData = JSON.parse(errorText) as ApiError;
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // If error response is not JSON, use the text or default message
                errorMessage = errorText || errorMessage;
            }
            
            throw new ConversationApiError(errorMessage, response.status, errorText);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof ConversationApiError) {
            throw error;
        }
        
        // Network or other errors
        throw new ConversationApiError(
            `Network error while fetching ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Pure API functions for conversation endpoints
 */
export const conversationApi = {
    /**
     * Fetch conversations for a specific year
     * @returns Conversations sorted by UpdatedAt in ascending order (oldest first).
     */
    fetchConversations: (year?: number): Promise<ConversationResponse[]> => {
        const endpoint = year ? `/conversations?updatedAtYear=${year}` : '/conversations';
        return apiFetch<ConversationResponse[]>(endpoint);
    },

    /**
     * Fetch conversation posts by conversation ID
     * 
     * @returns Posts sorted by SK (Sort Key) in lexicographic order.
     *          This ordering provides natural tree traversal where:
     *          - Parent nodes appear before their children
     *          - Siblings are ordered by numeric suffixes
     *          - Example: "#CM#1", "#CM#2", "#DD#1", "#DD#1#CM#1"
     */
    async fetchConversationPosts(conversationId: string): Promise<Post[]> {
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<Post[]>(`/conversations/${encodedId}/posts`);
    },

    /**
     * Create a new conversation
     */
    createConversation: (conversation: CreateConversationRequest): Promise<ConversationResponse> => {
        return apiFetch<ConversationResponse>('/conversations', {
            method: 'POST',
            body: JSON.stringify(conversation),
        });
    },

    /**
     * Update an existing conversation
     */
    updateConversation: (
        conversationId: string, 
        updates: Partial<ConversationResponse>
    ): Promise<ConversationResponse> => {
        return apiFetch<ConversationResponse>(`/conversations/${encodeURIComponent(conversationId)}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId: string): Promise<void> {
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<void>(`/conversations/${encodedId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Append a comment to a conversation
     */
    async appendComment(commentRequest: AppendCommentRequest): Promise<Post> {
        return apiFetch<Post>('/conversations/comment', {
            method: 'POST',
            body: JSON.stringify(commentRequest),
        });
    },

    /**
     * Append a drill-down to a conversation
     */
    async appendDrillDown(drillDownRequest: AppendDrillDownRequest): Promise<Post> {
        return apiFetch<Post>('/conversations/drilldown', {
            method: 'POST',
            body: JSON.stringify(drillDownRequest),
        });
    },

    /**
     * Append a conclusion to a conversation
     */
    async appendConclusion(conclusionRequest: AppendConclusionRequest): Promise<Post> {
        return apiFetch<Post>('/conversations/conclusion', {
            method: 'POST',
            body: JSON.stringify(conclusionRequest),
        });
    }
};