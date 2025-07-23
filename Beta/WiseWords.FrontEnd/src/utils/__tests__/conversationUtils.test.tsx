import { describe, it, expect } from 'vitest';
import { 
    getConversationTypeColor, 
    getConversationTypeLabel, 
    normalizeConversationId,
    CONVERSATION_TYPE_LABELS 
} from '../conversationUtils';

describe('getConversationTypeColor', () => {
    it('should return question color for QUESTION type', () => {
        expect(getConversationTypeColor('QUESTION')).toBe('var(--color-question)');
    });

    it('should return problem color for PROBLEM type', () => {
        expect(getConversationTypeColor('PROBLEM')).toBe('var(--color-problem)');
    });

    it('should return dilemma color for DILEMMA type', () => {
        expect(getConversationTypeColor('DILEMMA')).toBe('var(--color-dilemma)');
    });

    it('should return default color for unknown type', () => {
        expect(getConversationTypeColor('UNKNOWN')).toBe('var(--color-text-primary)');
    });

    it('should return default color for undefined type', () => {
        expect(getConversationTypeColor(undefined)).toBe('var(--color-text-primary)');
    });
});

describe('getConversationTypeLabel', () => {
    it('should return correct label for QUESTION type', () => {
        expect(getConversationTypeLabel('QUESTION')).toBe('Question');
    });

    it('should return correct label for PROBLEM type', () => {
        expect(getConversationTypeLabel('PROBLEM')).toBe('Problem');
    });

    it('should return correct label for DILEMMA type', () => {
        expect(getConversationTypeLabel('DILEMMA')).toBe('Dilemma');
    });

    it('should return the original type for unknown types', () => {
        expect(getConversationTypeLabel('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');
    });

    it('should return "Unknown" for undefined type', () => {
        expect(getConversationTypeLabel(undefined)).toBe('Unknown');
    });

    it('should return "Unknown" for null type', () => {
        expect(getConversationTypeLabel(null as any)).toBe('Unknown');
    });

    it('should return "Unknown" for empty string', () => {
        expect(getConversationTypeLabel('')).toBe('Unknown');
    });
});

describe('normalizeConversationId', () => {
    it('should add CONVO# prefix when missing', () => {
        expect(normalizeConversationId('123')).toBe('CONVO#123');
        expect(normalizeConversationId('abc-def')).toBe('CONVO#abc-def');
    });

    it('should not add prefix when already present', () => {
        expect(normalizeConversationId('CONVO#123')).toBe('CONVO#123');
        expect(normalizeConversationId('CONVO#abc-def')).toBe('CONVO#abc-def');
    });

    it('should return empty string for undefined input', () => {
        expect(normalizeConversationId(undefined)).toBe('');
    });

    it('should return empty string for null input', () => {
        expect(normalizeConversationId(null as any)).toBe('');
    });

    it('should return empty string for empty string input', () => {
        expect(normalizeConversationId('')).toBe('');
    });

    it('should handle edge case with just CONVO# prefix', () => {
        expect(normalizeConversationId('CONVO#')).toBe('CONVO#');
    });
});

describe('CONVERSATION_TYPE_LABELS', () => {
    it('should have correct constant values', () => {
        expect(CONVERSATION_TYPE_LABELS.QUESTION).toBe('Question');
        expect(CONVERSATION_TYPE_LABELS.PROBLEM).toBe('Problem');
        expect(CONVERSATION_TYPE_LABELS.DILEMMA).toBe('Dilemma');
    });

    it('should be a readonly object', () => {
        // TypeScript should enforce this, but we can test the structure
        expect(typeof CONVERSATION_TYPE_LABELS).toBe('object');
        expect(Object.keys(CONVERSATION_TYPE_LABELS)).toEqual(['QUESTION', 'PROBLEM', 'DILEMMA']);
    });
});

