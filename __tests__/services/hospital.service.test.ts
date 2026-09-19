import { fetchNearbyHospitals } from '@/services/hospital.service';
import { ApiRequestError } from '@/services/apiError.service';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async (): Promise<string> => 'test-token'),
  isAuthTokenExpiredError: jest.fn((): boolean => false),
  refreshAuthTokens: jest.fn(),
}));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('fetchNearbyHospitals', () => {
  beforeEach(() => fetchMock.mockReset());

  it('현재 위치로 병원을 조회하고 제공된 응답을 목록 정보로 변환한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{
          hpid: 'A1403121',
          name: '인천더드림병원',
          address: '인천광역시 계양구 계양대로 123(작전동)',
          distance: '0.4',
          isRealTimeAvailable: false,
          availableBeds: null,
          operatingRoomBeds: null,
          ctAvailable: false,
          mriAvailable: false,
        }, {
          hpid: 'A1400014',
          name: '한림병원',
          address: '인천광역시 계양구 장제로 722',
          distance: '1.25',
          isRealTimeAvailable: true,
          availableBeds: 14,
          operatingRoomBeds: 6,
          ctAvailable: true,
          mriAvailable: true,
        }],
      }),
    } as Response);

    await expect(
      fetchNearbyHospitals({ latitude: 37.49, longitude: 126.99 }),
    ).resolves.toEqual([{
      hpid: 'A1403121',
      name: '인천더드림병원',
      address: '인천광역시 계양구 계양대로 123(작전동)',
      distanceInMeters: 400,
      isRealTimeAvailable: false,
      availableBeds: null,
      operatingRoomBeds: null,
      ctAvailable: false,
      mriAvailable: false,
    }, {
      hpid: 'A1400014',
      name: '한림병원',
      address: '인천광역시 계양구 장제로 722',
      distanceInMeters: 1250,
      isRealTimeAvailable: true,
      availableBeds: 14,
      operatingRoomBeds: 6,
      ctAvailable: true,
      mriAvailable: true,
    }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/v1/facilities/hospitals?lat=37.49&lng=126.99',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('서버 오류 정보를 유지한다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        success: false,
        error: { code: 'INVALID_LOCATION', message: '위치를 확인해 주세요.' },
      }),
    } as Response);

    await expect(
      fetchNearbyHospitals({ latitude: 37.5, longitude: 127 }),
    ).rejects.toMatchObject<Partial<ApiRequestError>>({
      status: 400,
      code: 'INVALID_LOCATION',
      message: '위치를 확인해 주세요.',
    });
  });
});
