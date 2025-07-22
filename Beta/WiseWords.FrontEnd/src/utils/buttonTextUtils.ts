/**
 * Button text utilities for generating contextual button labels
 * based on conversation type and action type.
 */

export type ConversationType = 'QUESTION' | 'PROBLEM' | 'DILEMMA';
export type ButtonAction = 'sub-action' | 'propose-solution';

/**
 * Gets the contextual text for sub-action buttons (drill-down actions).
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for sub-actions
 */
export const getSubActionButtonText = (convoType?: string): string => {
  switch (convoType) {
    case 'QUESTION': return 'Sub-question';
    case 'PROBLEM': return 'Sub-problem';
    case 'DILEMMA': return 'Sub-dilemma';
    default: return 'Sub-question'; // Default fallback
  }
};

/**
 * Gets the contextual text for solution/answer buttons.
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for proposing solutions
 */
export const getProposeSolutionButtonText = (convoType?: string): string => {
  switch (convoType) {
    case 'QUESTION': return 'Propose Answer';
    case 'PROBLEM': return 'Suggest Solution';
    case 'DILEMMA': return 'Propose Choice';
    default: return 'Propose Answer'; // Default fallback
  }
};

/**
 * Gets the full button text with "Add" prefix for sub-action buttons.
 * 
 * @param convoType - The conversation type
 * @returns Full button text with "Add" prefix
 */
export const getAddSubActionButtonText = (convoType?: string): string => {
  return `Add ${getSubActionButtonText(convoType)}`;
};