import { Post } from '../types/conversation';
import { postTypeService } from './postType';

// Function to check if a post is a solution
// Now uses the correct last-marker logic
const isSolution = (sk: string): boolean => {
  return postTypeService.isSolutionPost(sk);
};

/**
 * Sort posts to move solutions to the end of their sibling groups.
 * 
 * Uses tree-path equivalence principle:
 * - Each SK represents a path in the tree from root to node
 * - Sibling nodes share the same parent path
 * - Tree order = depth-first traversal with custom sibling sorting
 */
export const sortPosts = (postsToSort: Post[]): Post[] => {
  if (!Array.isArray(postsToSort) || postsToSort.length === 0) {
    return [];
  }

  // Helper: Get parent path from a tree path
  const getParentPath = (sk: string): string => {
    if (sk === 'METADATA') return ''; // METADATA is root
    
    // For paths like #CM#1, #DD#1, etc. - parent is empty (root level)
    // For paths like #DD#1#CM#1 - parent is #DD#1
    const parts = sk.split('#').filter(p => p.length > 0);
    if (parts.length <= 2) return ''; // Root level posts (#TYPE#NUM)
    
    // Remove last two parts (type and number) to get parent path
    const parentParts = parts.slice(0, -2);
    return '#' + parentParts.join('#');
  };

  // Create a copy to avoid mutation
  const posts = [...postsToSort];
  
  // Build a map of parent -> children for easy lookup
  const childrenMap = new Map<string, Post[]>();
  
  posts.forEach(post => {
    const parentPath = getParentPath(post.SK);
    if (!childrenMap.has(parentPath)) {
      childrenMap.set(parentPath, []);
    }
    childrenMap.get(parentPath)!.push(post);
  });
  
  // Sort each sibling group (solutions go to end)
  childrenMap.forEach((siblings) => {
    siblings.sort((a, b) => {
      const aIsSolution = isSolution(a.SK);
      const bIsSolution = isSolution(b.SK);
      
      // Solutions go to the end within sibling group
      if (aIsSolution && !bIsSolution) return 1;
      if (!aIsSolution && bIsSolution) return -1;
      
      // Maintain original order for same type (stable sort)
      return 0;
    });
  });
  
  // Reconstruct tree order using depth-first traversal
  const result: Post[] = [];
  const visited = new Set<string>();
  
  // First, ensure METADATA comes first if it exists
  const rootChildren = childrenMap.get('') || [];
  const metadata = rootChildren.find(p => p.SK === 'METADATA');
  if (metadata) {
    result.push(metadata);
    visited.add('METADATA');
  }
  
  const addSubtree = (parentPath: string) => {
    const children = childrenMap.get(parentPath) || [];
    
    children.forEach(child => {
      if (visited.has(child.SK)) return;
      visited.add(child.SK);
      
      result.push(child);
      
      // Recursively add children of this child
      addSubtree(child.SK);
    });
  };
  
  // Collect all remaining posts (root level + orphaned) and sort them together
  const remainingPosts = posts.filter(post => !visited.has(post.SK));
  
  // Sort remaining posts: solutions go to end
  remainingPosts.sort((a, b) => {
    const aIsSolution = isSolution(a.SK);
    const bIsSolution = isSolution(b.SK);
    
    // Solutions go to the end
    if (aIsSolution && !bIsSolution) return 1;
    if (!aIsSolution && bIsSolution) return -1;
    
    // Maintain original order for same type
    return 0;
  });
  
  // Add remaining posts and their subtrees
  remainingPosts.forEach(post => {
    if (!visited.has(post.SK)) {
      result.push(post);
      visited.add(post.SK);
      addSubtree(post.SK);
    }
  });
  
  return result;
};
