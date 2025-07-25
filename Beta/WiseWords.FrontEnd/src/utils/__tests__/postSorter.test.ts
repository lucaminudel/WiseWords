import { describe, it, expect } from 'vitest';
import { Post } from '../../types/conversation';
import { sortPosts } from '../../utils/postSorter';

describe('sortPosts', () => {
    it('should return empty array for empty input', () => {
        expect(sortPosts([])).toEqual([]);
    });

    it('should handle single post', () => {
        const posts: Post[] = [{
            PK: '1',
            SK: 'METADATA',
            Title: 'Test Title',
            MessageBody: 'test',
            Author: 'test',
            UpdatedAt: '123'
        }];
        expect(sortPosts(posts)).toEqual(posts);
    });

    it('should keep non-solution posts in original order', () => {
        const posts: Post[] = [
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            },
            {
                PK: '1',
                SK: '#CM#1',
                MessageBody: 'comment1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            }
        ];
        
        // Expected: Comments first, then METADATA (due to priority sorting)
        const expected = [
            {
                PK: '1',
                SK: '#CM#1',
                MessageBody: 'comment1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            }
        ];
        
        expect(sortPosts(posts)).toEqual(expected);
    });

    it('should order Comments before Solutions (legacy compatibility)', () => {
        const posts: Post[] = [
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: '#CM#3',
                MessageBody: 'comment3',
                Author: 'test',
                UpdatedAt: '126'
            }
        ];

        const expected = [
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: '#CM#3',
                MessageBody: 'comment3',
                Author: 'test',
                UpdatedAt: '126'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            }
        ];

        expect(sortPosts(posts)).toEqual(expected);
    });

    it('should respect indentation levels when moving solutions', () => {
        const posts: Post[] = [
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#CM#2#CM#1',
                MessageBody: 'nested comment',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: '#CM#3',
                MessageBody: 'comment3',
                Author: 'test',
                UpdatedAt: '126'
            }
        ];

        const expected = [
            {
                PK: '1',
                SK: '#CM#3',
                MessageBody: 'comment3',
                Author: 'test',
                UpdatedAt: '126'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            },
            {
                PK: '1',
                SK: '#CM#2#CM#1',
                MessageBody: 'nested comment',
                Author: 'test',
                UpdatedAt: '125'
            }
        ];

        expect(sortPosts(posts)).toEqual(expected);
    });

    it('should order posts as Comments then Solutions then Drill-downs', () => {
        const posts: Post[] = [
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: '#DD#3',
                MessageBody: 'drilldown3',
                Author: 'test',
                UpdatedAt: '126'
            },
            {
                PK: '1',
                SK: '#CM#4',
                MessageBody: 'comment4',
                Author: 'test',
                UpdatedAt: '127'
            }
        ];

        const expected = [
            {
                PK: '1',
                SK: '#CM#2',
                MessageBody: 'comment2',
                Author: 'test',
                UpdatedAt: '125'
            },
            {
                PK: '1',
                SK: '#CM#4',
                MessageBody: 'comment4',
                Author: 'test',
                UpdatedAt: '127'
            },
            {
                PK: '1',
                SK: '#CC#1',
                MessageBody: 'solution1',
                Author: 'test',
                UpdatedAt: '124'
            },
            {
                PK: '1',
                SK: '#DD#3',
                MessageBody: 'drilldown3',
                Author: 'test',
                UpdatedAt: '126'
            },
            {
                PK: '1',
                SK: 'METADATA',
                MessageBody: 'root',
                Author: 'test',
                UpdatedAt: '123'
            }
        ];

        expect(sortPosts(posts)).toEqual(expected);
    });
});