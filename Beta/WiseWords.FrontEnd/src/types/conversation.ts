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

/**
 * Conversation type enumeration
 */
export type ConversationType = 'QUESTION' | 'PROBLEM' | 'DILEMMA';


/**
 * Base interface for appending any type of post
 */
export interface AppendPostRequest {
  ConversationPK: string;
  ParentPostSK: string;
  Author: string;
  MessageBody: string;
  UtcCreationTime: string;
}

/**
 * Interface for appending a comment to a conversation
 */
export interface AppendCommentRequest extends AppendPostRequest {
  NewCommentGuid: string;
}

/**
 * Interface for appending a drill-down post to a conversation
 */
export interface AppendDrillDownRequest extends AppendPostRequest {
  NewDrillDownGuid: string;
}

/**
 * Interface for appending a conclusion post to a conversation
 */
export interface AppendConclusionRequest extends AppendPostRequest {
  NewConclusionGuid: string;
}

/**
 * API error response interface
 */
export interface ApiError {
  error: string;
  message?: string;
}