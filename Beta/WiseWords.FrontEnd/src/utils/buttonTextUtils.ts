/**
 * Button text utilities for generating contextual button labels
 * based on conversation type and action type.
 */

import { ConversationType } from '../types/conversation';
import { CONVERSATION_BUTTON_LABELS } from './conversationLabelsConstants';

export type ButtonAction = 'sub-action' | 'propose-solution';

/**
 * Gets the contextual text for sub-action buttons (drill-down actions).
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for sub-actions
 */
export const getSubActionButtonText = (convoType?: string): string => {
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
  return labels?.drillDown || 'Drill-down';
};

/**
 * Gets the contextual text for solution/answer buttons.
 * 
 * @param convoType - The conversation type
 * @returns Contextual button text for proposing solutions
 */
export const getProposeSolutionButtonText = (convoType?: string): string => {
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
  return labels?.buttonPropose || 'Propose';
};

/**
 * Gets the full button text with "Add" prefix for sub-action buttons.
 * 
 * @param convoType - The conversation type
 * @returns Full button text with "Add" prefix
 */
export const getAddSubActionButtonText = (convoType?: string): string => {
  const labels = CONVERSATION_BUTTON_LABELS[convoType as ConversationType];
  return labels?.buttonAdd || 'Add Sub-item';
};