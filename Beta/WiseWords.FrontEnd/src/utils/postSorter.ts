import { Post } from '../components/ConversationThread';

// Function to get the indentation level based on SK
const getIndentLevel = (sk: string): number => {
  if (sk === 'METADATA') return 0;
  return (sk.match(/#/g) || []).length - 1; // Count # to determine depth
};

// Function to check if a post is a solution
const isSolution = (sk: string): boolean => {
  return sk.includes('#CC#');
};

// Sort posts to move solutions to the end of their sibling groups
export const sortPosts = (postsToSort: Post[]): Post[] => {
  if (!Array.isArray(postsToSort) || postsToSort.length === 0) {
    return [];
  }

  // Create a copy of the array to avoid mutating the original
  const sorted = [...postsToSort];
  
  // First pass: Move all solution posts to the end of their sibling groups
  let madeChanges = true;
  while (madeChanges) {
    madeChanges = false;
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      
      // Skip if not a solution or if it's the metadata
      if (current.SK === 'METADATA' || !isSolution(current.SK)) {
        continue;
      }
      
      const next = sorted[i + 1];
      if (next.SK === 'METADATA') {
        continue; // Don't move past metadata
      }
      
      const currentLevel = getIndentLevel(current.SK);
      const nextLevel = getIndentLevel(next.SK);
      
      // If next post has lower indentation than current solution, stop
      // Otherwise, continue swapping
      if (nextLevel < currentLevel) {
        continue;
      }
      
      // If we get here, we can swap the current solution with the next post
      [sorted[i], sorted[i + 1]] = [sorted[i + 1], sorted[i]];
      madeChanges = true;
    }
  }
  
  return sorted;
};
