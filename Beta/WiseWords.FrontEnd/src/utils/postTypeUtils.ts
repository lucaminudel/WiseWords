/**
 * Post type utilities for determining post types and display labels
 * based on the SK (sort key) structure and conversation type.
 */

export interface PostTypeInfo {
  isDrillDown: boolean;
  isConclusion: boolean;
  isComment: boolean;
  lastMarker: number;
  markerType: 'CC' | 'DD' | 'CM' | 'NONE';
}

/**
 * Determines the post type by analyzing the last occurrence of type markers in the SK.
 * Post type is determined by the LAST marker in the tree path, not any occurrence.
 * 
 * @param sk - The sort key (e.g., "#DD#1#CM#1", "#CC#1", "METADATA")
 * @returns PostTypeInfo object with type flags and marker information
 */
export const getPostType = (sk: string): PostTypeInfo => {
  if (sk === 'METADATA') {
    return {
      isDrillDown: false,
      isConclusion: false,
      isComment: false,
      lastMarker: -1,
      markerType: 'NONE'
    };
  }

  // Find the last occurrence of each type marker
  const lastCC = sk.lastIndexOf('#CC#');
  const lastDD = sk.lastIndexOf('#DD#');
  const lastCM = sk.lastIndexOf('#CM#');
  
  // Determine which marker appears last
  const lastMarker = Math.max(lastCC, lastDD, lastCM);
  
  // Determine the type based on the last marker
  const isDrillDown = lastMarker !== -1 && lastMarker === lastDD;
  const isConclusion = lastMarker !== -1 && lastMarker === lastCC;
  const isComment = lastMarker === lastCM || lastMarker === -1;
  
  // Determine marker type
  let markerType: 'CC' | 'DD' | 'CM' | 'NONE';
  if (lastMarker !== -1 && lastMarker === lastCC) {
    markerType = 'CC';
  } else if (lastMarker !== -1 && lastMarker === lastDD) {
    markerType = 'DD';
  } else if (lastMarker !== -1 && lastMarker === lastCM) {
    markerType = 'CM';
  } else {
    markerType = 'NONE';
  }

  return {
    isDrillDown,
    isConclusion,
    isComment,
    lastMarker,
    markerType
  };
};

/**
 * Gets the display text for a post type based on SK and conversation type.
 * 
 * @param sk - The sort key
 * @param convoType - The conversation type ('QUESTION', 'PROBLEM', 'DILEMMA')
 * @returns Human-readable post type label
 */
export const getPostTypeDisplay = (sk: string, convoType?: string): string => {
  if (sk === 'METADATA') return '';
  
  const postType = getPostType(sk);
  
  // If no markers found, default to Comment
  if (postType.lastMarker === -1) return 'Comment';
  
  // Check which marker was the last one
  if (postType.isConclusion) {
    switch(convoType) {
      case 'QUESTION': return 'Proposed Answer';
      case 'PROBLEM': return 'Proposed Solution';
      case 'DILEMMA': return 'Proposed Choice';
      default: return 'Conclusion';
    }
  } else if (postType.isDrillDown) {
    switch(convoType) {
      case 'QUESTION': return 'Sub-question';
      case 'PROBLEM': return 'Sub-problem';
      case 'DILEMMA': return 'Sub-dilemma';
      default: return 'Drill-down';
    }
  } else if (postType.isComment) {
    return 'Comment';
  }
  
  // Default to Comment if no type is determined
  return 'Comment';
};

/**
 * Calculates the depth/indentation level of a post based on its SK.
 * Matches the original component logic: count # characters minus 1.
 * 
 * @param sk - The sort key
 * @returns Depth level (0 for METADATA, 1+ for nested posts)
 */
export const getPostDepth = (sk: string): number => {
  if (sk === 'METADATA') return 0;
  return (sk.match(/#/g) || []).length - 1;
};

/**
 * Checks if a post is a solution/conclusion post based on the LAST marker.
 * This fixes the bug in the original postSorter.ts which checked any occurrence.
 * 
 * @param sk - The sort key
 * @returns True if the post is a conclusion/solution post
 */
export const isSolutionPost = (sk: string): boolean => {
  return getPostType(sk).isConclusion;
};

/**
 * Checks if a post is a drill-down post based on the LAST marker.
 * 
 * @param sk - The sort key
 * @returns True if the post is a drill-down post
 */
export const isDrillDownPost = (sk: string): boolean => {
  return getPostType(sk).isDrillDown;
};

/**
 * Checks if a post is a comment post based on the LAST marker.
 * 
 * @param sk - The sort key
 * @returns True if the post is a comment post
 */
export const isCommentPost = (sk: string): boolean => {
  return getPostType(sk).isComment;
};