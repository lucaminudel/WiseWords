/**
 * Button text utilities for generating contextual button labels
 * based on conversation type and action type.
 */

export type ConversationType = 'QUESTION' | 'PROBLEM' | 'DILEMMA';
export type ButtonAction = 'sub-action' | 'propose-solution';

interface ButtonLabels {
  drillDown: string;
  conclusion: string;
  buttonAdd: string;
  buttonPropose: string;
}

const TYPE_LABELS: Record<ConversationType, ButtonLabels> = {
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

/**
 * Gets the contextual text for sub-action buttons (drill-down actions).
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for sub-actions
 */
export const getSubActionButtonText = (convoType?: string): string => {
  const labels = TYPE_LABELS[convoType as ConversationType];
  return labels?.drillDown || 'Drill-down';
};

/**
 * Gets the contextual text for solution/answer buttons.
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for proposing solutions
 */
export const getProposeSolutionButtonText = (convoType?: string): string => {
  const labels = TYPE_LABELS[convoType as ConversationType];
  return labels?.buttonPropose || 'Propose';
};

/**
 * Gets the full button text with "Add" prefix for sub-action buttons.
 * 
 * @param convoType - The conversation type
 * @returns Full button text with "Add" prefix
 */
export const getAddSubActionButtonText = (convoType?: string): string => {
  const labels = TYPE_LABELS[convoType as ConversationType];
  return labels?.buttonAdd || 'Add Sub-item';
};