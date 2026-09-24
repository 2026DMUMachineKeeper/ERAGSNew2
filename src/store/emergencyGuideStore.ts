import { create } from 'zustand';

import type {
  EmergencyGuideHandoverStatus,
  EmergencyGuideResponse,
  EmergencyWasteGuideItem,
} from '@/types';

export type EmergencyGuideSource = 'manual' | 'machine' | 'voice' | 'image';

interface StartEmergencyGuideParams {
  guide: EmergencyGuideResponse;
  mainLabel?: string;
  source: EmergencyGuideSource;
  subtypeLabel?: string;
}

interface EmergencyGuideState {
  completedStepIds: number[];
  currentStepIndex: number;
  elapsedSeconds: number;
  guide: EmergencyGuideResponse | null;
  handoverStatus: EmergencyGuideHandoverStatus | null;
  isWasteGuideLoading: boolean;
  mainLabel: string;
  source: EmergencyGuideSource | null;
  subtypeLabel: string;
  wasteGuide: EmergencyWasteGuideItem[] | null;
  wasteGuideError: string | null;
  incrementElapsedSeconds: () => void;
  markStepCompleted: (stepId: number | null) => void;
  moveToNextStep: (stepCount: number) => void;
  moveToPreviousStep: () => void;
  resetGuide: () => void;
  setGuide: (guide: EmergencyGuideResponse) => void;
  setHandoverStatus: (status: EmergencyGuideHandoverStatus) => void;
  setWasteGuide: (items: EmergencyWasteGuideItem[]) => void;
  setWasteGuideError: (message: string) => void;
  setWasteGuideLoading: () => void;
  startGuide: (params: StartEmergencyGuideParams) => void;
}

const INITIAL_EMERGENCY_GUIDE_STATE = {
  completedStepIds: [] as number[],
  currentStepIndex: 0,
  elapsedSeconds: 0,
  guide: null,
  handoverStatus: null,
  isWasteGuideLoading: false,
  mainLabel: '응급',
  source: null,
  subtypeLabel: '',
  wasteGuide: null,
  wasteGuideError: null,
} as const;

export const useEmergencyGuideStore = create<EmergencyGuideState>()(set => ({
  ...INITIAL_EMERGENCY_GUIDE_STATE,

  incrementElapsedSeconds: (): void => {
    set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
  },

  markStepCompleted: (stepId: number | null): void => {
    if (stepId === null || !Number.isInteger(stepId) || stepId <= 0) {
      return;
    }

    set(state => ({
      completedStepIds: state.completedStepIds.includes(stepId)
        ? state.completedStepIds
        : [...state.completedStepIds, stepId],
    }));
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
    set({
      guide,
      currentStepIndex: 0,
      completedStepIds: [],
      handoverStatus: null,
      isWasteGuideLoading: false,
      wasteGuide: null,
      wasteGuideError: null,
    });
  },

  setHandoverStatus: (status: EmergencyGuideHandoverStatus): void => {
    set({ handoverStatus: status });
  },

  setWasteGuide: (items: EmergencyWasteGuideItem[]): void => {
    set({
      isWasteGuideLoading: false,
      wasteGuide: items,
      wasteGuideError: null,
    });
  },

  setWasteGuideError: (message: string): void => {
    set({
      isWasteGuideLoading: false,
      wasteGuideError: message,
    });
  },

  setWasteGuideLoading: (): void => {
    set({
      isWasteGuideLoading: true,
      wasteGuide: null,
      wasteGuideError: null,
    });
  },

  startGuide: ({
    guide,
    mainLabel = '응급',
    source,
    subtypeLabel = '',
  }: StartEmergencyGuideParams): void => {
    set({
      completedStepIds: [],
      currentStepIndex: 0,
      elapsedSeconds: 0,
      guide,
      handoverStatus: null,
      isWasteGuideLoading: false,
      mainLabel,
      source,
      subtypeLabel,
      wasteGuide: null,
      wasteGuideError: null,
    });
  },
}));
