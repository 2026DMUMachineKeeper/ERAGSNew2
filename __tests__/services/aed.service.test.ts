import { fetchNearbyAeds } from '@/services/aed.service';
import { ApiRequestError } from '@/services/apiError.service';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async (): Promise<string> => 'test-token'),
  isAuthTokenExpiredError: jest.fn((): boolean => false),
  refreshAuthTokens: jest.fn(),
}));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('fetchNearbyAeds', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
  });

  it('위치를 전달해 AED 목록을 좌표와 거리값으로 변환한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async (): Promise<unknown> => ({
        success: true,
        data: [
          {
            name: '계산1동주민센터',
            address: '인천광역시 계양구 향교로 24',
            lat: '37.5396051913',
            lng: '126.7213476855',
            phone: '032*******',
            distance: '0.16',
            detailPlaces: ['1층 민원실내'],
          },
        ],
      }),
    } as Response);

    await expect(
      fetchNearbyAeds({ latitude: 37.538, longitude: 126.722 }),
    ).resolves.toEqual([
      {
        name: '계산1동주민센터',
        address: '인천광역시 계양구 향교로 24',
        latitude: 37.5396051913,
        longitude: 126.7213476855,
        phone: '032*******',
        distanceInMeters: 160,
        detailPlaces: ['1층 민원실내'],
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/v1/facilities/aeds?lat=37.538&lng=126.722',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('서버 오류의 상태와 오류 정보를 유지한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async (): Promise<string> =>
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_LOCATION',
            message: '위치를 확인해 주세요.',
            details: [],
          },
        }),
    } as Response);

    await expect(
      fetchNearbyAeds({ latitude: 37.538, longitude: 126.722 }),
    ).rejects.toMatchObject<Partial<ApiRequestError>>({
      status: 400,
      code: 'INVALID_LOCATION',
      message: '위치를 확인해 주세요.',
    });
  });
});
