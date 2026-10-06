import React from 'react';
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { MedicineAddScreen } from '@/screens/MedicineAddScreen';
import { launchCamera } from 'react-native-image-picker';
import { postMedicineVision, updateMedicine } from '@/services/medicineApi';

jest.mock('@/assets', () => ({
  CameraRedIcon: (): null => null,
}));

jest.mock('@/query', () => ({
  invalidateMedicines: jest.fn(),
}));

jest.mock('@/services/medicineApi', () => ({
  postMedicineVision: jest.fn(),
  updateMedicine: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
}));

jest.mock('@/services/auth.service', () => ({
  isAuthSessionExpiredError: jest.fn((): boolean => false),
}));

jest.mock('@/utils/authSessionNavigation', () => ({
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

  it('사진 등록 후 선택한 유통기한을 저장한다', async (): Promise<void> => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    jest.mocked(launchCamera).mockResolvedValue({
      assets: [{ base64: 'encoded-photo' }],
    });
    jest.mocked(postMedicineVision).mockResolvedValue({
      isRegistered: true,
      id: 7,
      name: '거즈',
      efficacy: '보호',
      usage: '부착',
      step: null,
    });
    jest.mocked(updateMedicine).mockResolvedValue({});

    await pressCamera();
    const input = renderer?.root.findByType(TextInput);
    await act(async (): Promise<void> => input?.props.onChangeText('20261015'));
    expect(renderer?.root.findByType(TextInput).props.value).toBe('2026-10-15');
    const saveButton = renderer?.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button
          .findAllByType(Text)
          .some(label => label.props.children === '등록 완료'),
      );
    // 실제 TouchableOpacity처럼 press 이벤트 객체를 인자로 넘깁니다.
    await act(async (): Promise<void> =>
      saveButton?.props.onPress({ nativeEvent: {} }),
    );

    expect(updateMedicine).toHaveBeenCalledWith('7', {
      expire_date: '2026-10-15',
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      '등록 완료',
      '약품 정보가 자동으로 등록되었습니다.',
      expect.any(Array),
    );
  });

  it('유통기한 없이 약품을 등록할 수 있다', async (): Promise<void> => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    jest.mocked(launchCamera).mockResolvedValue({
      assets: [{ base64: 'encoded-photo' }],
    });
    jest.mocked(postMedicineVision).mockResolvedValue({
      isRegistered: true,
      id: 7,
      name: '거즈',
      efficacy: '보호',
      usage: '부착',
      step: null,
    });

    await pressCamera();
    const skipButton = renderer?.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button
          .findAllByType(Text)
          .some(label => label.props.children === '유통기한 없이 등록하기'),
      );
    await act(async (): Promise<void> => skipButton?.props.onPress());

    expect(updateMedicine).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      '등록 완료',
      '약품 정보가 자동으로 등록되었습니다.',
      expect.any(Array),
    );
  });
});
