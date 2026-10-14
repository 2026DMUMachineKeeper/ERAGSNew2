import { create } from 'zustand';

import type {
  CompoundCompletionAttempt,
  CompoundGuideSnapshot,
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
  compoundSnapshot: CompoundGuideSnapshot | null;
  compoundPendingCompletion: CompoundCompletionAttempt | null;
  applyCompoundSnapshot: (snapshot: CompoundGuideSnapshot) => void;
  setCompoundPendingCompletion: (attempt: CompoundCompletionAttempt | null) => void;
  completedStepIds: number[];
  currentStepIndex: number;
  elapsedSeconds: number;
  // 경과 시간 계산 기준 시각(ms)입니다.
  elapsedStartedAt: number | null;
  guide: EmergencyGuideResponse | null;
  handoverStatus: EmergencyGuideHandoverStatus | null;
  isWasteGuideLoading: boolean;
  mainLabel: string;
  source: EmergencyGuideSource | null;
  subtypeLabel: string;
  wasteGuide: EmergencyWasteGuideItem[] | null;
  wasteGuideError: string | null;
  syncElapsedSeconds: () => void;
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
  compoundSnapshot: null,
  compoundPendingCompletion: null,
  completedStepIds: [] as number[],
  currentStepIndex: 0,
  elapsedSeconds: 0,
  elapsedStartedAt: null,
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

  applyCompoundSnapshot: (snapshot): void => {
    set(state => {
      if (!state.guide?.compound || state.guide.sessionId !== snapshot.sessionId ||
        (state.compoundSnapshot?.sessionId === snapshot.sessionId &&
          (state.compoundSnapshot.progress?.revision ?? 0) > (snapshot.progress?.revision ?? 0))) {
        return state;
      }
      return {
        compoundSnapshot: snapshot,
        guide: {
          ...state.guide,
          compound: snapshot.compound,
          status: snapshot.compound.status === 'PARTIAL' ? 'GUIDE_PENDING' : snapshot.compound.status,
          progress: snapshot.progress,
          usedSupplies: snapshot.usedSupplies,
        },
      };
    });
  },

  setCompoundPendingCompletion: (attempt): void => {
    set(state => attempt && state.guide?.sessionId !== attempt.sessionId ? state :
      { compoundPendingCompletion: attempt });
  },

  // 1초씩 더하면 앱이 백그라운드에 있는 동안(119 통화 등) 멈추므로 시작 시각 기준으로 계산합니다.
  syncElapsedSeconds: (): void => {
    set(state => {
      const now = Date.now();
      const elapsedStartedAt = state.elapsedStartedAt ?? now;

      return {
        elapsedStartedAt,
        elapsedSeconds: Math.max(
          0,
          Math.floor((now - elapsedStartedAt) / 1000),
        ),
      };
    });
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
      compoundSnapshot: null,
      compoundPendingCompletion: null,
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
      compoundSnapshot: null,
      compoundPendingCompletion: null,
      completedStepIds: [],
      currentStepIndex: 0,
      elapsedSeconds: 0,
      elapsedStartedAt: Date.now(),
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
