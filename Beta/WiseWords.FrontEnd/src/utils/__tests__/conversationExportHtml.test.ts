import { describe, it, expect } from 'vitest';
import { buildConversationHtml } from '../conversationExportHtml';
import type { ExportPost } from '../conversationExport';

const sample: ExportPost = {
  Title: 'Root Title',
  MessageBody: 'Root Body',
  Author: 'alice',
  UpdatedAt: '01/01/2025, 12:00:00',
  Type: 'QUESTION',
  Posts: []
};

describe('buildConversationHtml', () => {
  it('includes doctype, references json filename, and basic scaffolding', () => {
    const html = buildConversationHtml(sample, { jsonFileName: 'conversation-abc.json' });
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('conversation-abc.json');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<input id="jsonFile"');
  });
});
