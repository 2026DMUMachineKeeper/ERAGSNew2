import { createCompoundGuide } from '@/services/emergencyGuide.service';
import { getAuthToken, refreshAuthTokens } from '@/services/auth.service';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';
import type { EmergencyGuideResponse, QuestionAnswers } from '@/types';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async () => 'token'),
  isAuthTokenExpiredError: jest.fn(() => false),
  refreshAuthTokens: jest.fn(),
}));

const ANSWERS: QuestionAnswers = {
  immediateDanger: ['NONE'],
  visibleSymptoms: ['BLEEDING', 'BURN'],
  bleedingPattern: ['BLEEDING_SOAKING'],
  woundRisk: ['FOREIGN_OBJECT'],
  ageGroup: ['ADULT'],
};

const HELD_GUIDE: EmergencyGuideResponse = {
  sessionId: 'compound-session',
  requestId: 'compound-request',
  generatedAt: '2026-10-13T00:00:00Z',
  status: 'ASSESSMENT_ONLY',
  patientContext: null,
  assessment: null,
  evidence: null,
  treatment: { routeCode: null, modelVersion: null, steps: [] },
  error: null,
  compound: {
    status: 'ASSESSMENT_ONLY',
    blockedReasons: ['SITE_RELATION_UNKNOWN'],
    call119Required: false,
    display: {
      status: '평가만 완료·가이드 미생성',
      blockedReasons: [
        { code: 'SITE_RELATION_UNKNOWN', label: '손상 부위 관계 미확인' },
      ],
    },
    injuries: [
      {
        injuryId: 'injury-0',
        categoryCode: 'BLEEDING',
        deferredReason: null,
        assessment: null,
      },
      {
        injuryId: 'injury-1',
        categoryCode: 'BURN',
        deferredReason: null,
        assessment: {
          subtypeCode: null,
          severityCode: 'UNKNOWN',
          call119Required: false,
          missingInputs: ['burnDegree'],
          display: {
            missingInputs: [
              { code: 'burnDegree', label: '화상 피부 상태 확인 필요' },
            ],
          },
        },
      },
    ],
  },
};

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const response = (status: number, payload: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
  } as Response);

describe('기존 문진의 복합 V2 전송', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAuthToken).mockResolvedValue('token');
    fetchMock.mockResolvedValue(
      response(200, { success: true, data: HELD_GUIDE }),
    );
  });
  it('입력 없는 부위와 관계를 추정하지 않고 문진을 각 손상으로 분리한다', () => {
    const request = toCompoundGuideRequest(ANSWERS, 'request-id');
    expect(request.schemaVersion).toBe('2');
    expect(request.patientContext).toEqual({
      consciousness: 'UNKNOWN',
      ageGroup: 'ADULT',
    });
    expect(request.injuries.map(injury => injury.location)).toEqual([
      { scope: 'UNKNOWN', description: null },
      { scope: 'UNKNOWN', description: null },
    ]);
    expect(request.relations).toEqual([
      {
        injuryIds: ['injury-0', 'injury-1'],
        relation: 'UNKNOWN',
        confirmed: false,
      },
    ]);
    expect(
      request.injuries[0].questionnaire.map(answer => answer.questionId),
    ).toEqual([
      'Q1_IMMEDIATE_DANGER',
      'Q2_VISIBLE_SYMPTOMS',
      'B1_BLEEDING_PATTERN',
      'B2_BLEEDING_RISKS',
      'C1_AGE_GROUP',
    ]);
    expect(
      request.injuries[1].questionnaire.map(answer => answer.questionId),
    ).toEqual(['Q1_IMMEDIATE_DANGER', 'Q2_VISIBLE_SYMPTOMS', 'C1_AGE_GROUP']);
    expect(
      request.injuries[1].questionnaire.find(
        answer => answer.questionId === 'Q2_VISIBLE_SYMPTOMS',
      )?.answerIds,
    ).toEqual(['BURN']);
  });
  it('증상 순서가 바뀌어도 유형별 답변을 다른 손상에 복사하지 않는다', () => {
    const request = toCompoundGuideRequest(
      { ...ANSWERS, visibleSymptoms: ['BURN', 'BLEEDING'] },
      'id',
    );
    expect(request.injuries[0].categoryCode).toBe('BURN');
    expect(
      request.injuries[0].questionnaire.some(answer =>
        answer.questionId.startsWith('B1'),
      ),
    ).toBe(false);
    expect(
      request.injuries[1].questionnaire.some(
        answer => answer.questionId === 'B1_BLEEDING_PATTERN',
      ),
    ).toBe(true);
  });
  it.each([
    ['BLEEDING', 'BURN', 'FRACTURE_BRUISE'],
    ['BLEEDING', 'OTHER_UNKNOWN'],
  ])('지원하지 않는 %s는 단일 요청으로 축소하지 않는다', (...symptoms) => {
    expect(() =>
      toCompoundGuideRequest({ ...ANSWERS, visibleSymptoms: symptoms }, 'id'),
    ).toThrow();
  });
  it('인증된 multipart request로 전송하며 정상 보류 응답을 보존한다', async () => {
    const request = toCompoundGuideRequest(ANSWERS, 'id');
    await expect(createCompoundGuide(request)).resolves.toEqual(HELD_GUIDE);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'Bearer token' });
    const form = init.body as unknown as {
      entries: () => Iterable<[string, string]>;
    };
    const entries = Array.from(form.entries());
    expect(entries.map(([key]) => key)).toEqual(['request']);
    expect(JSON.parse(entries[0][1])).toEqual(request);
  });
  it('토큰 없이는 익명 복합 요청을 보내지 않는다', async () => {
    jest.mocked(getAuthToken).mockRejectedValueOnce(new Error('no token'));
    await expect(
      createCompoundGuide(toCompoundGuideRequest(ANSWERS, 'id')),
    ).rejects.toThrow('no token');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('401은 같은 본문으로 토큰 갱신 후 재전송한다', async () => {
    fetchMock.mockResolvedValueOnce(response(401, {}));
    jest
      .mocked(refreshAuthTokens)
      .mockResolvedValueOnce({
        accessToken: 'new-token',
        refreshToken: 'refresh',
      });
    await createCompoundGuide(toCompoundGuideRequest(ANSWERS, 'id'));
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer new-token',
    );
    expect(fetchMock.mock.calls[1][1].body).toBe(
      fetchMock.mock.calls[0][1].body,
    );
  });
  it('중간 검증 사유를 일반 Error로 바꾸지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(
      response(400, {
        success: false,
        error: {
          code: 'INVALID_COMPOUND_REQUEST',
          message: 'invalid compound',
          details: ['location'],
        },
      }),
    );
    await expect(
      createCompoundGuide(toCompoundGuideRequest(ANSWERS, 'id')),
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_COMPOUND_REQUEST',
      message: 'invalid compound',
      details: ['location'],
    });
  });
});
