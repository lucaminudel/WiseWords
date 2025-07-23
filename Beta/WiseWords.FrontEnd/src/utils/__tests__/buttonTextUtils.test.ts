import { describe, it, expect } from 'vitest';
import { 
  getProposeSolutionButtonText, 
  getAddSubActionButtonText 
} from '../buttonTextUtils';

describe('buttonTextUtils', () => {

  describe('getProposeSolutionButtonText', () => {
    it('should return correct text for QUESTION type', () => {
      expect(getProposeSolutionButtonText('QUESTION')).toBe('Propose Answer');
    });

    it('should return correct text for PROBLEM type', () => {
      expect(getProposeSolutionButtonText('PROBLEM')).toBe('Suggest Solution');
    });

    it('should return correct text for DILEMMA type', () => {
      expect(getProposeSolutionButtonText('DILEMMA')).toBe('Propose Choice');
    });

    it('should return default text for unknown type', () => {
      expect(getProposeSolutionButtonText('UNKNOWN')).toBe('Propose');
      expect(getProposeSolutionButtonText('')).toBe('Propose');
    });

    it('should return default text for undefined type', () => {
      expect(getProposeSolutionButtonText()).toBe('Propose');
      expect(getProposeSolutionButtonText(undefined)).toBe('Propose');
    });
  });

  describe('getAddSubActionButtonText', () => {
    it('should return correct text with "Add" prefix for QUESTION type', () => {
      expect(getAddSubActionButtonText('QUESTION')).toBe('Add Sub-question');
    });

    it('should return correct text with "Add" prefix for PROBLEM type', () => {
      expect(getAddSubActionButtonText('PROBLEM')).toBe('Add Sub-problem');
    });

    it('should return correct text with "Add" prefix for DILEMMA type', () => {
      expect(getAddSubActionButtonText('DILEMMA')).toBe('Add Sub-dilemma');
    });

    it('should return default text with "Add" prefix for unknown type', () => {
      expect(getAddSubActionButtonText('UNKNOWN')).toBe('Add Sub-item');
      expect(getAddSubActionButtonText('')).toBe('Add Sub-item');
    });

    it('should return default text with "Add" prefix for undefined type', () => {
      expect(getAddSubActionButtonText()).toBe('Add Sub-item');
      expect(getAddSubActionButtonText(undefined)).toBe('Add Sub-item');
    });
  });

  describe('edge cases', () => {
    it('should handle null values gracefully', () => {
      expect(getProposeSolutionButtonText(null as any)).toBe('Propose');
      expect(getAddSubActionButtonText(null as any)).toBe('Add Sub-item');
    });

    it('should handle case sensitivity', () => {
      expect(getProposeSolutionButtonText('problem')).toBe('Propose'); // lowercase
    });

    it('should handle whitespace', () => {
      expect(getProposeSolutionButtonText(' PROBLEM ')).toBe('Propose');
    });
  });
});