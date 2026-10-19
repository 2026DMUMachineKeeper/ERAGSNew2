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
  fetchMedicines,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type {
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideResponse,
  CompoundGuideSnapshot,
  EmergencyWasteGuideResponse,
} from '@/types';

import { QRCodeScreen } from '@/screens/QRCodeScreen';
import { HandoverSummary } from '@/screens/qrCode/components/HandoverSummary';

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toString: jest.fn(async () => '<svg viewBox="0 0 1 1" />') },
}));
jest.mock('@/services', () => ({
  createEmergencyGuideHandover: jest.fn(),
  getEmergencyWasteGuide: jest.fn(),
  fetchMedicines: jest.fn(async () => []),
  getEmergencyGuideErrorMessage: jest.fn(
    () => '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  ),
}));

const createHandoverMock = jest.mocked(createEmergencyGuideHandover);
const getErrorMessageMock = jest.mocked(getEmergencyGuideErrorMessage);
const getWasteGuideMock = jest.mocked(getEmergencyWasteGuide);
const fetchMedicinesMock = jest.mocked(fetchMedicines);

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
          displayTitle: '일반 배출',
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
        displayTitle: '일반 배출',
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
            displayTitle: '일반 배출',
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

  const mountCompoundQr = async (
    isCompleted = true,
    savedSnapshot?: CompoundGuideSnapshot,
  ): Promise<void> => {
    const store = useEmergencyGuideStore.getState();
    store.startGuide({
      guide: COMPOUND_CREATION,
      source: 'manual',
      mainLabel: '출혈 · 골절',
    });
    store.applyCompoundSnapshot(
      savedSnapshot ??
        (isCompleted ? completedSnapshot(2) : INITIAL_COMPOUND_SNAPSHOT),
    );
    store.setHandoverStatus(savedSnapshot ? 'IN_PROGRESS' : 'COMPLETED');
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
          displayTitle: '일반 배출',
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
  it('복합 중단 시 저장된 처치만 진행 중 상태로 인계하고 QR을 표시한다', async () => {
    const saved = completedSnapshot(1);
    const summary = getCompoundHandoverSummary(saved);
    const response = compoundHandoverResponse();
    response.snapshot.status = 'IN_PROGRESS';
    response.snapshot.completedTreatments = summary.completedTreatments.map(
      (step, index) => ({ ...step, stepId: index + 1 }),
    );
    response.snapshot.usedSupplies = summary.usedSupplies;
    createHandoverMock.mockResolvedValue(response);
    getWasteGuideMock.mockResolvedValue({
      success: true,
      data: [
        {
          itemName: '물품',
          wasteCategory: 'GENERAL',
          displayTitle: '일반 배출',
          disposalMethod: '서버 안내',
          dangerLevel: 'LOW',
        },
      ],
    });
    await mountCompoundQr(false, saved);
    expect(createHandoverMock).toHaveBeenCalledWith(
      COMPOUND_CREATION.sessionId,
      {
        status: 'IN_PROGRESS',
        completedStepIds: [],
      },
    );
    const rendered = JSON.stringify(renderer?.toJSON());
    expect(rendered).toContain(saved.compound.execution[0].instruction);
    expect(
      renderer?.root.findByType(HandoverSummary).props.completedTreatments,
    ).toEqual(summary.completedTreatments);
    expect(rendered).toContain('emergency-handover-qr');
    expect(getWasteGuideMock).toHaveBeenCalledWith(COMPOUND_CREATION.sessionId);
  });
  it('복합 중단 기록과 서버 인계 기록이 다르면 QR을 표시하지 않는다', async () => {
    createHandoverMock.mockResolvedValue(compoundHandoverResponse());
    await mountCompoundQr(false, completedSnapshot(1));
    expect(QRCode.toString).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer?.toJSON())).toContain(
      '일치하지 않아 QR을 표시하지 않았습니다.',
    );
  });

  it('서버 출처 접두부와 누락된 물품명을 ID로 확인하면 실제 복합 QR과 폐기 안내를 표시한다', async () => {
    const saved = completedSnapshot(2);
    const response = compoundHandoverResponse();
    response.snapshot.completedTreatments = saved.compound.execution.map((step, index) => ({
      stepId: index + 1,
      stepNo: index + 1,
      instruction: `[${step.sources.map(source => `손상 ${saved.compound.injuries.findIndex(injury => injury.injuryId === source.injuryId) + 1} · 원본 단계 ${source.stepId}`).join(', ')}] ${step.instruction}`,
    }));
    response.snapshot.usedSupplies[0].name = '검증 거즈';
    fetchMedicinesMock.mockResolvedValueOnce([{
      id: String(saved.usedSupplies[0].itemId), name: '검증 거즈', info: '',
      qty: 0, threshold: 0, barcode: null, usage: '', efficacy: '',
    }]);
    createHandoverMock.mockResolvedValue(response);
    getWasteGuideMock.mockResolvedValue({ success: true, data: [] });
    await mountCompoundQr();
    expect(fetchMedicinesMock).toHaveBeenCalledTimes(1);
    expect(QRCode.toString).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(renderer?.toJSON())).toContain('emergency-handover-qr');
    expect(getWasteGuideMock).toHaveBeenCalledWith(COMPOUND_CREATION.sessionId);
  });

  it('물품 ID의 실제 이름을 확인해도 사용량이 다르면 QR을 거절한다', async () => {
    const saved = completedSnapshot(2);
    const response = compoundHandoverResponse();
    response.snapshot.usedSupplies[0] = { name: '검증 거즈', quantity: 999 };
    fetchMedicinesMock.mockResolvedValueOnce([{
      id: String(saved.usedSupplies[0].itemId), name: '검증 거즈', info: '',
      qty: 0, threshold: 0, barcode: null, usage: '', efficacy: '',
    }]);
    createHandoverMock.mockResolvedValue(response);
    await mountCompoundQr();
    expect(QRCode.toString).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer?.toJSON())).toContain('일치하지 않아 QR을 표시하지 않았습니다.');
  });

  it('저장된 물품명이 있으면 추가 조회 없이 서버 출처를 대조한다', async () => {
    const saved = completedSnapshot(2);
    const named: CompoundGuideSnapshot = {
      ...saved,
      compound: {
        ...saved.compound,
        injuries: saved.compound.injuries.map(injury => ({
          ...injury,
          guide: injury.guide ? {
            ...injury.guide,
            steps: injury.guide.steps.map(step => ({ ...step, requiredItemName: '검증 거즈' })),
          } : null,
        })),
      },
    };
    const response = compoundHandoverResponse();
    response.snapshot.usedSupplies[0].name = '검증 거즈';
    createHandoverMock.mockResolvedValue(response);
    getWasteGuideMock.mockResolvedValue({ success: true, data: [] });
    await mountCompoundQr(true, named);
    expect(fetchMedicinesMock).not.toHaveBeenCalled();
    expect(QRCode.toString).toHaveBeenCalledTimes(1);
  });

  it('사용 물품 ID를 조회 결과에서 찾지 못하면 이름을 추측해 QR을 표시하지 않는다', async () => {
    const response = compoundHandoverResponse();
    response.snapshot.usedSupplies[0].name = '검증 거즈';
    fetchMedicinesMock.mockResolvedValueOnce([]);
    createHandoverMock.mockResolvedValue(response);
    await mountCompoundQr();
    expect(QRCode.toString).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
  });

  it('물품명 조회 중 세션이 바뀌면 이전 인계 QR과 폐기 안내를 표시하지 않는다', async () => {
    let resolveMedicines!: (items: Awaited<ReturnType<typeof fetchMedicines>>) => void;
    fetchMedicinesMock.mockImplementationOnce(() => new Promise(resolve => {
      resolveMedicines = resolve;
    }));
    const response = compoundHandoverResponse();
    response.snapshot.usedSupplies[0].name = '검증 거즈';
    createHandoverMock.mockResolvedValue(response);
    await mountCompoundQr();
    expect(fetchMedicinesMock).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => {
      useEmergencyGuideStore.getState().startGuide({
        guide: { ...GUIDE, sessionId: 'new-session' }, source: 'manual',
      });
      resolveMedicines([]);
    });
    expect(QRCode.toString).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
    expect(useEmergencyGuideStore.getState().guide?.sessionId).toBe('new-session');
  });
  it('복합 중단 시 완료한 처치가 없으면 인계 API를 호출하지 않는다', async () => {
    await mountCompoundQr(false, INITIAL_COMPOUND_SNAPSHOT);
    expect(createHandoverMock).not.toHaveBeenCalled();
    expect(getWasteGuideMock).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer?.toJSON())).toContain(
      '완료한 처치가 없어 QR 인계를 발급하지 않았습니다.',
    );
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
