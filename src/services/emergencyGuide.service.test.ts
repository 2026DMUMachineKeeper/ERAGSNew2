import {
  createEmergencyGuide,
  EmergencyGuideRequestError,
  getEmergencyGuideImageUrl,
  retryEmergencyGuide,
} from './emergencyGuide.service';

const createMockResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async (): Promise<unknown> => payload),
  } as unknown as Response);

const createGuidePayload = (sessionId: string): Record<string, unknown> => ({
  sessionId,
  requestId: 'manual-001',
  generatedAt: '2026-08-23T00:00:00.000Z',
  status: 'GUIDE_PENDING',
  patientContext: null,
  evidence: null,
  assessment: null,
  treatment: { routeCode: null, modelVersion: null, steps: [] },
  error: null,
});

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const consoleWarnMock = jest
  .spyOn(console, 'warn')
  .mockImplementation((): void => undefined);

describe('emergencyGuide.service', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
    consoleWarnMock.mockClear();
  });

  afterAll((): void => {
    consoleWarnMock.mockRestore();
  });

  it('서버 내부 이미지 주소를 프론트 API 주소로 보정한다', (): void => {
    expect(
      getEmergencyGuideImageUrl(
        'https://example.invalid/images/bleed_severe_b_press.png',
        'bleed_severe_b_press.png',
      ),
    ).toBe('test-api-base-url/images/bleed_severe_b_press.png');
  });

  it('생성 응답의 data.sessionId로 body 없이 재시도한다', async (): Promise<void> => {
    const sessionId = 'emg-session/001';
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: createGuidePayload(sessionId),
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: { ...createGuidePayload(sessionId), status: 'COMPLETE' },
        }),
      );
    const formData = new FormData();
    formData.append(
      'request',
      JSON.stringify({ requestId: 'manual-001', language: 'ko-KR' }),
    );
    formData.append(
      'questionnaire',
      JSON.stringify([
        { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['BLEEDING'] },
      ]),
    );

    const createdGuide = await createEmergencyGuide(formData);
    const retriedGuide = await retryEmergencyGuide(createdGuide.sessionId);

    expect(retriedGuide.status).toBe('COMPLETE');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'test-api-base-url/api/v1/emergency-guide-sessions',
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'test-api-base-url/api/v1/emergency-guide-sessions/emg-session%2F001/guide',
      {
        method: 'POST',
        headers: { Accept: 'application/json' },
      },
    );
    expect(consoleWarnMock).toHaveBeenCalledWith(
      expect.stringContaining('Q2_VISIBLE_SYMPTOMS'),
    );
    expect(consoleWarnMock).toHaveBeenCalledWith(
      expect.stringContaining('"status": 200'),
    );
  });

  it('빈 sessionId는 요청하지 않는다', async (): Promise<void> => {
    await expect(retryEmergencyGuide('  ')).rejects.toThrow(
      '응급 가이드 sessionId가 없습니다.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404 SESSION_NOT_FOUND 진단 정보를 보존한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue(
      createMockResponse(404, {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Emergency guide session was not found',
          details: [],
        },
      }),
    );

    const request = retryEmergencyGuide('emg-missing');

    await expect(request).rejects.toMatchObject<
      Partial<EmergencyGuideRequestError>
    >({
      status: 404,
      code: 'SESSION_NOT_FOUND',
      requestUrl:
        'test-api-base-url/api/v1/emergency-guide-sessions/emg-missing/guide',
    });
  });
});
