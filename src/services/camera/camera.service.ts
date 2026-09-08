import { PermissionsAndroid, Platform } from 'react-native';

const stripDataUriPrefix = (value: string): string => {
  const marker = 'base64,';
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return value;
  }

  return value.slice(markerIndex + marker.length);
};

export const fileUriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('촬영한 사진을 base64로 변환하지 못했습니다.'));
    };
    reader.onloadend = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error('촬영한 사진 데이터를 읽지 못했습니다.'));
        return;
      }

      resolve(stripDataUriPrefix(result));
    };

    reader.readAsDataURL(blob);
  });
};

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const current = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);

  if (current) {
    return true;
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: '카메라 권한 필요',
    message: '약품 사진을 촬영하려면 카메라 권한이 필요합니다.',
    buttonPositive: '허용',
    buttonNegative: '취소',
  });

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};
