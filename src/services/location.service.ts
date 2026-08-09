import Geolocation from '@react-native-community/geolocation';
import * as Keychain from 'react-native-keychain';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const LOCATION_PERMISSION_PROMPT_SERVICE = 'erags.location.permission.prompt';

interface AddressModule {
  getAddress: (latitude: number, longitude: number) => Promise<string>;
}

const addressModule = NativeModules.AddressModule as AddressModule | undefined;

export const hasLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
  }

  if (Platform.OS === 'ios') {
    const status = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  }

  return false;
};

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return new Promise(resolve => {
      Geolocation.requestAuthorization(
        () => resolve(true),
        () => resolve(false),
      );
    });
  }

  const isGranted = await hasLocationPermission();
  if (isGranted) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: '위치 권한 필요',
      message:
        '긴급 신고 문자에 현재 위치를 포함하려면 위치 권한이 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '취소',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const markLocationPermissionPromptPending = async (
  email: string,
): Promise<void> => {
  try {
    await Keychain.setGenericPassword(email, 'pending', {
      service: LOCATION_PERMISSION_PROMPT_SERVICE,
    });
  } catch (error) {
    console.warn('[location.service] 위치 권한 안내 예약 실패:', error);
  }
};

export const consumeLocationPermissionPrompt = async (
  email: string,
): Promise<boolean> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: LOCATION_PERMISSION_PROMPT_SERVICE,
    });
    if (!credentials) {
      return false;
    }

    const isPending =
      credentials.username.toLowerCase() === email.toLowerCase();

    if (isPending) {
      await Keychain.resetGenericPassword({
        service: LOCATION_PERMISSION_PROMPT_SERVICE,
      });
    }

    return isPending;
  } catch (error) {
    console.warn('[location.service] 위치 권한 안내 상태 확인 실패:', error);
    return false;
  }
};

export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  if (Platform.OS !== 'android' || !addressModule) {
    return null;
  }

  try {
    return await addressModule.getAddress(latitude, longitude);
  } catch (error) {
    console.warn('[location.service] 주소 변환 실패:', error);
    return null;
  }
};
