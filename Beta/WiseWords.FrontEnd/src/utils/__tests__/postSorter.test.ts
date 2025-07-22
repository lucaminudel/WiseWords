import { describe, it, expect } from 'vitest';
import { sortPosts } from '../postSorter';
import { Post } from '../../components/ConversationThread';

// Helper function to create test posts
const createPost = (sk: string, messageBody: string = 'Test message'): Post => ({
  PK: 'CONVO#123',
  SK: sk,
  MessageBody: messageBody,
  Author: 'Test Author',
  UpdatedAt: '1690000000'
});

describe('postSorter', () => {
  describe('sortPosts', () => {
    it('should handle empty array', () => {
      expect(sortPosts([])).toEqual([]);
    });

    it('should handle null or undefined input', () => {
      expect(sortPosts(null as any)).toEqual([]);
      expect(sortPosts(undefined as any)).toEqual([]);
    });

    it('should handle single post', () => {
      const posts = [createPost('METADATA', 'Root question')];
      const result = sortPosts(posts);
      
      expect(result).toHaveLength(1);
      expect(result[0].SK).toBe('METADATA');
    });

    it('should keep metadata at the beginning', () => {
      const posts = [
        createPost('#CM#1', 'Comment'),
        createPost('METADATA', 'Root question'),
        createPost('#DD#1', 'Sub-question')
      ];
      
      const result = sortPosts(posts);
      
      expect(result[0].SK).toBe('METADATA');
    });

    it('should move solution posts to end of sibling groups - simple case', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#CC#1', 'Solution'), // Should move to end
        createPost('#CM#1', 'Comment'),
        createPost('#DD#1', 'Sub-question')
      ];
      
      const result = sortPosts(posts);
      
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#CM#1',
        '#DD#1', 
        '#CC#1' // Solution moved to end
      ]);
    });

    it('should move solution posts to end within their depth level', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#DD#1', 'Sub-question'),
        createPost('#DD#1#CC#1', 'Solution to sub-question'), // Should move to end of DD#1 group
        createPost('#DD#1#CM#1', 'Comment on sub-question'),
        createPost('#CM#1', 'Root comment')
      ];
      
      const result = sortPosts(posts);
      
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#DD#1',
        '#DD#1#CM#1',
        '#DD#1#CC#1', // Solution moved to end of its sibling group
        '#CM#1'
      ]);
    });

    it('should handle multiple solution posts at same level', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#CC#1', 'First solution'),
        createPost('#CM#1', 'Comment'),
        createPost('#CC#2', 'Second solution'),
        createPost('#DD#1', 'Sub-question')
      ];
      
      const result = sortPosts(posts);
      
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#CM#1',
        '#DD#1',
        '#CC#1', // Solutions moved to end
        '#CC#2'
      ]);
    });

    it('should handle deeply nested structure with solutions', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#DD#1', 'Sub-question'),
        createPost('#DD#1#CC#1', 'Solution to sub-question'),
        createPost('#DD#1#CM#1', 'Comment on sub-question'),
        createPost('#DD#1#DD#1', 'Sub-sub-question'),
        createPost('#DD#1#DD#1#CC#1', 'Solution to sub-sub-question'),
        createPost('#DD#1#DD#1#CM#1', 'Comment on sub-sub-question')
      ];
      
      const result = sortPosts(posts);
      
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#DD#1',
        '#DD#1#CM#1',
        '#DD#1#DD#1',
        '#DD#1#DD#1#CM#1',
        '#DD#1#DD#1#CC#1', // Solution at deepest level
        '#DD#1#CC#1' // Solution at parent level
      ]);
    });

    it('should use correct last-marker logic for solution detection', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#CC#1#DD#1', 'This is a drill-down, not a solution'), // Last marker is DD
        createPost('#DD#1#CC#1', 'This is a solution'), // Last marker is CC
        createPost('#CM#1', 'Comment')
      ];
      
      const result = sortPosts(posts);
      
      // #DD#1#CC#1 should be treated as solution and moved to end
      // #CC#1#DD#1 should be treated as drill-down and stay in place
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#CC#1#DD#1', // Drill-down (last marker is DD)
        '#CM#1',
        '#DD#1#CC#1' // Solution (last marker is CC) moved to end
      ]);
    });

    it('should not move solutions past posts with lower indentation', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#DD#1', 'Sub-question'),
        createPost('#DD#1#CC#1', 'Solution to sub-question'),
        createPost('#CM#1', 'Root level comment') // Lower indentation
      ];
      
      const result = sortPosts(posts);
      
      // Solution should not move past the root level comment
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#DD#1',
        '#DD#1#CC#1', // Solution stays within its depth group
        '#CM#1'
      ]);
    });

    it('should preserve original order for non-solution posts', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#CM#1', 'First comment'),
        createPost('#DD#1', 'Sub-question'),
        createPost('#CM#2', 'Second comment'),
        createPost('#DD#2', 'Another sub-question')
      ];
      
      const result = sortPosts(posts);
      
      // Order should be preserved since no solutions
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#CM#1',
        '#DD#1',
        '#CM#2',
        '#DD#2'
      ]);
    });

    it('should handle complex mixed scenario', () => {
      const posts = [
        createPost('METADATA', 'Root question'),
        createPost('#CC#1', 'Root solution'),
        createPost('#DD#1', 'Sub-question'),
        createPost('#DD#1#CM#1', 'Comment on sub-question'),
        createPost('#DD#1#CC#1', 'Solution to sub-question'),
        createPost('#DD#1#DD#1', 'Sub-sub-question'),
        createPost('#CM#1', 'Root comment'),
        createPost('#CC#2', 'Another root solution')
      ];
      
      const result = sortPosts(posts);
      
      expect(result.map(p => p.SK)).toEqual([
        'METADATA',
        '#DD#1',
        '#DD#1#CM#1',
        '#DD#1#DD#1',
        '#DD#1#CC#1', // Solution within DD#1 group
        '#CM#1',
        '#CC#1', // Root solutions moved to end
        '#CC#2'
      ]);
    });

    it('should not mutate the original array', () => {
      const originalPosts = [
        createPost('METADATA', 'Root question'),
        createPost('#CC#1', 'Solution'),
        createPost('#CM#1', 'Comment')
      ];
      
      const originalOrder = originalPosts.map(p => p.SK);
      const result = sortPosts(originalPosts);
      
      // Original array should be unchanged
      expect(originalPosts.map(p => p.SK)).toEqual(originalOrder);
      
      // Result should be different
      expect(result.map(p => p.SK)).not.toEqual(originalOrder);
    });
  });
});