/**
 * Conversation labels and constants configuration
 */

/**
 * Button labels configuration for conversation types
 */
export const CONVERSATION_BUTTON_LABELS = {
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
} as const;

/**
 * Post type labels configuration for conversation types
 */
export const CONVERSATION_POST_LABELS = {
  QUESTION: {
    drillDown: 'Sub-question',
    conclusion: 'Proposed Answer'
  },
  PROBLEM: {
    drillDown: 'Sub-problem',
    conclusion: 'Proposed Solution'
  },
  DILEMMA: {
    drillDown: 'Sub-dilemma',
    conclusion: 'Proposed Choice'
  }
} as const;

/**
 * Conversation type display labels mapping
 */
export const CONVERSATION_TYPE_LABELS = {
    QUESTION: 'Question',
    PROBLEM: 'Problem', 
    DILEMMA: 'Dilemma',
} as const;