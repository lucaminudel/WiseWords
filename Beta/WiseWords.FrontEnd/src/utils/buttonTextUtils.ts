/**
 * Button text utilities for generating contextual button labels
 * based on conversation type and action type.
 */

import { ConversationType } from '../types/conversation';
import { CONVERSATION_BUTTON_LABELS } from './conversationLabelsConstants';

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
<<<<<<< HEAD
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
=======
  const labels = TYPE_LABELS[convoType as ConversationType];
>>>>>>> 5e319f7468a819d83bc0a214f4f067d3fa56b434
  return labels?.drillDown || 'Drill-down';
};

/**
 * Gets the contextual text for solution/answer buttons.
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for proposing solutions
 */
export const getProposeSolutionButtonText = (convoType?: string): string => {
<<<<<<< HEAD
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
=======
  const labels = TYPE_LABELS[convoType as ConversationType];
>>>>>>> 5e319f7468a819d83bc0a214f4f067d3fa56b434
  return labels?.buttonPropose || 'Propose';
};

/**
 * Gets the full button text with "Add" prefix for sub-action buttons.
 * 
 * @param convoType - The conversation type
 * @returns Full button text with "Add" prefix
 */
export const getAddSubActionButtonText = (convoType?: string): string => {
<<<<<<< HEAD
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
=======
  const labels = TYPE_LABELS[convoType as ConversationType];
>>>>>>> 5e319f7468a819d83bc0a214f4f067d3fa56b434
  return labels?.buttonAdd || 'Add Sub-item';
};