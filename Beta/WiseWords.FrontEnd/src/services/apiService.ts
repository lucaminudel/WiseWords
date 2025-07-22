/**
 * Centralized API service for all conversation-related API calls
 */

import { ApiConversation, Post, ApiError } from '../types/conversation';

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
export class ApiServiceError extends Error {
    constructor(
        message: string,
        public status?: number,
        public response?: any
    ) {
        super(message);
        this.name = 'ApiServiceError';
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
            
            throw new ApiServiceError(errorMessage, response.status, errorText);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        if (error instanceof ApiServiceError) {
            throw error;
        }
        
        // Network or other errors
        throw new ApiServiceError(
            `Network error while fetching ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * API service class with all conversation-related endpoints
 */
export class ApiService {
    /**
     * Fetch conversations for a specific year
     */
    static async fetchConversations(year: number): Promise<ApiConversation[]> {
        return apiFetch<ApiConversation[]>(`/conversations?year=${year}`);
    }

    /**
     * Fetch conversation posts by conversation ID
     */
    static async fetchConversationPosts(conversationId: string): Promise<Post[]> {
        // Ensure the conversation ID is properly encoded for URL
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<Post[]>(`/conversations/${encodedId}/posts`);
    }

    /**
     * Create a new conversation
     */
    static async createConversation(conversation: Partial<ApiConversation>): Promise<ApiConversation> {
        return apiFetch<ApiConversation>('/conversations', {
            method: 'POST',
            body: JSON.stringify(conversation),
        });
    }

    /**
     * Update an existing conversation
     */
    static async updateConversation(
        conversationId: string, 
        updates: Partial<ApiConversation>
    ): Promise<ApiConversation> {
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<ApiConversation>(`/conversations/${encodedId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    }

    /**
     * Delete a conversation
     */
    static async deleteConversation(conversationId: string): Promise<void> {
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<void>(`/conversations/${encodedId}`, {
            method: 'DELETE',
        });
    }

    /**
     * Add a post to a conversation
     */
    static async addPost(conversationId: string, post: Partial<Post>): Promise<Post> {
        const encodedId = encodeURIComponent(conversationId);
        return apiFetch<Post>(`/conversations/${encodedId}/posts`, {
            method: 'POST',
            body: JSON.stringify(post),
        });
    }
}