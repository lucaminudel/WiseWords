import { describe, it, expect } from 'vitest';
import { Post } from '../../types/conversation';
import { sortPosts } from '../../utils/postSorter';

// Helper to convert dd/mm/yyyy, hh:mm:ss string to a Unix timestamp number for test data
const toUnix = (dateString: string): number => {
  const parts = dateString.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return 0;
  // new Date(year, monthIndex, day, hours, minutes, seconds)
  const date = new Date(Date.UTC(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6])));
  return date.getTime();
};

describe('sortPosts', () => {
    it('should return empty array for empty input', () => {
        expect(sortPosts([])).toEqual([]);
    });

    it('should handle a single post', () => {
        const posts: Post[] = [{
            PK: '1',
            SK: '#CM#1',
            MessageBody: 'test',
            Author: 'test',
            UpdatedAt: '1722181337000' // Using a string timestamp as per Post type
        }];
        expect(sortPosts(posts)).toEqual(posts);
    });

    it('should order posts by type first, then by date ascending', () => {
        const posts: Post[] = [
            { PK: '1', SK: '#DD#1', MessageBody: 'drilldown', Author: 'test', UpdatedAt: String(toUnix('21/10/2025, 10:10:10')) },
            { PK: '1', SK: '#CM#1', MessageBody: 'comment oldest', Author: 'test', UpdatedAt: String(toUnix('01/10/2025, 16:14:20')) },
            { PK: '1', SK: '#CC#1', MessageBody: 'solution', Author: 'test', UpdatedAt: String(toUnix('28/07/2025, 16:14:20')) },
            { PK: '1', SK: '#CM#2', MessageBody: 'comment newest', Author: 'test', UpdatedAt: String(toUnix('15/10/2025, 16:14:20')) },
        ];
        
        const expected: Post[] = [
            { PK: '1', SK: '#CM#1', MessageBody: 'comment oldest', Author: 'test', UpdatedAt: String(toUnix('01/10/2025, 16:14:20')) },
            { PK: '1', SK: '#CM#2', MessageBody: 'comment newest', Author: 'test', UpdatedAt: String(toUnix('15/10/2025, 16:14:20')) },
            { PK: '1', SK: '#CC#1', MessageBody: 'solution', Author: 'test', UpdatedAt: String(toUnix('28/07/2025, 16:14:20')) },
            { PK: '1', SK: '#DD#1', MessageBody: 'drilldown', Author: 'test', UpdatedAt: String(toUnix('21/10/2025, 10:10:10')) },
        ];
        
        expect(sortPosts(posts)).toEqual(expected);
    });

    it('should respect indentation levels (parent path)', () => {
        const posts: Post[] = [
            { PK: '1', SK: '#CM#1', MessageBody: 'root comment newest', Author: 'test', UpdatedAt: String(toUnix('04/01/2025, 00:00:00')) },
            { PK: '1', SK: '#CM#2', MessageBody: 'root comment oldest', Author: 'test', UpdatedAt: String(toUnix('01/01/2025, 00:00:00')) },
            { PK: '1', SK: '#DD#1', MessageBody: 'drilldown', Author: 'test', UpdatedAt: String(toUnix('02/01/2025, 00:00:00')) },
            { PK: '1', SK: '#DD#1#CM#1', MessageBody: 'nested comment inbetween oldest and newest', Author: 'test', UpdatedAt: String(toUnix('03/01/2025, 00:00:00')) },
        ];

        const expected: Post[] = [
            { PK: '1', SK: '#CM#2', MessageBody: 'root comment oldest', Author: 'test', UpdatedAt: String(toUnix('01/01/2025, 00:00:00')) },
            { PK: '1', SK: '#CM#1', MessageBody: 'root comment newest', Author: 'test', UpdatedAt: String(toUnix('04/01/2025, 00:00:00')) },
            { PK: '1', SK: '#DD#1', MessageBody: 'drilldown', Author: 'test', UpdatedAt: String(toUnix('02/01/2025, 00:00:00')) },
            { PK: '1', SK: '#DD#1#CM#1', MessageBody: 'nested comment inbetween oldest and newest', Author: 'test', UpdatedAt: String(toUnix('03/01/2025, 00:00:00')) },
        ];

        expect(sortPosts(posts)).toEqual(expected);
    });

  it('should sort posts correctly by post type #CM# > #CC# > #DD#  and among siblings of the same type by ascending UpdateAt date', () => {
    const apiSortedPosts: Post[] = [
      { PK: 'CONV#1', SK: '#CC#0', MessageBody: 'Proposed Solution 0', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:48:23')) },
      { PK: 'CONV#1', SK: '#CM#1', MessageBody: 'Comment 1', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 16:14:20')) },
      { PK: 'CONV#1', SK: '#CM#2', MessageBody: 'Comment 2', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 12:15:17')) },
      { PK: 'CONV#1', SK: '#CM#3', MessageBody: 'Comment 3', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 13:05:37')) },
      { PK: 'CONV#1', SK: '#CM#4', MessageBody: 'Comment 4', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#DD#1', MessageBody: 'Sub-problem 6', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:39:03')) },
      { PK: 'CONV#1', SK: '#DD#1#CC#2', MessageBody: 'Proposed Solution 6.4', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:48:23')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#4', MessageBody: 'Comment 6.1', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 13:30:46')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#5', MessageBody: 'Comment 6.2', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 16:15:03')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#6', MessageBody: 'Comment 6.3', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2', MessageBody: 'Sub-problem 7', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:39:03')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#7', MessageBody: 'Comment 7.1', Author: 'User', UpdatedAt: String(toUnix('28/06/2025, 13:30:46')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#8', MessageBody: 'Comment 7.2', Author: 'User', UpdatedAt: String(toUnix('28/08/2025, 16:15:03')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#9', MessageBody: 'Comment 7.3', Author: 'User', UpdatedAt: String(toUnix('10/03/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#DD#3', MessageBody: 'Sub-problem 8', Author: 'User', UpdatedAt: String(toUnix('09/01/2025, 11:39:03')) },
    ];

    const expectedSortedPosts: Post[] = [
      { PK: 'CONV#1', SK: '#CM#4', MessageBody: 'Comment 4', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#CM#2', MessageBody: 'Comment 2', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 12:15:17')) },
      { PK: 'CONV#1', SK: '#CM#3', MessageBody: 'Comment 3', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 13:05:37')) },
      { PK: 'CONV#1', SK: '#CM#1', MessageBody: 'Comment 1', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 16:14:20')) },
      { PK: 'CONV#1', SK: '#CC#0', MessageBody: 'Proposed Solution 0', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:48:23')) },
      { PK: 'CONV#1', SK: '#DD#3', MessageBody: 'Sub-problem 8', Author: 'User', UpdatedAt: String(toUnix('09/01/2025, 11:39:03')) },
      { PK: 'CONV#1', SK: '#DD#1', MessageBody: 'Sub-problem 6', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:39:03')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#6', MessageBody: 'Comment 6.3', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#4', MessageBody: 'Comment 6.1', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 13:30:46')) },
      { PK: 'CONV#1', SK: '#DD#1#CM#5', MessageBody: 'Comment 6.2', Author: 'User', UpdatedAt: String(toUnix('28/07/2025, 16:15:03')) },
      { PK: 'CONV#1', SK: '#DD#1#CC#2', MessageBody: 'Proposed Solution 6.4', Author: 'User', UpdatedAt: String(toUnix('10/07/2025, 11:48:23')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2', MessageBody: 'Sub-problem 7', Author: 'User', UpdatedAt: String(toUnix('09/07/2025, 11:39:03')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#9', MessageBody: 'Comment 7.3', Author: 'User', UpdatedAt: String(toUnix('10/03/2025, 11:44:32')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#7', MessageBody: 'Comment 7.1', Author: 'User', UpdatedAt: String(toUnix('28/06/2025, 13:30:46')) },
      { PK: 'CONV#1', SK: '#DD#1#DD#2#CM#8', MessageBody: 'Comment 7.2', Author: 'User', UpdatedAt: String(toUnix('28/08/2025, 16:15:03')) },
    ];

    const sortedPosts = sortPosts(apiSortedPosts);

    expect(sortedPosts).toEqual(expectedSortedPosts);
  });
});