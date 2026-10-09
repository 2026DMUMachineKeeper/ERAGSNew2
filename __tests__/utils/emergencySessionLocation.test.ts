import Geolocation, {
  type GeolocationResponse,
} from '@react-native-community/geolocation';

import { reportEmergencySessionLocation } from '@/services/emergencyGuide.service';
import { hasLocationPermission } from '@/services/location.service';

import {
  collectEmergencySessionLocation,
  reportEmergencySessionLocationOnce,
} from '@/utils/emergencySessionLocation';

jest.mock('@/services/emergencyGuide.service', () => ({
  reportEmergencySessionLocation: jest.fn(),
}));
jest.mock('@/services/location.service', () => ({
  hasLocationPermission: jest.fn(),
}));

// accuracy는 라이브러리 타입상 number지만 기기에 따라 비어 올 수 있어 null도 흉내 냅니다.
const mockPositionOnce = (
  coords: { latitude: number; longitude: number; accuracy: number | null },
  timestamp = Date.UTC(2026, 9, 3, 8, 0, 0),
): void => {
  const position = {
    coords: {
      ...coords,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp,
  } as unknown as GeolocationResponse;

  jest
    .mocked(Geolocation.getCurrentPosition)
    .mockImplementationOnce((success): void => {
      success(position);
    });
};

const mockPositionErrorOnce = (code: number): void => {
  jest
    .mocked(Geolocation.getCurrentPosition)
    .mockImplementationOnce((_success, error): void => {
      error?.({
        code,
        message: `geolocation error ${code}`,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });
};

describe('응급 세션 위치 보고', () => {
  const consoleWarnMock = jest
    .spyOn(console, 'warn')
    .mockImplementation((): void => undefined);

  beforeEach((): void => {
    jest.clearAllMocks();
    jest.mocked(hasLocationPermission).mockResolvedValue(true);
    jest.mocked(reportEmergencySessionLocation).mockResolvedValue();
  });

  afterAll((): void => {
    consoleWarnMock.mockRestore();
  });

  it('위치 권한이 없으면 DENIED와 null 좌표를 만든다', async (): Promise<void> => {
    jest.mocked(hasLocationPermission).mockResolvedValue(false);

    await expect(collectEmergencySessionLocation()).resolves.toEqual({
      status: 'DENIED',
      observedAt: expect.any(String),
      latitude: null,
      longitude: null,
      accuracy: null,
    });
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('GPS 조회 성공 시 관측 시각과 정확도를 포함한 AVAILABLE을 만든다', async (): Promise<void> => {
    mockPositionOnce({ latitude: 37.55, longitude: 126.93, accuracy: 20 });

    await expect(collectEmergencySessionLocation()).resolves.toEqual({
      status: 'AVAILABLE',
      observedAt: '2026-10-03T08:00:00.000Z',
      latitude: 37.55,
      longitude: 126.93,
      accuracy: 20,
    });
  });

  it('정확도가 없으면 null로 두고 비정상 시각은 현재 시각으로 대체한다', async (): Promise<void> => {
    mockPositionOnce(
      { latitude: 37.55, longitude: 126.93, accuracy: null },
      Number.NaN,
    );

    const report = await collectEmergencySessionLocation();

    expect(report.accuracy).toBeNull();
    expect(Number.isNaN(Date.parse(report.observedAt))).toBe(false);
  });

  it('저정밀·고정밀 조회가 모두 실패하면 UNAVAILABLE을 만든다', async (): Promise<void> => {
    mockPositionErrorOnce(3);
    mockPositionErrorOnce(2);

    await expect(collectEmergencySessionLocation()).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      latitude: null,
      longitude: null,
      accuracy: null,
    });
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  it('조회 중 권한 거절(code 1)은 재시도 없이 DENIED로 보고한다', async (): Promise<void> => {
    mockPositionErrorOnce(1);

    await expect(collectEmergencySessionLocation()).resolves.toMatchObject({
      status: 'DENIED',
    });
    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('세션당 한 번만 서버에 보고한다', async (): Promise<void> => {
    mockPositionOnce({ latitude: 37.55, longitude: 126.93, accuracy: 20 });

    await reportEmergencySessionLocationOnce('session-once');
    await reportEmergencySessionLocationOnce('session-once');

    expect(reportEmergencySessionLocation).toHaveBeenCalledTimes(1);
    expect(reportEmergencySessionLocation).toHaveBeenCalledWith(
      'session-once',
      {
        status: 'AVAILABLE',
        observedAt: '2026-10-03T08:00:00.000Z',
        latitude: 37.55,
        longitude: 126.93,
        accuracy: 20,
      },
    );
  });

  it('sessionId가 없으면 아무것도 하지 않는다', async (): Promise<void> => {
    await reportEmergencySessionLocationOnce(null);
    await reportEmergencySessionLocationOnce('   ');

    expect(hasLocationPermission).not.toHaveBeenCalled();
    expect(reportEmergencySessionLocation).not.toHaveBeenCalled();
  });

  it('서버 저장 실패는 던지지 않고 로그만 남긴다', async (): Promise<void> => {
    jest.mocked(hasLocationPermission).mockResolvedValue(false);
    jest
      .mocked(reportEmergencySessionLocation)
      .mockRejectedValue(new Error('conflict'));

    await expect(
      reportEmergencySessionLocationOnce('session-failed'),
    ).resolves.toBeUndefined();

    expect(consoleWarnMock).toHaveBeenCalledWith(
      '[EmergencySessionLocation] 세션 위치 보고 실패:',
      expect.objectContaining({
        sessionId: 'session-failed',
        errorMessage: 'conflict',
      }),
    );
  });
});
