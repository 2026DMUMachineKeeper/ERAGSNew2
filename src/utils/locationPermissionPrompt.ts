import { Alert, Linking } from 'react-native';

import { requestLocationPermission } from '@/services';

const handleOpenSettings = async (): Promise<void> => {
  try {
    await Linking.openSettings();
  } catch (error: unknown) {
    console.error('[locationPermissionPrompt] 설정 열기 실패:', error);
    Alert.alert(
      '설정 열기 실패',
      '기기 설정에서 ERAGS의 위치 권한을 직접 허용해 주세요.',
    );
  }
};

const showLocationSettingsPrompt = (): void => {
  Alert.alert(
    '위치 권한 설정 필요',
    '현재 위치를 사용하려면 기기 설정에서 위치 권한을 허용해 주세요.',
    [
      { text: '취소', style: 'cancel' },
      { text: '설정으로 이동', onPress: handleOpenSettings },
    ],
  );
};

const handleLocationPermissionRequest = async (): Promise<void> => {
  try {
    const permissionStatus = await requestLocationPermission();
    if (permissionStatus === 'granted') {
      return;
    }

    if (permissionStatus === 'blocked') {
      showLocationSettingsPrompt();
      return;
    }

    Alert.alert(
      '위치 권한 미허용',
      '긴급 문자에 현재 위치를 포함하려면 위치 권한이 필요합니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '다시 요청', onPress: handleLocationPermissionRequest },
      ],
    );
  } catch (error) {
    console.error('[locationPermissionPrompt] 위치 권한 요청 실패:', error);
    showLocationSettingsPrompt();
  }
};

export const showLocationPermissionPrompt = (): void => {
  Alert.alert(
    '긴급 문자 위치 설정',
    '긴급 문자에 현재 위치를 포함하려면 위치 권한이 필요합니다.',
    [
      { text: '나중에 하기', style: 'cancel' },
      {
        text: '허용',
        onPress: handleLocationPermissionRequest,
      },
    ],
  );
};
