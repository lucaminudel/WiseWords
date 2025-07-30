import { describe, it, expect } from 'vitest';
import { postTypeService } from '../postType';

describe('postTypeService', () => {
  describe('getPostType', () => {
    it('should handle METADATA correctly', () => {
      const result = postTypeService.getPostType('METADATA');
      expect(result).toEqual({
        isDrillDown: false,
        isConclusion: false,
        isComment: false,
        lastMarker: -1,
        markerType: 'NONE'
      });
    });

    it('should identify simple comment posts', () => {
      const result = postTypeService.getPostType('#CM#1');
      expect(result.isComment).toBe(true);
      expect(result.isDrillDown).toBe(false);
      expect(result.isConclusion).toBe(false);
      expect(result.markerType).toBe('CM');
    });

    it('should identify simple drill-down posts', () => {
      const result = postTypeService.getPostType('#DD#1');
      expect(result.isDrillDown).toBe(true);
      expect(result.isComment).toBe(false);
      expect(result.isConclusion).toBe(false);
      expect(result.markerType).toBe('DD');
    });

    it('should identify simple conclusion posts', () => {
      const result = postTypeService.getPostType('#CC#1');
      expect(result.isConclusion).toBe(true);
      expect(result.isDrillDown).toBe(false);
      expect(result.isComment).toBe(false);
      expect(result.markerType).toBe('CC');
    });

    it('should use LAST marker for nested posts - drill-down then comment', () => {
      const result = postTypeService.getPostType('#DD#1#CM#1');
      expect(result.isComment).toBe(true);
      expect(result.isDrillDown).toBe(false);
      expect(result.isConclusion).toBe(false);
      expect(result.markerType).toBe('CM');
    });

    it('should use LAST marker for nested posts - comment then drill-down', () => {
      const result = postTypeService.getPostType('#CM#1#DD#1');
      expect(result.isDrillDown).toBe(true);
      expect(result.isComment).toBe(false);
      expect(result.isConclusion).toBe(false);
      expect(result.markerType).toBe('DD');
    });

    it('should use LAST marker for nested posts - drill-down then conclusion', () => {
      const result = postTypeService.getPostType('#DD#1#CC#1');
      expect(result.isConclusion).toBe(true);
      expect(result.isDrillDown).toBe(false);
      expect(result.isComment).toBe(false);
      expect(result.markerType).toBe('CC');
    });

    it('should handle deeply nested posts', () => {
      const result = postTypeService.getPostType('#DD#1#CM#1#DD#2#CC#1');
      expect(result.isConclusion).toBe(true);
      expect(result.isDrillDown).toBe(false);
      expect(result.isComment).toBe(false);
      expect(result.markerType).toBe('CC');
    });

    it('should throw an error for posts with no markers', () => {
      expect(() => postTypeService.getPostType('#1')).toThrow(
        'Could not determine post type for SK: "#1". No valid markers found.'
      );
    });
  });

  describe('getPostTypeDisplay', () => {
    it('should return empty string for METADATA', () => {
      expect(postTypeService.getPostTypeDisplay('METADATA')).toBe('');
      expect(postTypeService.getPostTypeDisplay('METADATA', 'QUESTION')).toBe('');
    });

    it('should throw an error for unmarked posts', () => {
      expect(() => postTypeService.getPostTypeDisplay('#1', 'QUESTION')).toThrow();
    });

    describe('Solution/Conclusion posts (#CC#)', () => {
      it('should return Proposed Answer for QUESTION type', () => {
        expect(postTypeService.getPostTypeDisplay('#CC#1', 'QUESTION')).toBe('Proposed Answer');
      });

      it('should return Proposed Solution for PROBLEM type', () => {
        expect(postTypeService.getPostTypeDisplay('#CC#1', 'PROBLEM')).toBe('Proposed Solution');
      });

      it('should return Proposed Choice for DILEMMA type', () => {
        expect(postTypeService.getPostTypeDisplay('#CC#1', 'DILEMMA')).toBe('Proposed Choice');
      });

      it('should return Conclusion for unknown type', () => {
        expect(postTypeService.getPostTypeDisplay('#CC#1', 'UNKNOWN')).toBe('Conclusion');
      });
    });

    describe('Drill-down posts (#DD#)', () => {
      it('should return Sub-question for QUESTION type', () => {
        expect(postTypeService.getPostTypeDisplay('#DD#1', 'QUESTION')).toBe('Sub-question');
      });

      it('should return Sub-problem for PROBLEM type', () => {
        expect(postTypeService.getPostTypeDisplay('#DD#1', 'PROBLEM')).toBe('Sub-problem');
      });

      it('should return Sub-dilemma for DILEMMA type', () => {
        expect(postTypeService.getPostTypeDisplay('#DD#1', 'DILEMMA')).toBe('Sub-dilemma');
      });

      it('should return Drill-down for unknown type', () => {
        expect(postTypeService.getPostTypeDisplay('#DD#1', 'UNKNOWN')).toBe('Drill-down');
      });
    });

    describe('Comment posts (#CM#)', () => {
      it('should return Comment for any conversation type', () => {
        expect(postTypeService.getPostTypeDisplay('#CM#1', 'QUESTION')).toBe('Comment');
        expect(postTypeService.getPostTypeDisplay('#CM#1', 'PROBLEM')).toBe('Comment');
        expect(postTypeService.getPostTypeDisplay('#CM#1', 'DILEMMA')).toBe('Comment');
        expect(postTypeService.getPostTypeDisplay('#CM#1', 'UNKNOWN')).toBe('Comment');
      });
    });

    describe('Multiple markers', () => {
      it('should use the last marker for type determination', () => {
        expect(postTypeService.getPostTypeDisplay('#DD#1#CM#2', 'QUESTION')).toBe('Comment');
        expect(postTypeService.getPostTypeDisplay('#CM#1#DD#2', 'QUESTION')).toBe('Sub-question');
        expect(postTypeService.getPostTypeDisplay('#CC#1#DD#2#CM#3', 'QUESTION')).toBe('Comment');
      });
    });

    it('should return Comment for comment posts', () => {
      expect(postTypeService.getPostTypeDisplay('#CM#1')).toBe('Comment');
      expect(postTypeService.getPostTypeDisplay('#DD#1#CM#1')).toBe('Comment');
      expect(postTypeService.getPostTypeDisplay('#CM#1#DD#1#CM#2')).toBe('Comment');
    });

    it('should return contextual drill-down labels for QUESTION type', () => {
      expect(postTypeService.getPostTypeDisplay('#DD#1', 'QUESTION')).toBe('Sub-question');
      expect(postTypeService.getPostTypeDisplay('#CM#1#DD#1', 'QUESTION')).toBe('Sub-question');
    });

    it('should return contextual drill-down labels for PROBLEM type', () => {
      expect(postTypeService.getPostTypeDisplay('#DD#1', 'PROBLEM')).toBe('Sub-problem');
      expect(postTypeService.getPostTypeDisplay('#CM#1#DD#1', 'PROBLEM')).toBe('Sub-problem');
    });

    it('should return contextual drill-down labels for DILEMMA type', () => {
      expect(postTypeService.getPostTypeDisplay('#DD#1', 'DILEMMA')).toBe('Sub-dilemma');
      expect(postTypeService.getPostTypeDisplay('#CM#1#DD#1', 'DILEMMA')).toBe('Sub-dilemma');
    });

    it('should return default drill-down label for unknown conversation type', () => {
      expect(postTypeService.getPostTypeDisplay('#DD#1')).toBe('Drill-down');
      expect(postTypeService.getPostTypeDisplay('#DD#1', 'UNKNOWN')).toBe('Drill-down');
    });

    it('should return contextual conclusion labels for QUESTION type', () => {
      expect(postTypeService.getPostTypeDisplay('#CC#1', 'QUESTION')).toBe('Proposed Answer');
      expect(postTypeService.getPostTypeDisplay('#DD#1#CC#1', 'QUESTION')).toBe('Proposed Answer');
    });

    it('should return contextual conclusion labels for PROBLEM type', () => {
      expect(postTypeService.getPostTypeDisplay('#CC#1', 'PROBLEM')).toBe('Proposed Solution');
      expect(postTypeService.getPostTypeDisplay('#DD#1#CC#1', 'PROBLEM')).toBe('Proposed Solution');
    });

    it('should return contextual conclusion labels for DILEMMA type', () => {
      expect(postTypeService.getPostTypeDisplay('#CC#1', 'DILEMMA')).toBe('Proposed Choice');
      expect(postTypeService.getPostTypeDisplay('#DD#1#CC#1', 'DILEMMA')).toBe('Proposed Choice');
    });

    it('should return default conclusion label for unknown conversation type', () => {
      expect(postTypeService.getPostTypeDisplay('#CC#1')).toBe('Conclusion');
      expect(postTypeService.getPostTypeDisplay('#CC#1', 'UNKNOWN')).toBe('Conclusion');
    });

    it('should throw an error for posts with no markers', () => {
      expect(() => postTypeService.getPostTypeDisplay('#1')).toThrow();
      expect(() => postTypeService.getPostTypeDisplay('')).toThrow();
    });
  });


  describe('getPostDepth', () => {
    it('should return 0 for METADATA', () => {
      expect(postTypeService.getPostDepth('METADATA')).toBe(0);
    });

    it('should return 1 for first level posts', () => {
      expect(postTypeService.getPostDepth('#CM#1')).toBe(1);
      expect(postTypeService.getPostDepth('#DD#1')).toBe(1);
      expect(postTypeService.getPostDepth('#CC#1')).toBe(1);
    });

    it('should return correct depth for nested posts', () => {
      expect(postTypeService.getPostDepth('#CM#1#CM#1')).toBe(2); // 4 # characters / 2 = 2
      expect(postTypeService.getPostDepth('#DD#1#CM#1')).toBe(2); // 4 # characters / 2 = 2
      expect(postTypeService.getPostDepth('#CM#1#DD#1')).toBe(2); // 4 # characters / 2 = 2
    });

    it('should handle deeply nested posts', () => {
      expect(postTypeService.getPostDepth('#DD#1#CM#1#DD#2#CC#1')).toBe(4); // 8 # characters / 2 = 4
      expect(postTypeService.getPostDepth('#CM#1#CM#2#CM#3#CM#4#CM#5')).toBe(5); // 10 # characters / 2 = 5
    });

    it('should handle malformed SKs', () => {
      expect(postTypeService.getPostDepth('#1')).toBe(0.5); // 1 # character / 2 = 0.5
      expect(postTypeService.getPostDepth('#1#2')).toBe(1); // 2 # characters / 2 = 1
    });
  });

  describe('convenience functions', () => {
    describe('isSolutionPost', () => {
      it('should return true for conclusion posts', () => {
        expect(postTypeService.getPostType('#CC#1').isConclusion).toBe(true);
        expect(postTypeService.getPostType('#DD#1#CC#1').isConclusion).toBe(true);
        expect(postTypeService.getPostType('#CM#1#DD#1#CC#1').isConclusion).toBe(true);
      });

      it('should return false for non-conclusion posts', () => {
        expect(postTypeService.getPostType('#CM#1').isConclusion).toBe(false);
        expect(postTypeService.getPostType('#DD#1').isConclusion).toBe(false);
        expect(postTypeService.getPostType('#DD#1#CM#1').isConclusion).toBe(false);
        expect(postTypeService.getPostType('METADATA').isConclusion).toBe(false);
      });
    });

    describe('isDrillDownPost', () => {
      it('should return true for drill-down posts', () => {
        expect(postTypeService.getPostType('#DD#1').isDrillDown).toBe(true);
        expect(postTypeService.getPostType('#CM#1#DD#1').isDrillDown).toBe(true);
        expect(postTypeService.getPostType('#CC#1#DD#1').isDrillDown).toBe(true);
      });

      it('should return false for non-drill-down posts', () => {
        expect(postTypeService.getPostType('#CM#1').isDrillDown).toBe(false);
        expect(postTypeService.getPostType('#CC#1').isDrillDown).toBe(false);
        expect(postTypeService.getPostType('#DD#1#CM#1').isDrillDown).toBe(false);
        expect(postTypeService.getPostType('METADATA').isDrillDown).toBe(false);
      });
    });

    describe('isCommentPost', () => {
      it('should return true for comment posts', () => {
        expect(postTypeService.getPostType('#CM#1').isComment).toBe(true);
        expect(postTypeService.getPostType('#DD#1#CM#1').isComment).toBe(true);
        expect(postTypeService.getPostType('#CC#1#CM#1').isComment).toBe(true);
      });

      it('should return false for non-comment posts', () => {
        expect(postTypeService.getPostType('#DD#1').isComment).toBe(false);
        expect(postTypeService.getPostType('#CC#1').isComment).toBe(false);
        expect(postTypeService.getPostType('#CM#1#DD#1').isComment).toBe(false);
        expect(postTypeService.getPostType('METADATA').isComment).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should throw an error for empty strings', () => {
      expect(() => postTypeService.getPostType('')).toThrow('Invalid SK value: it cannot be an empty string.');
    });

    it('should throw an error for malformed SKs', () => {
      expect(() => postTypeService.getPostType('###')).toThrow(
        'Could not determine post type for SK: "###". No valid markers found.'
      );
    });

    it('should throw an error for SKs with partial markers', () => {
      expect(() => postTypeService.getPostType('#CM')).toThrow(
        'Could not determine post type for SK: "#CM". No valid markers found.'
      );
      expect(() => postTypeService.getPostType('CM#1')).toThrow(
        'Could not determine post type for SK: "CM#1". No valid markers found.'
      );
    });
  });
});