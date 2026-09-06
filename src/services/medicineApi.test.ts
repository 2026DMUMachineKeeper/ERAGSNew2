import {
  deleteMedicine,
  fetchMedicineById,
  fetchMedicines,
  postMedicineVision,
} from './medicineApi';
import { ApiRequestError } from './apiError.service';

jest.mock('./auth.service', () => ({
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
});
