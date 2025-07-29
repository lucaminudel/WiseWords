import { Post } from '../types/conversation';
import { postTypeService } from './postType';

/**
 * Sorts posts based on parent-child hierarchy, post type, and timestamp.
 */
export const sortPosts = (apiSortedPosts: Post[]): Post[] => {
  if (!Array.isArray(apiSortedPosts) || apiSortedPosts.length === 0) {
    return [];
  }

  const getParentPath = (sk: string): string => {
    const parts = sk.split('#').filter(p => p.length > 0);
    if (parts.length <= 2) return ''; // Root level posts
    const parentParts = parts.slice(0, -2);
    return '#' + parentParts.join('#');
  };

  const getPostPriority = (post: Post): number => {
    const typeInfo = postTypeService.getPostType(post.SK);
    if (typeInfo.isComment) return 1;
    if (typeInfo.isConclusion) return 2;
    if (typeInfo.isDrillDown) return 3;
    return 4; // Fallback for any other types
  };

  // Create a copy and augment with sorting info
  const postsWithInfo = apiSortedPosts.map((post, index) => ({
    ...post,
    parentPath: getParentPath(post.SK),
    priority: getPostPriority(post),
    originalIndex: index, // for stable sort
    timestamp: post.UpdatedAt ? parseInt(post.UpdatedAt, 10) : 0,
  }));

  // Perform a single, stable sort
  postsWithInfo.sort((a, b) => {
    // 1. Primary sort: by parent path (maintains tree structure)
    if (a.parentPath < b.parentPath) return -1;
    if (a.parentPath > b.parentPath) return 1;

    // 2. Secondary sort: by custom priority (Comments > Solutions > Drill-downs)
    if (a.priority < b.priority) return -1;
    if (a.priority > b.priority) return 1;

    // 3. Tertiary sort: by date, ascending (oldest first)
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }

    // 4. Quaternary sort: maintain original API order as a tie-breaker
    return a.originalIndex - b.originalIndex;
  });

  // Return clean Post objects without sorting metadata
  return postsWithInfo.map(({ originalIndex, parentPath, priority, timestamp, ...cleanPost }) => cleanPost);
};