import { describe, it, expect } from 'vitest';
import { buildNestedConversation } from '../conversationExport';
import type { Post } from '../../types/conversation';

const root: Post = {
  PK: 'CONVO#abc',
  SK: 'METADATA',
  Title: 'Root Title',
  MessageBody: 'Root message',
  Author: 'alice',
  UpdatedAt: '1700000000',
  ConvoType: 'QUESTION'
};

const posts: Post[] = [
  {
    PK: 'CONVO#abc',
    SK: '#CM#1',
    MessageBody: 'Comment 1',
    Author: 'bob',
    UpdatedAt: '1700000001',
    Title: undefined,
    ConvoType: undefined,
  },
  {
    PK: 'CONVO#abc',
    SK: '#DD#a',
    Title: 'Drilldown A',
    MessageBody: 'Sub-problem A',
    Author: 'carol',
    UpdatedAt: '1700000100',
    ConvoType: undefined,
  },
  {
    PK: 'CONVO#abc',
    SK: '#DD#a#CM#b',
    MessageBody: 'Comment b on A',
    Author: 'dave',
    UpdatedAt: '1700000200',
    Title: undefined,
    ConvoType: undefined,
  },
  {
    PK: 'CONVO#abc',
    SK: '#CC#c',
    Title: 'Conclusion C',
    MessageBody: 'Solution C',
    Author: 'erin',
    UpdatedAt: '1700000300',
    ConvoType: undefined,
  }
];

describe('buildNestedConversation', () => {
  it('builds nested JSON, removes PK/SK, renames ConvoType to Type, converts UpdatedAt', () => {
    const result = buildNestedConversation(root, posts, { locale: 'en-GB' });

    // Root structure
    expect(result).toMatchObject({
      Title: 'Root Title',
      MessageBody: 'Root message',
      Author: 'alice',
      Type: 'QUESTION',
    });

    // UpdatedAt is not the raw unix string
    expect(result.UpdatedAt).not.toBe('1700000000');
    expect(result.UpdatedAt).not.toBe('Invalid date');

    // Root children include comment, drilldown (with nested comment), conclusion
    expect(result.Posts).toBeDefined();
    const children = result.Posts!;
    expect(children.length).toBeGreaterThanOrEqual(3);

    // Find drilldown A and ensure it has its nested comment
    const drill = children.find(c => c.Title === 'Drilldown A');
    expect(drill).toBeDefined();
    expect(drill!.Posts).toBeDefined();
    expect(drill!.Posts!.some(p => p.MessageBody === 'Comment b on A')).toBe(true);

    // Ensure none of the nodes contain PK or SK
    const stringify = JSON.stringify(result);
    expect(stringify.includes('"PK"')).toBe(false);
    expect(stringify.includes('"SK"')).toBe(false);

    // Should include post type labels for non-root posts
    expect(stringify.includes('"PostType"')).toBe(true);
  });
});
