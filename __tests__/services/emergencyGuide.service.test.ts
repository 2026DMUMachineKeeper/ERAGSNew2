import {
  createAudioEmergencyGuide,
  createEmergencyGuide,
  createEmergencyGuideHandover,
  createImageEmergencyGuide,
  createPhotoEmergencyGuide,
  EmergencyGuideRequestError,
  getEmergencyGuideErrorMessage,
  getEmergencyGuideImageUrl,
  getEmergencyWasteGuide,
  retryEmergencyGuide,
} from '@/services/emergencyGuide.service';

const createMockResponse = (status: number, payload: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async (): Promise<unknown> => payload),
  } as unknown as Response);

const createGuidePayload = (
  sessionId: string | null,
): Record<string, unknown> => ({
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

  it('호출자 취소 신호로 생성 요청을 취소한다', async (): Promise<void> => {
    let requestSignal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_input: RequestInfo, init?: RequestInit): Promise<Response> =>
        new Promise((_, reject): void => {
          requestSignal = init?.signal ?? undefined;
          requestSignal?.addEventListener(
            'abort',
            (): void => {
              const error = new Error('The operation was aborted.');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true },
          );
        }),
    );
    const controller = new AbortController();
    const request = createEmergencyGuide(new FormData(), controller.signal);

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(requestSignal?.aborted).toBe(true);
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
    if (!createdGuide.sessionId) {
      throw new Error('재시도할 sessionId가 없습니다.');
    }
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
      expect.objectContaining({ method: 'POST' }),
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

  it('최대 5장의 사진과 텍스트 또는 음성을 한 요청으로 전송한다', async (): Promise<void> => {
    fetchMock
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: createGuidePayload('photo-text-session'),
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse(200, {
          success: true,
          data: createGuidePayload('photo-audio-session'),
        }),
      );
    const images = Array.from({ length: 5 }, (_, index) => ({
      uri: `file:///injury-${index + 1}.jpg`,
      name: `injury-${index + 1}.jpg`,
      type: 'image/jpeg',
    }));

    await createPhotoEmergencyGuide({
      images,
      text: '넘어지고 나서 무릎에서 피가 납니다.',
    });
    await createPhotoEmergencyGuide({
      images: images.slice(0, 2),
      audio: {
        uri: 'file:///description.m4a',
        name: 'description.m4a',
        type: 'audio/mp4',
      },
    });

    const getFieldNames = (callIndex: number): string[] => {
      const requestInit = fetchMock.mock.calls[callIndex]?.[1] as
        | RequestInit
        | undefined;
      const formData = requestInit?.body as FormData | undefined;
      if (!formData) {
        throw new Error('사진 요청 FormData가 없습니다.');
      }

      const standardFormData = formData as unknown as {
        entries: () => Iterable<readonly [string, unknown]>;
      };

      return Array.from(standardFormData.entries()).map(
        ([fieldName]) => fieldName,
      );
    };

    expect(getFieldNames(0)).toEqual([
      'request',
      'image',
      'image',
      'image',
      'image',
      'image',
      'text',
    ]);
    expect(getFieldNames(1)).toEqual(['request', 'image', 'image', 'audio']);
  });

  it('사진이 없거나 5장을 초과하면 요청하지 않는다', async (): Promise<void> => {
    const image = {
      uri: 'file:///injury.jpg',
      name: 'injury.jpg',
      type: 'image/jpeg',
    };

    await expect(createPhotoEmergencyGuide({ images: [] })).rejects.toThrow(
      '응급 사진은 1장 이상 5장 이하로 전송해야 합니다.',
    );
    await expect(
      createPhotoEmergencyGuide({ images: Array(6).fill(image) }),
    ).rejects.toThrow('응급 사진은 1장 이상 5장 이하로 전송해야 합니다.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('빈 sessionId는 요청하지 않는다', async (): Promise<void> => {
    await expect(retryEmergencyGuide('  ')).rejects.toThrow(
      '응급 가이드 sessionId가 없습니다.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('완료한 단계 ID와 인계 상태를 보내고 v2 snapshot을 반환한다', async (): Promise<void> => {
    const token = 'A'.repeat(43);
    fetchMock.mockResolvedValue(
      createMockResponse(201, {
        success: true,
        data: {
          publicHandoverUrl: `https://handover.example/handover.html#token=${token}`,
          snapshot: {
            version: 2,
            generatedAt: '2026-09-03T00:00:00.000Z',
            expiresAt: '2026-09-03T00:30:00.000Z',
            status: 'IN_PROGRESS',
            assessment: {
              categoryCode: 'BLEEDING',
              subtypeCode: 'BLEEDING_MODERATE',
              severityCode: 'MEDIUM',
              consciousness: 'UNKNOWN',
              ageGroup: 'UNKNOWN',
              redFlags: [],
              call119Required: false,
              summary: '중간 수준의 출혈입니다.',
            },
            completedTreatments: [
              { stepId: 7, stepNo: 1, instruction: '상처를 압박하세요.' },
            ],
            usedSupplies: [{ name: '서버 약품명', quantity: 1 }],
          },
        },
      }),
    );

    const handover = await createEmergencyGuideHandover('session/1', {
      status: 'IN_PROGRESS',
      completedStepIds: [7],
    });

    expect(handover.snapshot.usedSupplies).toEqual([
      { name: '서버 약품명', quantity: 1 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/v1/emergency-guide-sessions/session%2F1/handover',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS',
          completedStepIds: [7],
        }),
      }),
    );
  });

  it('폐기물 안내를 v2 세션 API에서 조회한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue(
      createMockResponse(200, {
        success: true,
        data: [
          {
            itemName: '거즈',
            wasteCategory: 'GENERAL',
            disposalMethod: '일반 쓰레기로 배출하세요.',
            dangerLevel: 'LOW',
          },
        ],
      }),
    );

    const response = await getEmergencyWasteGuide('session/1');

    expect(response.data[0]?.itemName).toBe('거즈');
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/v2/emergency-guide-sessions/session%2F1/waste-guide',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('인계장이 없는 폐기물 안내 404 메시지를 보존한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue(
      createMockResponse(404, {
        success: false,
        message: '해당 세션의 처치 완료 기록(인계장)이 없습니다.',
      }),
    );

    await expect(
      getEmergencyWasteGuide('missing-session'),
    ).rejects.toMatchObject({
      status: 404,
      code: 'WASTE_GUIDE_HANDOVER_NOT_FOUND',
      message: '해당 세션의 처치 완료 기록(인계장)이 없습니다.',
    });
  });

  it.each(['<html>Forbidden</html>', ''])(
    'JSON이 아닌 403 응답은 상태만 기록하고 본문은 노출하지 않는다: %s',
    async (body): Promise<void> => {
      const consoleErrorMock = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      try {
        fetchMock.mockResolvedValue({
          ok: false,
          status: 403,
          json: async (): Promise<unknown> => JSON.parse(body) as unknown,
        });
        await expect(
          createEmergencyGuide(new FormData()),
        ).rejects.toMatchObject({
          status: 403,
          code: 'INVALID_RESPONSE',
        });
        expect(consoleErrorMock).toHaveBeenCalledWith(
          '[EmergencyGuide API][Response]',
          expect.objectContaining({
            status: 403,
            errorCode: 'INVALID_RESPONSE',
          }),
        );
        expect(consoleErrorMock).toHaveBeenCalledTimes(1);
      } finally {
        consoleErrorMock.mockRestore();
      }
    },
  );

  it('생성 응답의 null sessionId를 허용한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue(
      createMockResponse(200, {
        success: true,
        data: createGuidePayload(null),
      }),
    );

    const guide = await createEmergencyGuide(new FormData());

    expect(guide.sessionId).toBeNull();
  });

  it.each(['COMPLETE', 'ASSESSMENT_ONLY'])(
    '선택 유형 증상이 없는 답변을 그대로 전송하고 %s 응답을 보존한다',
    async status => {
      const questionnaire = [
        { questionId: 'Q1_IMMEDIATE_DANGER', answerIds: ['NONE'] },
        { questionId: 'Q2_VISIBLE_SYMPTOMS', answerIds: ['OTHER_UNKNOWN'] },
        { questionId: 'B1_BLEEDING_PATTERN', answerIds: ['BLEEDING_UNKNOWN'] },
        { questionId: 'B2_BLEEDING_RISKS', answerIds: ['NONE'] },
        { questionId: 'C1_AGE_GROUP', answerIds: ['ADULT'] },
      ];
      const formData = new FormData();
      formData.append('request', JSON.stringify({ requestId: 'manual-mismatch', language: 'ko-KR' }));
      formData.append('questionnaire', JSON.stringify(questionnaire));
      const payload = {
        ...createGuidePayload('mismatch-session'),
        status,
        assessment: {
          assessmentId: 'assessment-mismatch',
          categoryCode: status === 'COMPLETE' ? 'BLEEDING' : 'UNKNOWN',
          subtypeCode: 'UNKNOWN',
          severityCode: 'UNKNOWN',
          confidence: null,
          redFlags: [],
          call119Required: false,
          summary: '서버의 판단 요약',
          reasons: [],
          missingInputs: status === 'COMPLETE' ? [] : ['category'],
          decisionSource: 'SM_LEGACY',
          modelVersion: null,
        },
        treatment: {
          routeCode: status === 'COMPLETE' ? 'A' : null,
          modelVersion: null,
          steps: status === 'COMPLETE' ? [{
            stepId: 1,
            stepNo: 1,
            instruction: '서버의 처치 안내',
            checkpointQuestion: '상태를 확인해 주세요.',
            requiredItemId: null,
            requiredItemName: null,
            requiredQuantity: 0,
            requiredSlotId: null,
            imageResource: null,
            imageUrl: null,
          }] : [],
        },
      };
      fetchMock.mockResolvedValue(createMockResponse(200, { success: true, data: payload }));
      await expect(createEmergencyGuide(formData)).resolves.toEqual(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        'test-api-base-url/api/v1/emergency-guide-sessions',
        expect.objectContaining({ method: 'POST', body: formData }),
      );
      const fields = formData as unknown as { entries: () => Iterable<readonly [string, unknown]> };
      const submittedQuestionnaire = Array.from(fields.entries()).find(([name]) => name === 'questionnaire')?.[1];
      expect(JSON.parse(submittedQuestionnaire as string)).toEqual(questionnaire);
    },
  );

  it('처치 단계에 기록 가능한 stepId가 없으면 응답을 거부한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue(
      createMockResponse(200, {
        success: true,
        data: {
          ...createGuidePayload('invalid-step-session'),
          treatment: {
            routeCode: 'A',
            modelVersion: null,
            steps: [{ stepId: null }],
          },
        },
      }),
    );

    await expect(createEmergencyGuide(new FormData())).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      message: '응급 가이드 처치 단계 응답이 DTO 계약과 일치하지 않습니다.',
    });
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

    const error = await retryEmergencyGuide('emg-missing').catch(
      (requestError: unknown): unknown => requestError,
    );

    expect(error).toMatchObject<Partial<EmergencyGuideRequestError>>({
      message: 'Emergency guide session was not found',
      status: 404,
      code: 'SESSION_NOT_FOUND',
      details: [],
      requestUrl:
        'test-api-base-url/api/v1/emergency-guide-sessions/emg-missing/guide',
    });
    expect(getEmergencyGuideErrorMessage(error)).toBe(
      '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
    );
    expect(JSON.stringify(consoleWarnMock.mock.calls)).not.toContain(
      'Emergency guide session was not found',
    );
  });

  it.each([
    [413, 'AUDIO_TOO_LARGE', '음성 파일 용량이 너무 큽니다.'],
    [415, 'UNSUPPORTED_IMAGE_TYPE', '지원하지 않는 이미지 형식입니다.'],
    [503, 'SM_UNAVAILABLE', '응급 가이드 서버에 일시적인 문제가 있습니다.'],
  ] as const)(
    '%i %s 오류에 맞는 사용자 안내를 반환한다',
    (status, code, expectedMessage): void => {
      const error = new EmergencyGuideRequestError(
        'server message',
        status,
        code,
        'test-url',
        ['detail'],
      );

      expect(getEmergencyGuideErrorMessage(error)).toContain(expectedMessage);
      expect(error.details).toEqual(['detail']);
    },
  );

  it('네트워크 연결 실패에 맞는 사용자 안내를 반환한다', (): void => {
    expect(
      getEmergencyGuideErrorMessage(new TypeError('Network request failed')),
    ).toBe('네트워크 연결을 확인한 후 다시 시도해 주세요.');
  });
});
