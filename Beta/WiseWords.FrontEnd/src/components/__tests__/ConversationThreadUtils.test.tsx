import { describe, it, expect } from 'vitest';
import { getConversationTypeColor, getPostTypeDisplay } from '../../utils/conversationUtils';

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

describe('getPostTypeDisplay', () => {
    it('should return empty string for METADATA', () => {
        expect(getPostTypeDisplay('METADATA', 'QUESTION')).toBe('');
    });

    it('should return Comment for unmarked posts', () => {
        expect(getPostTypeDisplay('simple-post', 'QUESTION')).toBe('Comment');
    });

    describe('Solution/Conclusion posts (#CC#)', () => {
        it('should return Proposed Answer for QUESTION type', () => {
            expect(getPostTypeDisplay('post#CC#123', 'QUESTION')).toBe('Proposed Answer');
        });

        it('should return Proposed Solution for PROBLEM type', () => {
            expect(getPostTypeDisplay('post#CC#123', 'PROBLEM')).toBe('Proposed Solution');
        });

        it('should return Proposed Choice for DILEMMA type', () => {
            expect(getPostTypeDisplay('post#CC#123', 'DILEMMA')).toBe('Proposed Choice');
        });

        it('should return Conclusion for unknown type', () => {
            expect(getPostTypeDisplay('post#CC#123', 'UNKNOWN')).toBe('Conclusion');
        });
    });

    describe('Drill-down posts (#DD#)', () => {
        it('should return Sub-question for QUESTION type', () => {
            expect(getPostTypeDisplay('post#DD#123', 'QUESTION')).toBe('Sub-question');
        });

        it('should return Sub-problem for PROBLEM type', () => {
            expect(getPostTypeDisplay('post#DD#123', 'PROBLEM')).toBe('Sub-problem');
        });

        it('should return Sub-dilemma for DILEMMA type', () => {
            expect(getPostTypeDisplay('post#DD#123', 'DILEMMA')).toBe('Sub-dilemma');
        });

        it('should return Drill-down for unknown type', () => {
            expect(getPostTypeDisplay('post#DD#123', 'UNKNOWN')).toBe('Drill-down');
        });
    });

    describe('Comment posts (#CM#)', () => {
        it('should return Comment for any conversation type', () => {
            expect(getPostTypeDisplay('post#CM#123', 'QUESTION')).toBe('Comment');
            expect(getPostTypeDisplay('post#CM#123', 'PROBLEM')).toBe('Comment');
            expect(getPostTypeDisplay('post#CM#123', 'DILEMMA')).toBe('Comment');
            expect(getPostTypeDisplay('post#CM#123', 'UNKNOWN')).toBe('Comment');
        });
    });

    describe('Multiple markers', () => {
        it('should use the last marker for type determination', () => {
            expect(getPostTypeDisplay('post#DD#123#CM#456', 'QUESTION')).toBe('Comment');
            expect(getPostTypeDisplay('post#CM#123#DD#456', 'QUESTION')).toBe('Sub-question');
            expect(getPostTypeDisplay('post#CC#123#DD#456#CM#789', 'QUESTION')).toBe('Comment');
        });
    });
});
