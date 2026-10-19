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
  it('차감 기록은 같은 세션 재조회에서 유지하고 새 가이드와 초기화에서 비운다', () => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: TEST_GUIDE, source: 'manual' });
    store.recordMedicineUse(1, 2);
    store.setGuide({ ...TEST_GUIDE });
    expect(useEmergencyGuideStore.getState().usedMedicineQuantities).toEqual({ 1: 2 });
    store.setGuide({ ...TEST_GUIDE, sessionId: 'session-2' });
    expect(useEmergencyGuideStore.getState().usedMedicineQuantities).toEqual({});
    store.recordMedicineUse(1, 1);
    store.setIsCompletingSingleGuide(true);
    store.startGuide({ guide: TEST_GUIDE, source: 'manual' });
    expect(useEmergencyGuideStore.getState()).toMatchObject({
      usedMedicineQuantities: {}, isCompletingSingleGuide: false,
    });
    store.recordMedicineUse(1, 1);
    store.resetGuide();
    expect(useEmergencyGuideStore.getState().usedMedicineQuantities).toEqual({});
  });

  it('추가 문진용 원본은 같은 요청에 보관하고 새 요청과 초기화에서 비운다', () => {
    const input = { media: { images: [], audio: {
      uri: 'file:///original.m4a', name: 'original.m4a', type: 'audio/mp4',
    } } };
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: TEST_GUIDE, source: 'voice', input });
    store.setGuide({ ...TEST_GUIDE, status: 'ASSESSMENT_ONLY' });
    expect(useEmergencyGuideStore.getState().input).toEqual(input);
    store.startGuide({ guide: TEST_GUIDE, source: 'manual' });
    expect(useEmergencyGuideStore.getState().input).toBeNull();
    store.startGuide({ guide: TEST_GUIDE, source: 'voice', input });
    store.resetGuide();
    expect(useEmergencyGuideStore.getState().input).toBeNull();
  });
  afterEach((): void => {
    useEmergencyGuideStore.getState().resetGuide();
  });

  it('새 가이드를 시작하면 이전 진행 상태를 초기화한다', (): void => {
    const store = useEmergencyGuideStore.getState();

    useEmergencyGuideStore.setState({ elapsedSeconds: 42 });
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

  it('경과 시간은 시작 시각 기준으로 계산해 백그라운드 시간도 포함한다', (): void => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      useEmergencyGuideStore.getState().startGuide({
        guide: TEST_GUIDE,
        source: 'manual',
      });

      // 타이머가 멈춰 있던 2분(119 통화 등) 뒤에 한 번만 동기화해도 실제 경과 시간을 반영합니다.
      nowSpy.mockReturnValue(1_000_000 + 125_400);
      useEmergencyGuideStore.getState().syncElapsedSeconds();

      expect(useEmergencyGuideStore.getState().elapsedSeconds).toBe(125);
    } finally {
      nowSpy.mockRestore();
    }
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
