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
 * API response conversation interface (for ConversationsList)
 */
export interface ApiConversation {
  PK: string;
  SK: string;
  Title: string;
  MessageBody: string;
  Author: string;
  UpdatedAt: string;
  ConvoType: string | number; // Can be string (from API responses) or number (for API requests)
  NewGuid?: string; // Required for creation requests
  UtcCreationTime?: string; // Required for creation requests
}

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