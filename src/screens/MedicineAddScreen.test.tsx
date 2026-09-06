import React from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { MedicineAddScreen } from './MedicineAddScreen';

jest.mock('../assets', () => ({
  CameraRedIcon: (): null => null,
}));

jest.mock('../query', () => ({
  invalidateMedicines: jest.fn(),
}));

jest.mock('../services/medicineApi', () => ({
  postMedicineVision: jest.fn(),
}));

jest.mock('../services/auth.service', () => ({
  isAuthSessionExpiredError: jest.fn((): boolean => false),
}));

jest.mock('../utils/authSessionNavigation', () => ({
  redirectToLoginForExpiredSession: jest.fn(),
}));

describe('MedicineAddScreen 카메라 오류 처리', () => {
  const originalPlatformOs = Platform.OS;
  let renderer: ReactTestRenderer | undefined;

  beforeEach(async (): Promise<void> => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
    jest.spyOn(console, 'error').mockImplementation((): void => {});
    await act(async (): Promise<void> => {
      renderer = create(
        <MedicineAddScreen navigation={{} as never} route={{} as never} />,
      );
    });
  });

  afterEach((): void => {
    renderer?.unmount();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOs,
    });
    jest.restoreAllMocks();
  });

  const pressCamera = async (): Promise<void> => {
    const cameraButton = renderer?.root
      .findAllByType(TouchableOpacity)
      .find(button => button.props.accessibilityLabel === '약품 사진 촬영');

    if (!cameraButton) {
      throw new Error('약품 사진 촬영 버튼을 찾을 수 없습니다.');
    }

    await act(async (): Promise<void> => cameraButton.props.onPress());
  };

  it('권한 요청 실패를 사용자에게 안내한다', async (): Promise<void> => {
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockRejectedValue(new Error('권한 오류'));

    await pressCamera();

    expect(Alert.alert).toHaveBeenCalledWith(
      '권한 확인 실패',
      '카메라 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  });

  it('기기 설정을 열지 못하면 대체 방법을 안내한다', async (): Promise<void> => {
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    jest
      .spyOn(Linking, 'openSettings')
      .mockRejectedValue(new Error('설정 오류'));

    await pressCamera();
    const permissionAlert = jest.mocked(Alert.alert).mock.calls[0];
    const settingsButton = permissionAlert?.[2]?.find(
      button => button.text === '설정 열기',
    );
    await act(async (): Promise<void> => {
      await settingsButton?.onPress?.();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      '설정 열기 실패',
      '기기 설정을 열지 못했습니다. 설정 앱에서 카메라 권한을 확인해 주세요.',
    );
  });
});
