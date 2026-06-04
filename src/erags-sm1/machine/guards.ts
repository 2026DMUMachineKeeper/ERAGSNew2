import type { TreatmentContext } from './types';

export const isChecked = (context: TreatmentContext): boolean =>
  context.isChecked === true;

export const hasNextStep = (context: TreatmentContext): boolean =>
  context.currentIndex < context.steps.length - 1;

export const currentStepRequiresInventory = (
  context: TreatmentContext,
): boolean =>
  typeof context.steps[context.currentIndex]?.requiredItemId === 'number';
