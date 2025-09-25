import { Post } from '../types/conversation';
import { sortPosts } from './postSorter';
import { formatUnixTimestamp } from './dateUtils';
import { postTypeService } from './postType';

export interface ExportPost {
  Title?: string;
  MessageBody: string;
  Author: string;
  UpdatedAt: string; // human-readable
  Type?: string; // Only for the root conversation (conversation type)
  PostType?: string; // For non-root posts: 'Comment', 'Sub-problem', 'Proposed Solution', etc.
  Posts?: ExportPost[];
}

function getParentPath(sk: string): string {
  const parts = sk.split('#').filter(p => p.length > 0);
  if (parts.length <= 2) return '';
  const parentParts = parts.slice(0, -2);
  return '#' + parentParts.join('#');
}

export function buildNestedConversation(conversation: Post, allPosts: Post[], options?: { locale?: string }): ExportPost {
  // Prepare root export object without PK/SK and with readable date and renamed type
  const root: ExportPost = {
    Title: conversation.Title,
    MessageBody: conversation.MessageBody,
    Author: conversation.Author,
    UpdatedAt: formatUnixTimestamp(conversation.UpdatedAt, options?.locale),
    ...(conversation.ConvoType ? { Type: conversation.ConvoType } : {}),
    Posts: []
  };

  // Exclude the METADATA item from posts if present
  const posts = allPosts.filter(p => p.SK !== 'METADATA');

  // Sort posts to match UI presentation
  const sorted = sortPosts(posts);

  // Build a map from SK to ExportPost node for quick linking
  const nodeBySk = new Map<string, ExportPost>();

  // First pass: create nodes
  for (const p of sorted) {
    const postType = postTypeService.getPostTypeDisplay(p.SK, conversation.ConvoType);
    nodeBySk.set(p.SK, {
      Title: p.Title,
      MessageBody: p.MessageBody,
      Author: p.Author,
      UpdatedAt: formatUnixTimestamp(p.UpdatedAt, options?.locale),
      PostType: postType || undefined,
      Posts: []
    });
  }

  // Second pass: link nodes into a tree
  const rootChildren: ExportPost[] = [];
  for (const p of sorted) {
    const parentPath = getParentPath(p.SK);
    const node = nodeBySk.get(p.SK)!;

    if (parentPath === '') {
      // Direct child of root conversation
      rootChildren.push(node);
    } else {
      const parentNode = nodeBySk.get(parentPath);
      if (parentNode) {
        if (!parentNode.Posts) parentNode.Posts = [];
        parentNode.Posts.push(node);
      } else {
        // Orphan fallback: if parent not found, attach to root
        rootChildren.push(node);
      }
    }
  }

  root.Posts = rootChildren;
  return root;
}

export function toJsonString(exportData: ExportPost): string {
  return JSON.stringify(exportData, null, 2);
}
