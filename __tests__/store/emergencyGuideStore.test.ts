import type { EmergencyGuideResponse } from '@/types';

import { useEmergencyGuideStore } from '@/store/emergencyGuideStore';

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

  it('실제 서버 단계 ID만 중복 없이 완료 처리한다', (): void => {
    const store = useEmergencyGuideStore.getState();

    store.markStepCompleted(null);
    store.markStepCompleted(7);
    store.markStepCompleted(7);
    store.markStepCompleted(8);
    store.setHandoverStatus('IN_PROGRESS');

    expect(useEmergencyGuideStore.getState()).toMatchObject({
      completedStepIds: [7, 8],
      handoverStatus: 'IN_PROGRESS',
    });
  });
});
