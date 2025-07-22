/**
 * Conversation utilities for shared conversation-related logic
 */

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
 * Conversation type display labels mapping
 */
export const CONVERSATION_TYPE_LABELS = {
    QUESTION: 'Question',
    PROBLEM: 'Problem', 
    DILEMMA: 'Dilemma',
} as const;

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

/**
 * Normalizes a conversation ID to include the CONVO# prefix if missing.
 * 
 * @param conversationId - The conversation ID (with or without prefix)
 * @returns Normalized conversation ID with CONVO# prefix
 */
export const normalizeConversationId = (conversationId?: string): string => {
    if (!conversationId) return '';
    return conversationId.startsWith('CONVO#') ? conversationId : `CONVO#${conversationId}`;
};
