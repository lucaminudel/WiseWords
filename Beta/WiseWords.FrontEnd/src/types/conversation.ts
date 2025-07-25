/**
 * Unified type definitions for conversations and posts
 */

/**
 * Base conversation interface
 */
export interface Conversation {
  PK: string;
  SK: string;
  Title?: string;
  MessageBody: string;
  Author: string;
  UpdatedAt: string;
  ConvoType?: string;
}

/**
 * Post interface (extends Conversation for compatibility)
 */
export interface Post extends Conversation {
  // Posts have the same structure as conversations
  // SK determines if it's metadata (conversation) or a post
}

/**
 * Interface for creating a new conversation (POST /conversations)
 */
export interface CreateConversationRequest {
  Title: string;
  MessageBody: string;
  Author: string;
  ConvoType: number;  // Numeric value for the API
  NewGuid: string;
  UtcCreationTime: string;
}

/**
 * Interface for conversation responses (GET /conversations)
 */
export interface ConversationResponse {
  PK: string;
  SK: string;
  Title: string;
  MessageBody: string;
  Author: string;
  UpdatedAt: string;
  ConvoType: string;  // String value from the API
}

// For backward compatibility
export type ApiConversation = ConversationResponse;

/**
 * Conversation type enumeration
 */
export type ConversationType = 'QUESTION' | 'PROBLEM' | 'DILEMMA';


/**
 * API error response interface
 */
export interface ApiError {
  error: string;
  message?: string;
}