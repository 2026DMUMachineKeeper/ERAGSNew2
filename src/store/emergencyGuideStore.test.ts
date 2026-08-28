import type { EmergencyGuideResponse } from '@/types';

import { useEmergencyGuideStore } from './emergencyGuideStore';

const TEST_GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-1',
  requestId: 'request-1',
  generatedAt: '2026-08-28T00:00:00.000Z',
  status: 'COMPLETE',
  patientContext: null,
  evidence: null,
  assessment: null,
  treatment: {
    routeCode: 'A',
    modelVersion: null,
    steps: [],
  },
  error: null,
};

describe('useEmergencyGuideStore', () => {
  afterEach((): void => {
    useEmergencyGuideStore.getState().resetGuide();
  });

  it('새 가이드를 시작하면 이전 진행 상태를 초기화한다', (): void => {
    const store = useEmergencyGuideStore.getState();

    store.incrementElapsedSeconds();
    store.moveToNextStep(3);
    store.startGuide({
      guide: TEST_GUIDE,
      mainLabel: '출혈',
      source: 'manual',
    });

    expect(useEmergencyGuideStore.getState()).toMatchObject({
      currentStepIndex: 0,
      elapsedSeconds: 0,
      guide: TEST_GUIDE,
      mainLabel: '출혈',
      source: 'manual',
    });
  });
});
