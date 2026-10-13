import Geolocation, {
  type GeolocationError,
  type GeolocationOptions,
  type GeolocationResponse,
} from '@react-native-community/geolocation';

export const requestCurrentPosition = (
  options: GeolocationOptions,
): Promise<GeolocationResponse> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });

export const isLocationPermissionDeniedError = (
  error: unknown,
): error is GeolocationError =>
  error !== null &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 1;

// 빠른 저정밀 조회를 먼저 시도하고, 실패하면 고정밀 조회로 한 번 더 시도합니다.
// 권한 거절은 재시도해도 같은 결과이므로 바로 던집니다.
export const getCurrentPosition = async (): Promise<GeolocationResponse> => {
  try {
    return await requestCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  } catch (error: unknown) {
    if (isLocationPermissionDeniedError(error)) {
      throw error;
    }

    return requestCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000,
    });
  }
};
