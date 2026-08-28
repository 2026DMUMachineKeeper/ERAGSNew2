import { deleteMedicine, fetchMedicineById } from './medicineApi';

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
    const text = jest.fn();
    fetchMock.mockResolvedValue(
      createMockResponse({ ok: false, status: 500, text }),
    );

    await expect(deleteMedicine('1')).rejects.toThrow('약품 삭제 실패: 500');
    expect(text).not.toHaveBeenCalled();
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
});
