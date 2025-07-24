import { Post } from '../types/conversation';
import { postTypeService } from './postType';


/**
 * Adjusts post order to place solutions after comments but before drill-downs.
 * 
 * PREREQUISITE: Posts must be lexicographically sorted by SK (Sort Key).
 * The API provides this ordering, which naturally creates correct tree traversal:
 * - "#CC#1", "#CM#1", "#CM#2", "#DD#1", "#DD#1#CM#1", "#DD#1#CC#1"
 * - Parent nodes appear before children automatically
 * - Siblings are ordered by their numeric suffixes
 * 
 * This function modifies the API's ordering within sibling groups to:
 * - Comments first (contiguous block)
 * - Solutions after comments 
 * - Drill-downs last
 * Example: "#CC#1", "#CM#1", "#CM#2", "#DD#1" becomes "#CM#1", "#CM#2", "#CC#1", "#DD#1"
 */
export const sortPosts = (apiSortedPosts: Post[]): Post[] => {
  if (!Array.isArray(apiSortedPosts) || apiSortedPosts.length === 0) {
    return [];
  }

  const getParentPath = (sk: string): string => {
    if (sk === 'METADATA') return '';
    const parts = sk.split('#').filter(p => p.length > 0);
    if (parts.length <= 2) return '';
    const parentParts = parts.slice(0, -2);
    return '#' + parentParts.join('#');
  };

  const getPostPriority = (typeInfo: any) => {
    if (typeInfo.isComment) return 1;
    if (typeInfo.isConclusion) return 2;
    if (typeInfo.isDrillDown) return 3;
    return 4; // fallback for METADATA or other types
  };

  // Create a copy and augment with sorting info
  const postsWithInfo = apiSortedPosts.map((post, index) => ({
    ...post,
    parentPath: getParentPath(post.SK),
    priority: getPostPriority(postTypeService.getPostType(post.SK)),
    originalIndex: index, // for stable sort
  }));

  // Perform a single, stable sort
  postsWithInfo.sort((a, b) => {
    // Primary sort: by parent path (maintains tree structure)
    if (a.parentPath < b.parentPath) return -1;
    if (a.parentPath > b.parentPath) return 1;

    // Secondary sort: by custom priority
    if (a.priority < b.priority) return -1;
    if (a.priority > b.priority) return 1;

    // Tertiary sort: maintain original order for same-type siblings
    return a.originalIndex - b.originalIndex;
  });

  // Return clean Post objects without sorting metadata
  return postsWithInfo.map(({ originalIndex, parentPath, priority, ...cleanPost }) => cleanPost);
};