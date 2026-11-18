import {
  deleteMedicine,
  fetchMedicineById,
  fetchMedicines,
  fetchMedicineAlerts,
  postMedicineVision,
  postMedicineManual,
  postMedicineUse,
  updateMedicine,
} from '@/services/medicineApi';
import { ApiRequestError } from '@/services/apiError.service';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async (): Promise<string> => 'test-token'),
  isAuthTokenExpiredError: jest.fn((): boolean => false),
  refreshAuthTokens: jest.fn(),
}));

interface MockResponseOptions {
  ok: boolean;
  status: number;
  text: jest.Mock;
}

const createMockResponse = ({
  ok,
  status,
  text,
}: MockResponseOptions): Response =>
  ({
    ok,
    status,
    text,
  } as unknown as Response);

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('postMedicineUse', () => {
  beforeEach(() => fetchMock.mockReset());

  it('숫자 ID와 사용 수량만 인증된 POST 요청으로 보낸다', async () => {
    fetchMock.mockResolvedValue(createMockResponse({
      ok: true, status: 204, text: jest.fn(),
    }));

    await expect(postMedicineUse({ id: 1, quantityToUse: 2 })).resolves.toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/medicines/use',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ id: 1, quantityToUse: 2 }),
      }),
    );
  });

  it('차감 실패 시 서버 상태와 에러 정보를 유지한다', async () => {
    fetchMock.mockResolvedValue(createMockResponse({
      ok: false, status: 409,
      text: jest.fn(async () => JSON.stringify({ error: {
        code: 'INSUFFICIENT_STOCK', message: '재고 부족', details: [1],
      } })),
    }));

    await expect(postMedicineUse({ id: 1, quantityToUse: 2 })).rejects.toMatchObject({
      status: 409, code: 'INSUFFICIENT_STOCK', message: '재고 부족', details: [1],
    });
  });
});

describe('deleteMedicine', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
  });

  it('204 응답은 JSON 파싱 없이 성공 처리한다', async (): Promise<void> => {
    const text = jest.fn();
    fetchMock.mockResolvedValue(
      createMockResponse({ ok: true, status: 204, text }),
    );

    await expect(deleteMedicine('1')).resolves.toEqual({});
    expect(text).not.toHaveBeenCalled();
  });

  it('본문이 없는 200 응답도 성공 처리한다', async (): Promise<void> => {
    const text = jest.fn(async (): Promise<string> => '');
    fetchMock.mockResolvedValue(
      createMockResponse({ ok: true, status: 200, text }),
    );

    await expect(deleteMedicine('1')).resolves.toEqual({});
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('실패 응답은 본문 파싱보다 상태 코드를 우선한다', async (): Promise<void> => {
    const text = jest.fn(
      async (): Promise<string> =>
        JSON.stringify({
          success: false,
          error: {
            code: 'MEDICINE_NOT_FOUND',
            message: 'medicine missing',
            details: ['medicine-1'],
          },
        }),
    );
    fetchMock.mockResolvedValue(
      createMockResponse({ ok: false, status: 500, text }),
    );

    const error = await deleteMedicine('1').catch(
      (requestError: unknown): unknown => requestError,
    );

    expect(error).toMatchObject<Partial<ApiRequestError>>({
      status: 500,
      code: 'MEDICINE_NOT_FOUND',
      message: 'medicine missing',
      details: ['medicine-1'],
    });
    expect(text).toHaveBeenCalledTimes(1);
  });

  it('약품 상세는 목록 응답에서 ID가 같은 항목을 반환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => [
        {
          id: 'medicine-1',
          name: '붕대',
          efficacy: '상처 보호',
          usage: '상처 부위에 감습니다.',
          quantity: 2,
        },
      ],
    } as Response);

    await expect(fetchMedicineById('medicine-1')).resolves.toMatchObject({
      id: 'medicine-1',
      name: '붕대',
      qty: 2,
    });
  });

  it.each([null, {}, { data: {} }, { data: [null] }])(
    '잘못된 목록 응답은 빈 목록으로 처리하지 않는다',
    async (payload): Promise<void> => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<unknown> => payload,
      } as Response);

      await expect(fetchMedicines()).rejects.toThrow(
        '약품 목록 응답 형식이 올바르지 않습니다.',
      );
    },
  );

  it.each([[], { data: [] }, { medicines: [] }])(
    '정상적인 빈 목록 응답은 빈 배열을 반환한다',
    async (payload): Promise<void> => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async (): Promise<unknown> => payload,
      } as Response);

      await expect(fetchMedicines()).resolves.toEqual([]);
    },
  );
});

describe('medicine expiry and alerts', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
  });

  it('알림 API의 상태 플래그와 유통기한을 반환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => ({
        success: true,
        data: [{
          id: 1,
          name: '멸균 거즈',
          quantity: 2,
          threshold: 3,
          expire_date: '2026-10-15',
          isLowStock: true,
          isExpiringSoon: true,
          isExpired: false,
        }],
      }),
    } as Response);

    await expect(fetchMedicineAlerts()).resolves.toMatchObject([{
      id: '1',
      expireDate: '2026-10-15',
      isLowStock: true,
      isExpiringSoon: true,
      isExpired: false,
    }]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/medicines/alerts'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('수동 등록과 수정 요청에 유통기한을 담는다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      text: jest.fn(),
    } as unknown as Response);

    await postMedicineManual({ name: '거즈', expire_date: '2026-10-15' });
    await updateMedicine('1', { expire_date: null });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      name: '거즈',
      expire_date: '2026-10-15',
    });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ expire_date: null });
  });
});

describe('postMedicineVision', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
  });

  it('성공 응답의 data에 포함된 등록 결과를 반환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => ({
        success: true,
        data: {
          isRegistered: true,
          step: null,
          id: 1,
          name: '멸균 거즈',
          quantity: 9,
          usage: '상처 부위 압박',
          efficacy: '출혈 억제',
        },
        message: 'AI 인식 및 등록 성공',
      }),
    } as Response);

    await expect(
      postMedicineVision({ imageBase64: 'base64-image' }),
    ).resolves.toEqual({
      isRegistered: true,
      step: null,
      id: 1,
      name: '멸균 거즈',
      quantity: 9,
      usage: '상처 부위 압박',
      efficacy: '출혈 억제',
    });
  });

  it('최상위 등록 여부와 data의 약품 정보를 반환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => ({
        success: true,
        isRegistered: true,
        data: {
          id: 15,
          name: '타이레놀정 500 밀리그램',
          quantity: 4,
          usage: '필요시 복용',
          efficacy: '두통, 발열',
        },
      }),
    } as Response);

    await expect(
      postMedicineVision({ imageBase64: 'base64-image' }),
    ).resolves.toEqual({
      isRegistered: true,
      step: null,
      id: 15,
      name: '타이레놀정 500 밀리그램',
      quantity: 4,
      usage: '필요시 복용',
      efficacy: '두통, 발열',
    });
  });

  it('등록되지 않은 응답은 직접 입력 결과로 반환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => ({
        success: true,
        isRegistered: false,
        data: {},
      }),
    } as Response);

    await expect(
      postMedicineVision({ imageBase64: 'base64-image' }),
    ).resolves.toEqual({
      isRegistered: false,
      step: null,
    });
  });
});
