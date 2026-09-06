import {
  createAudioEmergencyGuide,
  createEmergencyGuide,
  createImageEmergencyGuide,
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
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'test-api-base-url/api/v1/emergency-guide-sessions/emg-session%2F001/guide',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(consoleWarnMock).toHaveBeenCalledWith(
      '[EmergencyGuide API][Request]',
      expect.objectContaining({ fieldNames: ['request', 'questionnaire'] }),
    );
    expect(consoleWarnMock).toHaveBeenCalledWith(
      '[EmergencyGuide API][Response]',
      expect.objectContaining({ status: 200, errorCode: null }),
    );
  });

  it('음성과 이미지를 필수 요청 정보와 함께 전송한다', async (): Promise<void> => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: createGuidePayload('voice-session'),
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: createGuidePayload('image-session'),
        }),
      );

    await createAudioEmergencyGuide({
      uri: 'file:///voice.m4a',
      name: 'voice.m4a',
      type: 'audio/mp4',
    });
    await createImageEmergencyGuide({
      uri: 'file:///injury.jpg',
      name: 'injury.jpg',
      type: 'image/jpeg',
    });

    const getFieldNames = (callIndex: number): string[] => {
      const requestInit = fetchMock.mock.calls[callIndex]?.[1] as
        | RequestInit
        | undefined;
      const formData = requestInit?.body as FormData | undefined;
      if (!formData) {
        throw new Error('미디어 요청 FormData가 없습니다.');
      }

      const standardFormData = formData as unknown as {
        entries: () => Iterable<readonly [string, unknown]>;
      };

      return Array.from(standardFormData.entries()).map(
        ([fieldName]) => fieldName,
      );
    };

    expect(getFieldNames(0)).toEqual(['request', 'audio']);
    expect(getFieldNames(1)).toEqual(['request', 'image']);
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
      message: '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      status: 404,
      code: 'SESSION_NOT_FOUND',
      requestUrl:
        'test-api-base-url/api/v1/emergency-guide-sessions/emg-missing/guide',
    });
    expect(JSON.stringify(consoleWarnMock.mock.calls)).not.toContain(
      'Emergency guide session was not found',
    );
  });
});
