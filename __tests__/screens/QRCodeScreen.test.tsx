import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import QRCode from 'qrcode';
import {
  COMPOUND_CREATION,
  completedSnapshot,
  INITIAL_COMPOUND_SNAPSHOT,
} from '../../testSupport/compoundGuide';
import { getCompoundHandoverSummary } from '@/utils/compoundHandover';

import {
  createEmergencyGuideHandover,
  getEmergencyGuideErrorMessage,
  getEmergencyWasteGuide,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type {
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideResponse,
  EmergencyWasteGuideResponse,
} from '@/types';

import { QRCodeScreen } from '@/screens/QRCodeScreen';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toString: jest.fn(async () => '<svg viewBox="0 0 1 1" />') },
}));
jest.mock('@/services', () => ({
  createEmergencyGuideHandover: jest.fn(),
  getEmergencyWasteGuide: jest.fn(),
  getEmergencyGuideErrorMessage: jest.fn(
    () => '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  ),
}));

const createHandoverMock = jest.mocked(createEmergencyGuideHandover);
const getErrorMessageMock = jest.mocked(getEmergencyGuideErrorMessage);
const getWasteGuideMock = jest.mocked(getEmergencyWasteGuide);

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
    getWasteGuideMock.mockResolvedValue({
      success: true,
      data: [
        {
          itemName: '거즈',
          wasteCategory: 'GENERAL',
          disposalMethod: '일반 쓰레기로 배출하세요.',
          dangerLevel: 'LOW',
        },
      ],
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
    expect(getWasteGuideMock).toHaveBeenCalledWith('session-1');
  });

  it('이전 화면의 폐기 안내 응답이 새 응급 세션을 덮어쓰지 않는다', async (): Promise<void> => {
    const handoverResponse: CreateEmergencyGuideHandoverResponse = {
      publicHandoverUrl: `https://handover.example/handover.html#token=${'A'.repeat(
        43,
      )}`,
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
        completedTreatments: [],
        usedSupplies: [],
      },
    };
    const currentWasteGuide: EmergencyWasteGuideResponse['data'] = [
      {
        itemName: '새 세션 물품',
        wasteCategory: 'GENERAL',
        disposalMethod: '새 세션 안내',
        dangerLevel: 'LOW',
      },
    ];
    let resolveOldWasteGuide!: (response: EmergencyWasteGuideResponse) => void;
    createHandoverMock.mockResolvedValue(handoverResponse);
    getWasteGuideMock.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveOldWasteGuide = resolve;
        }),
    );

    const store = useEmergencyGuideStore.getState();
    store.startGuide({ guide: GUIDE, source: 'manual' });
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
    expect(getWasteGuideMock).toHaveBeenCalledWith('session-1');

    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
      renderer = undefined;
      store.startGuide({
        guide: { ...GUIDE, sessionId: 'session-2' },
        source: 'manual',
      });
      store.setWasteGuide(currentWasteGuide);
      resolveOldWasteGuide({
        success: true,
        data: [
          {
            itemName: '이전 세션 물품',
            wasteCategory: 'GENERAL',
            disposalMethod: '이전 세션 안내',
            dangerLevel: 'LOW',
          },
        ],
      });
      await Promise.resolve();
    });

    expect(useEmergencyGuideStore.getState().wasteGuide).toEqual(
      currentWasteGuide,
    );
  });

  const mountCompoundQr = async (isCompleted = true): Promise<void> => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({
      guide: COMPOUND_CREATION,
      source: 'manual',
      mainLabel: '출혈 · 골절',
    });
    store.applyCompoundSnapshot(
      isCompleted ? completedSnapshot(2) : INITIAL_COMPOUND_SNAPSHOT,
    );
    store.setHandoverStatus('COMPLETED');
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <QRCodeScreen
          navigation={{ navigate: jest.fn(), reset: jest.fn() } as never}
          route={{} as never}
        />,
      );
    });
  };
  const compoundHandoverResponse =
    (): CreateEmergencyGuideHandoverResponse => ({
      publicHandoverUrl: `https://handover.example/handover.html#token=${'B'.repeat(
        43,
      )}`,
      snapshot: {
        version: 2,
        generatedAt: '2026-10-18T00:00:00Z',
        expiresAt: '2026-10-18T00:30:00Z',
        status: 'COMPLETED',
        assessment: {
          categoryCode: 'BLEEDING',
          subtypeCode: 'BLEEDING_MILD',
          severityCode: 'LOW',
          consciousness: 'CONSCIOUS',
          ageGroup: 'ADULT',
          redFlags: [],
          call119Required: false,
          summary: '',
        },
        completedTreatments: completedSnapshot(2).compound.execution.map(
          (step, index) => ({
            stepId: index + 1,
            stepNo: index + 1,
            instruction: step.instruction,
          }),
        ),
        usedSupplies: getCompoundHandoverSummary(completedSnapshot(2))
          .usedSupplies,
      },
    });
  it('복합은 숫자 완료 목록이 비어 있어도 기존 인계 API를 사용하고 서버 완료 기록과 사용 물품을 표시한다', async () => {
    createHandoverMock.mockResolvedValue(compoundHandoverResponse());
    getWasteGuideMock.mockResolvedValue({
      success: true,
      data: [
        {
          itemName: '물품',
          wasteCategory: 'GENERAL',
          disposalMethod: '서버 안내',
          dangerLevel: 'LOW',
        },
      ],
    });
    await mountCompoundQr();
    expect(createHandoverMock).toHaveBeenCalledWith(
      COMPOUND_CREATION.sessionId,
      { status: 'COMPLETED', completedStepIds: [] },
    );
    const rendered = JSON.stringify(renderer?.toJSON());
    completedSnapshot(2).compound.execution.forEach(step =>
      expect(rendered).toContain(step.instruction),
    );
    getCompoundHandoverSummary(completedSnapshot(2)).usedSupplies.forEach(
      item => expect(rendered).toContain(item.name),
    );
    expect(rendered).toContain('emergency-handover-qr');
    expect(rendered).toContain('폐기물 배출 안내 보기');
    expect(getWasteGuideMock).toHaveBeenCalledWith(COMPOUND_CREATION.sessionId);
  });
  it('복합 생성 COMPLETE만으로는 실제 처치 완료로 간주해 인계장을 만들지 않는다', async () => {
    await mountCompoundQr(false);
    expect(createHandoverMock).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer?.toJSON())).toContain(
      '전체 완료 기록을 확인하지 못했습니다.',
    );
  });
  it('복합 인계 응답이 빈 기록이면 QR과 잘못된 폐기 안내를 숨기고 실제 로컬 완료 기록을 유지한다', async () => {
    const response = compoundHandoverResponse();
    response.snapshot.completedTreatments = [];
    response.snapshot.usedSupplies = [];
    createHandoverMock.mockResolvedValue(response);
    await mountCompoundQr();
    expect(QRCode.toString).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
    const rendered = JSON.stringify(renderer?.toJSON());
    expect(rendered).not.toContain('emergency-handover-qr');
    expect(rendered).toContain('일치하지 않아 QR을 표시하지 않았습니다.');
    completedSnapshot(2).compound.execution.forEach(step =>
      expect(rendered).toContain(step.instruction),
    );
  });
  it('복합 인계 요청이 실패해도 완료 요약을 유지하고 기존 폐기물 API를 조회한다', async () => {
    createHandoverMock.mockRejectedValue(new Error('not supported'));
    getWasteGuideMock.mockRejectedValue(new Error('not supported'));
    await mountCompoundQr();
    expect(getWasteGuideMock).toHaveBeenCalledWith(COMPOUND_CREATION.sessionId);
    expect(useEmergencyGuideStore.getState().wasteGuideError).toBeTruthy();
    completedSnapshot(2).compound.execution.forEach(step =>
      expect(JSON.stringify(renderer?.toJSON())).toContain(step.instruction),
    );
  });
});
