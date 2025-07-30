import { ConversationType } from '../types/conversation';
import { CONVERSATION_POST_LABELS } from '../utils/conversationLabelsConstants';

type PostMarkerType = 'CC' | 'DD' | 'CM' | 'NONE';

interface PostTypeInfo {
  isDrillDown: boolean;
  isConclusion: boolean;
  isComment: boolean;
  lastMarker: number;
  markerType: PostMarkerType;
}

export const postTypeService = {
  /**
   * Determines the post type by analyzing the last occurrence of type markers in the SK.
   */
  getPostType(sk: string): PostTypeInfo {
    if (!sk) {
      throw new Error('Invalid SK value: it cannot be an empty string.');
    }

    if (sk === 'METADATA') {
      return {
        isDrillDown: false,
        isConclusion: false,
        isComment: false,
        lastMarker: -1,
        markerType: 'NONE'
      };
    }

    const lastCC = sk.lastIndexOf('#CC#');
    const lastDD = sk.lastIndexOf('#DD#');
    const lastCM = sk.lastIndexOf('#CM#');
    const lastMarker = Math.max(lastCC, lastDD, lastCM);

    if (lastMarker === -1) {
      throw new Error(`Could not determine post type for SK: "${sk}". No valid markers found.`);
    }
    
    const isDrillDown = lastMarker === lastDD;
    const isConclusion = lastMarker === lastCC;
    const isComment = lastMarker === lastCM;
    
    let markerType: PostMarkerType;
    if (isConclusion) {
      markerType = 'CC';
    } else if (isDrillDown) {
      markerType = 'DD';
    } else if (isComment) {
      markerType = 'CM';
    } else {
      // This case should be unreachable due to the error thrown above when lastMarker is -1.
      // If it were reached, it would indicate a logic error in the marker detection.
      throw new Error(`Logic error: Could not assign a marker type for SK: "${sk}"`);
    }
    
    return { isDrillDown, isConclusion, isComment, lastMarker, markerType };
  },

  /**
   * Gets the display text for a post type based on its SK and conversation type.
   */
  getPostTypeDisplay(sk: string, convoType?: string): string {
    if (sk === 'METADATA') return '';
    
    const { isComment, isConclusion, isDrillDown } = this.getPostType(sk);
    const labels = CONVERSATION_POST_LABELS[convoType as ConversationType] || {
      drillDown: 'Drill-down',
      conclusion: 'Conclusion'
    };
    
    if (isComment) return 'Comment';
    if (isConclusion) return labels.conclusion;
    if (isDrillDown) return labels.drillDown;

    // This line should be unreachable because getPostType would have thrown an error.
    return '';
  },


  /**
   * Gets the depth level of a post based on its SK.
   */
  getPostDepth(sk: string): number {
    if (sk === 'METADATA') return 0;
    return (sk.match(/#/g) || []).length / 2;
  }
};
