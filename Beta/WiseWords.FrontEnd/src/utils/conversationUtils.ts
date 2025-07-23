/**
 * Conversation utilities for shared conversation-related logic
 */

import { CONVERSATION_TYPE_LABELS } from './conversationLabelsConstants';

/**
 * Gets the CSS color variable for a conversation type.
 * 
 * @param type - The conversation type
 * @returns CSS color variable string
 */
export const getConversationTypeColor = (type?: string): string => {
    switch (type) {
        case 'QUESTION': return 'var(--color-question)';
        case 'PROBLEM': return 'var(--color-problem)';
        case 'DILEMMA': return 'var(--color-dilemma)';
        default: return 'var(--color-text-primary)';
    }
};

/**
 * Gets the display label for a conversation type.
 * 
 * @param type - The conversation type
 * @returns Human-readable conversation type label
 */
export const getConversationTypeLabel = (type?: string): string => {
    if (!type) return 'Unknown';
    return CONVERSATION_TYPE_LABELS[type as keyof typeof CONVERSATION_TYPE_LABELS] || type;
};

