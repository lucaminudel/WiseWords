export type ConversationType = 'QUESTION' | 'PROBLEM' | 'DILEMMA';
export type PostMarkerType = 'CC' | 'DD' | 'CM' | 'NONE';

export interface PostTypeInfo {
  isDrillDown: boolean;
  isConclusion: boolean;
  isComment: boolean;
  lastMarker: number;
  markerType: PostMarkerType;
}

interface PostTypeLabels {
  drillDown: string;
  conclusion: string;
  buttonAdd: string;
  buttonPropose: string;
}

const TYPE_LABELS: Record<ConversationType, PostTypeLabels> = {
  QUESTION: {
    drillDown: 'Sub-question',
    conclusion: 'Proposed Answer',
    buttonAdd: 'Add Sub-question',
    buttonPropose: 'Propose Answer'
  },
  PROBLEM: {
    drillDown: 'Sub-problem',
    conclusion: 'Proposed Solution',
    buttonAdd: 'Add Sub-problem',
    buttonPropose: 'Suggest Solution'
  },
  DILEMMA: {
    drillDown: 'Sub-dilemma',
    conclusion: 'Proposed Choice',
    buttonAdd: 'Add Sub-dilemma',
    buttonPropose: 'Propose Choice'
  }
};

export const postTypeService = {
  /**
   * Determines the post type by analyzing the last occurrence of type markers in the SK.
   */
  getPostType(sk: string): PostTypeInfo {
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
    
    const isDrillDown = lastMarker !== -1 && lastMarker === lastDD;
    const isConclusion = lastMarker !== -1 && lastMarker === lastCC;
    const isComment = lastMarker === lastCM || lastMarker === -1;
    
    let markerType: PostMarkerType;
    if (lastMarker !== -1 && lastMarker === lastCC) {
      markerType = 'CC';
    } else if (lastMarker !== -1 && lastMarker === lastDD) {
      markerType = 'DD';
    } else if (lastMarker !== -1 && lastMarker === lastCM) {
      markerType = 'CM';
    } else {
      markerType = 'NONE';
    }
    
    return { isDrillDown, isConclusion, isComment, lastMarker, markerType };
  },

  /**
   * Gets the display text for a post type based on its SK and conversation type.
   */
  getPostTypeDisplay(sk: string, convoType?: string): string {
    if (sk === 'METADATA') return '';
    
    const { isComment, isConclusion, isDrillDown } = this.getPostType(sk);
    const labels = TYPE_LABELS[convoType as ConversationType] || {
      drillDown: 'Drill-down',
      conclusion: 'Conclusion',
      buttonAdd: 'Add Sub-item',
      buttonPropose: 'Propose'
    };
    
    if (isComment) return 'Comment';
    if (isConclusion) return labels.conclusion;
    if (isDrillDown) return labels.drillDown;
    return 'Comment';
  },

  /**
   * Gets the button text for adding sub-items.
   */
  getAddSubActionButtonText(convoType?: string): string {
    const labels = TYPE_LABELS[convoType as ConversationType];
    return labels?.buttonAdd || 'Add Sub-item';
  },

  /**
   * Gets the button text for proposing solutions/answers.
   */
  getProposeSolutionButtonText(convoType?: string): string {
    const labels = TYPE_LABELS[convoType as ConversationType];
    return labels?.buttonPropose || 'Propose';
  },

  /**
   * Gets the depth level of a post based on its SK.
   */
  getPostDepth(sk: string): number {
    return (sk.match(/#/g) || []).length - 1;
  },

  /**
   * Checks if a post is a solution/conclusion post.
   */
  isSolutionPost(sk: string): boolean {
    return this.getPostType(sk).isConclusion;
  }
};
