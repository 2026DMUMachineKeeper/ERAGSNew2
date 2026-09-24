import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  createEmergencyGuideHandover,
  getEmergencyGuideErrorMessage,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse } from '@/types';

import { QRCodeScreen } from '@/screens/QRCodeScreen';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toString: jest.fn(async () => '<svg viewBox="0 0 1 1" />') },
}));
jest.mock('@/services', () => ({
  createEmergencyGuideHandover: jest.fn(),
  getEmergencyGuideErrorMessage: jest.fn(
    () => '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  ),
}));

const createHandoverMock = jest.mocked(createEmergencyGuideHandover);
const getErrorMessageMock = jest.mocked(getEmergencyGuideErrorMessage);

const GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-1',
  requestId: 'request-1',
  generatedAt: '2026-09-03T00:00:00.000Z',
  status: 'COMPLETE',
  patientContext: { consciousness: 'CONSCIOUS', ageGroup: 'ADULT' },
  evidence: null,
  assessment: {
    assessmentId: 'assessment-1',
    categoryCode: 'BLEEDING',
    subtypeCode: 'BLEEDING_MODERATE',
    severityCode: 'MEDIUM',
    confidence: null,
    redFlags: ['UNCONTROLLED_BLEEDING'],
    call119Required: true,
    summary: '출혈 상황입니다.',
    reasons: [],
    missingInputs: [],
    decisionSource: 'ML_EVIDENCE',
    modelVersion: null,
  },
  treatment: {
    routeCode: 'A',
    modelVersion: null,
    steps: [
      {
        stepId: 7,
        stepNo: 1,
        instruction: '상처를 압박하세요.',
        checkpointQuestion: '압박했나요?',
        requiredItemId: 1,
        requiredItemName: '서버 약품명',
        requiredQuantity: 2,
        requiredSlotId: 1,
        imageResource: null,
        imageUrl: null,
      },
    ],
  },
  error: null,
};

describe('QRCodeScreen', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  afterEach(async (): Promise<void> => {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
      useEmergencyGuideStore.getState().resetGuide();
    });
    renderer = undefined;
    jest.clearAllMocks();
  });

  it('QR 발급 실패 시에도 로컬 인계 요약을 계속 표시한다', async (): Promise<void> => {
    createHandoverMock.mockRejectedValue(new Error('offline'));
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual', mainLabel: '출혈' });
    store.markStepCompleted(7);
    store.setHandoverStatus('IN_PROGRESS');
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QRCodeScreen
          navigation={{ reset: jest.fn() } as never}
          route={{} as never}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(renderer?.toJSON());
    expect(createHandoverMock).toHaveBeenCalledWith('session-1', {
      status: 'IN_PROGRESS',
      completedStepIds: [7],
    });
    expect(rendered).toContain('출혈 상황입니다.');
    expect(rendered).toContain('상처를 압박하세요.');
    expect(rendered).toContain('서버 약품명');
    expect(rendered).toContain('응급 가이드 요청에 실패했습니다.');
    expect(getErrorMessageMock).toHaveBeenCalledWith(expect.any(Error));
  });

  it('완료한 처치가 없으면 인계 API를 호출하지 않고 안내한다', async (): Promise<void> => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual', mainLabel: '출혈' });
    store.setHandoverStatus('IN_PROGRESS');

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QRCodeScreen
          navigation={{ reset: jest.fn(), navigate: jest.fn() } as never}
          route={{} as never}
        />,
      );
      await Promise.resolve();
    });

    const rendered = JSON.stringify(renderer?.toJSON());
    expect(createHandoverMock).not.toHaveBeenCalled();
    expect(rendered).toContain(
      '완료한 처치가 없어 QR 인계를 발급하지 않았습니다.',
    );
  });

  it('성공 시 서버 snapshot과 토큰 QR을 표시하고 URL 문자열은 노출하지 않는다', async (): Promise<void> => {
    const tokenUrl = `https://handover.example/handover.html#token=${'A'.repeat(
      43,
    )}`;
    createHandoverMock.mockResolvedValue({
      publicHandoverUrl: tokenUrl,
      snapshot: {
        version: 2,
        generatedAt: '2026-09-03T00:00:00.000Z',
        expiresAt: '2026-09-03T00:30:00.000Z',
        status: 'COMPLETED',
        assessment: {
          categoryCode: 'BLEEDING',
          subtypeCode: 'BLEEDING_MODERATE',
          severityCode: 'MEDIUM',
          consciousness: 'CONSCIOUS',
          ageGroup: 'ADULT',
          redFlags: [],
          call119Required: true,
          summary: '서버 판단 요약',
        },
        completedTreatments: [
          { stepId: 7, stepNo: 1, instruction: '서버 완료 처치' },
        ],
        usedSupplies: [{ name: '서버 응답 약품명', quantity: 3 }],
      },
    });
    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual', mainLabel: '출혈' });
    store.markStepCompleted(7);
    store.setHandoverStatus('COMPLETED');

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QRCodeScreen
          navigation={{ reset: jest.fn() } as never}
          route={{} as never}
        />,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const rendered = JSON.stringify(renderer?.toJSON());
    expect(rendered).toContain('서버 판단 요약');
    expect(rendered).toContain('서버 완료 처치');
    expect(rendered).toContain('서버 응답 약품명');
    expect(rendered).toContain('emergency-handover-qr');
    expect(rendered).toContain('30분 동안 조회');
    expect(rendered).not.toContain('handover.html#token=');
  });
});
