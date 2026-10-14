import {
  completeCompoundGuideStep,
  logCompoundGuideDiagnostics,
  readCompoundGuideSession,
} from '@/services/compoundGuide.service';
import { createCompoundGuide } from '@/services/emergencyGuide.service';
import { getAuthToken, refreshAuthTokens } from '@/services/auth.service';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import type { CompoundCompletionCommand } from '@/types';
import responses from '../fixtures/compoundGuideResponses.json';
import {
  blockedSnapshot,
  completedSnapshot,
  INITIAL_COMPOUND_SNAPSHOT,
  PARTIAL_FINISHED_SNAPSHOT,
} from '../../testSupport/compoundGuide';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async () => 'token'),
  isAuthTokenExpiredError: jest.fn(() => false),
  refreshAuthTokens: jest.fn(async () => ({ accessToken: 'new-token' })),
}));
const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const response = (data: unknown, status = 200): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => ({ success: true, data }),
  } as Response);
const initial = INITIAL_COMPOUND_SNAPSHOT;
const command: CompoundCompletionCommand = {
  planId: initial.planId!,
  executionStepId: initial.progress!.currentStepId!,
  expectedRevision: 0,
  idempotencyKey: 'same-attempt',
};

describe('복합 가이드 서버 계약', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAuthToken).mockResolvedValue('token');
    fetchMock.mockResolvedValue(response(initial));
  });

  it('긴 응답에서도 전체 보류 사유와 손상별 부족 정보를 짧은 독립 로그로 남긴다', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const value = {
        ...responses.incomplete,
        evidenceByInjury: { unused: 'x'.repeat(10000) },
      };
      logCompoundGuideDiagnostics(value, {
        operation: 'READ',
        httpStatus: 200,
      });
      const diagnostics = warnSpy.mock.calls.find(
        call => call[0] === '[CompoundGuide API][Diagnostics]',
      );
      expect(diagnostics).toBeDefined();
      const line = diagnostics![1] as string;
      expect(line.length).toBeLessThan(2000);
      expect(JSON.parse(line)).toMatchObject({
        operation: 'READ',
        httpStatus: 200,
        blockedReasons: value.compound.blockedReasons,
        executionStepCount: 0,
      });
      const injuries = warnSpy.mock.calls
        .filter(call => call[0] === '[CompoundGuide API][Injury]')
        .map(
          call =>
            JSON.parse(call[1] as string) as {
              injuryId: string;
              missingInputs: string[];
            },
        );
      value.compound.injuries.forEach(injury => {
        expect(injuries).toContainEqual(
          expect.objectContaining({
            injuryId: injury.injuryId,
            missingInputs: injury.assessment.missingInputs,
          }),
        );
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it.each(Object.keys(responses) as (keyof typeof responses)[])(
    'QA 원본 %s 응답의 저장 실행/보류 상태를 읽는다',
    key => {
      const creation = responses[key];
      expect(
        parseCompoundGuideSnapshot({
          ...creation,
          planId: creation.compound.planId,
        }).compound,
      ).toEqual(creation.compound);
    },
  );
  it('인증된 GET으로 저장 세션을 복원하고 물품 사용 요청은 보내지 않는다', async () => {
    await expect(readCompoundGuideSession(initial.sessionId)).resolves.toEqual(
      initial,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      expect.stringContaining(`/api/v1/sessions/${initial.sessionId}`),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    ]);
  });
  it('원본 복합 생성 응답을 보존하고 다른 요청의 결과는 거절한다', async () => {
    fetchMock.mockResolvedValue(response(responses.complete));
    await expect(
      createCompoundGuide(
        toCompoundGuideRequest(
          { visibleSymptoms: ['BLEEDING', 'BURN'] },
          responses.complete.requestId,
        ),
      ),
    ).resolves.toEqual(responses.complete);
    await expect(
      createCompoundGuide(
        toCompoundGuideRequest(
          { visibleSymptoms: ['BLEEDING', 'BURN'] },
          'different-request',
        ),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('401이면 토큰을 갱신하며 같은 완료 본문을 재사용한다', async () => {
    fetchMock
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(
        response({ outcome: 'COMPLETED', snapshot: completedSnapshot(1) }),
      );
    await completeCompoundGuideStep(initial.sessionId, command);
    expect(refreshAuthTokens).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.map(call =>
        JSON.parse((call[1] as RequestInit).body as string),
      ),
    ).toEqual([command, command]);
    expect(Object.keys(command).sort()).toEqual(
      [
        'planId',
        'executionStepId',
        'expectedRevision',
        'idempotencyKey',
      ].sort(),
    );
  });
  it.each(['COMPLETED', 'DUPLICATE'])(
    '완료 결과 %s를 서버 snapshot으로 반영한다',
    async outcome => {
      const snapshot = completedSnapshot(1);
      fetchMock.mockResolvedValue(response({ outcome, snapshot }));
      await expect(
        completeCompoundGuideStep(initial.sessionId, command),
      ).resolves.toEqual({ outcome, snapshot });
      expect(fetchMock.mock.calls[0][0]).toContain('/steps');
    },
  );
  it('200 BLOCKED를 실패로 버리지 않고 이전 사용량과 보류 상태를 보존한다', async () => {
    const snapshot = blockedSnapshot();
    fetchMock.mockResolvedValue(response({ outcome: 'BLOCKED', snapshot }));
    await expect(
      completeCompoundGuideStep(initial.sessionId, {
        ...command,
        executionStepId: initial.compound.execution[1].executionStepId,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({ outcome: 'BLOCKED', snapshot });
    expect(snapshot.usedSupplies).toHaveLength(1);
  });
  it('409의 status, code, message, details를 유지한다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: {
          code: 'REVISION_CONFLICT',
          message: 'changed',
          details: [{ revision: 1 }],
        },
      }),
    });
    await expect(
      completeCompoundGuideStep(initial.sessionId, command),
    ).rejects.toMatchObject({
      status: 409,
      code: 'REVISION_CONFLICT',
      message: 'changed',
      details: [{ revision: 1 }],
    });
  });
  it('인증 토큰이 없으면 익명 조회하지 않는다', async () => {
    jest.mocked(getAuthToken).mockRejectedValue(new Error('no-token'));
    await expect(readCompoundGuideSession(initial.sessionId)).rejects.toThrow(
      'no-token',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('다른 세션과 완료되지 않은 성공 receipt를 거절한다', async () => {
    await expect(readCompoundGuideSession('another')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    fetchMock.mockResolvedValue(
      response({ outcome: 'COMPLETED', snapshot: initial }),
    );
    await expect(
      completeCompoundGuideStep(initial.sessionId, command),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('보류 손상만 남은 부분 계획을 전체 처치 완료로 해석하지 않는다', () => {
    expect(
      parseCompoundGuideSnapshot(PARTIAL_FINISHED_SNAPSHOT).progress?.status,
    ).toBe('BLOCKED');
  });
  it.each([
    { ...initial, schemaVersion: '3' },
    { ...initial, compound: { ...initial.compound, authority: 'FRONTEND' } },
    { ...initial, progress: { ...initial.progress, currentStepId: 'wrong' } },
    {
      ...initial,
      progress: {
        ...initial.progress,
        completedStepIds: [initial.compound.execution[1].executionStepId],
      },
    },
    { ...completedSnapshot(1), usedSupplies: [] },
    {
      ...initial,
      compound: {
        ...initial.compound,
        execution: [
          {
            ...initial.compound.execution[0],
            sources: [{ injuryId: 'wrong' }],
          },
        ],
      },
    },
  ])('잘못된 실행·진행·사용량 응답을 차단한다 %#', invalid => {
    expect(() => parseCompoundGuideSnapshot(invalid)).toThrow();
  });
  it('생성 응답에 실행 상태가 누락되면 단일 가이드로 축소하지 않는다', async () => {
    fetchMock.mockResolvedValue(
      response({ ...responses.complete, progress: null }),
    );
    await expect(
      createCompoundGuide(
        toCompoundGuideRequest({ visibleSymptoms: ['BLEEDING', 'BURN'] }, 'id'),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
