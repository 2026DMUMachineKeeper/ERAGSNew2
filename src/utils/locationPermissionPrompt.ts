import { Alert } from 'react-native';

import { requestLocationPermission } from '@/services';

const handleLocationPermissionRequest = async (): Promise<void> => {
  try {
    const isGranted = await requestLocationPermission();
    if (!isGranted) {
      Alert.alert(
        '위치 권한 미허용',
        '기기 설정에서 위치 권한을 나중에 허용할 수 있습니다.',
      );
    }
  } catch (error) {
    console.error('[locationPermissionPrompt] 위치 권한 요청 실패:', error);
    Alert.alert('권한 요청 실패', '기기 설정에서 위치 권한을 확인해 주세요.');
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
