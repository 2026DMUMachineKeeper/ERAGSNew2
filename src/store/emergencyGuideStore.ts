import { create } from 'zustand';

import type { EmergencyGuideResponse } from '@/types';

export type EmergencyGuideSource = 'manual' | 'machine' | 'voice' | 'image';

interface StartEmergencyGuideParams {
  guide: EmergencyGuideResponse;
  mainLabel?: string;
  source: EmergencyGuideSource;
  subtypeLabel?: string;
}

interface EmergencyGuideState {
  currentStepIndex: number;
  elapsedSeconds: number;
  guide: EmergencyGuideResponse | null;
  mainLabel: string;
  source: EmergencyGuideSource | null;
  subtypeLabel: string;
  incrementElapsedSeconds: () => void;
  moveToNextStep: (stepCount: number) => void;
  moveToPreviousStep: () => void;
  resetGuide: () => void;
  setGuide: (guide: EmergencyGuideResponse) => void;
  startGuide: (params: StartEmergencyGuideParams) => void;
}

const INITIAL_EMERGENCY_GUIDE_STATE = {
  currentStepIndex: 0,
  elapsedSeconds: 0,
  guide: null,
  mainLabel: '응급',
  source: null,
  subtypeLabel: '',
} as const;

export const useEmergencyGuideStore = create<EmergencyGuideState>()(set => ({
  ...INITIAL_EMERGENCY_GUIDE_STATE,

  incrementElapsedSeconds: (): void => {
    set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },

  moveToNextStep: (stepCount: number): void => {
    set(state => {
      const lastStepIndex = Math.max(stepCount - 1, 0);

      return {
        currentStepIndex: Math.min(state.currentStepIndex + 1, lastStepIndex),
      };
    });
  },

  moveToPreviousStep: (): void => {
    set(state => ({
      currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
    }));
  },

  resetGuide: (): void => {
    set({ ...INITIAL_EMERGENCY_GUIDE_STATE });
  },

  setGuide: (guide: EmergencyGuideResponse): void => {
    set({ guide, currentStepIndex: 0 });
  },

  startGuide: ({
    guide,
    mainLabel = '응급',
    source,
    subtypeLabel = '',
  }: StartEmergencyGuideParams): void => {
    set({
      currentStepIndex: 0,
      elapsedSeconds: 0,
      guide,
      mainLabel,
      source,
      subtypeLabel,
    });
  },
}));
