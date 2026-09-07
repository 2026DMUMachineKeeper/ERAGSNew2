import { Alert, Linking } from 'react-native';

import { requestLocationPermission } from '@/services';

import { showLocationPermissionPrompt } from './locationPermissionPrompt';

jest.mock('@/services', () => ({
  requestLocationPermission: jest.fn(),
}));

describe('위치 권한 안내', () => {
  afterEach((): void => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('영구 거절 상태이면 설정 이동 버튼을 제공한다', async (): Promise<void> => {
    jest.mocked(requestLocationPermission).mockResolvedValue('blocked');
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});
    const openSettingsSpy = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    showLocationPermissionPrompt();
    const initialButtons = alertSpy.mock.calls[0]?.[2];
    await initialButtons?.[1]?.onPress?.();

    expect(alertSpy).toHaveBeenLastCalledWith(
      '위치 권한 설정 필요',
      '현재 위치를 사용하려면 기기 설정에서 위치 권한을 허용해 주세요.',
      expect.any(Array),
    );

    const settingsButtons = alertSpy.mock.calls[1]?.[2];
    await settingsButtons?.[1]?.onPress?.();
    expect(openSettingsSpy).toHaveBeenCalledTimes(1);
  });

  it('다시 요청 가능한 거절 상태이면 재요청 버튼을 제공한다', async (): Promise<void> => {
    jest.mocked(requestLocationPermission).mockResolvedValue('denied');
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});

    showLocationPermissionPrompt();
    const initialButtons = alertSpy.mock.calls[0]?.[2];
    await initialButtons?.[1]?.onPress?.();

    const retryButtons = alertSpy.mock.calls[1]?.[2];
    expect(retryButtons?.[1]?.text).toBe('다시 요청');
  });
});
