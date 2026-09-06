import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import {
  launchCamera,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { invalidateMedicines } from '../query';
import { postMedicineVision } from '../services/medicineApi';
import { getApiErrorUserMessage } from '../services/apiError.service';
import { isAuthSessionExpiredError } from '../services/auth.service';
import { redirectToLoginForExpiredSession } from '../utils/authSessionNavigation';
import tailwindConfig from '../../tailwind.config';
import { CameraRedIcon } from '../assets';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineAdd'>;

const { colors } = tailwindConfig;
const CAMERA_START_ERROR_MESSAGE =
  '카메라를 실행하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const CAMERA_PERMISSION_ERROR_MESSAGE =
  '카메라 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_REGISTER_ERROR_MESSAGE =
  '약품을 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.';
const MEDICINE_IMAGE_TOO_LARGE_MESSAGE =
  '사진 용량이 너무 큽니다. 다시 촬영해 주세요.';
const MEDICINE_IMAGE_UNSUPPORTED_MESSAGE =
  '지원하지 않는 이미지 형식입니다. 다른 사진으로 다시 시도해 주세요.';

const stripDataUriPrefix = (value: string) => {
  const marker = 'base64,';
  const markerIndex = value.indexOf(marker);

  if (markerIndex === -1) {
    return value;
  }

  return value.slice(markerIndex + marker.length);
};

const fileUriToBase64 = async (uri: string) => {
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

const requestCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const current = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );

  if (current) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: '카메라 권한 필요',
      message: '약품 사진을 촬영하려면 카메라 권한이 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '취소',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export function MedicineAddScreen({ navigation }: Props) {
  const [isUploading, setIsUploading] = React.useState(false);

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  const closeToMedicineMemo = React.useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
    });
  }, [navigation]);

  const handleOpenSettings = async (): Promise<void> => {
    try {
      await Linking.openSettings();
    } catch (error: unknown) {
      console.error('[MedicineAddScreen] 설정 열기 실패:', error);
      Alert.alert(
        '설정 열기 실패',
        '기기 설정을 열지 못했습니다. 설정 앱에서 카메라 권한을 확인해 주세요.',
      );
    }
  };

  const uploadCapturedPhoto = async (imageBase64: string) => {
    setIsUploading(true);

    try {
      const registerResult = await postMedicineVision({
        imageBase64,
        quantityToAdd: 1,
      });

      if (registerResult.isRegistered !== true) {
        console.warn(
          '[MedicineAddScreen] medicine photo needs manual input:',
          registerResult,
        );

        Alert.alert(
          '추가 입력 필요',
          '사진에서 약품 정보를 확인하지 못했습니다. 약품 이름을 직접 입력해 주세요.',
          [
            {
              text: '직접 입력',
              onPress: () =>
                navigation.dispatch(
                  StackActions.replace('MedicineManualInput'),
                ),
            },
          ],
        );
        return;
      }

      invalidateMedicines();
      Alert.alert('등록 완료', '약품 정보가 자동으로 등록되었습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { screen: 'MedicinesTab' } }],
            }),
        },
      ]);
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        console.warn('[MedicineAddScreen] auth session expired:', error);
        handleAuthSessionExpired();
        return;
      }

      console.error('[MedicineAddScreen] uploadCapturedPhoto failed', error);
      const message = getApiErrorUserMessage(error, {
        codeMessages: {
          IMAGE_TOO_LARGE: MEDICINE_IMAGE_TOO_LARGE_MESSAGE,
          INVALID_REQUEST: '촬영한 사진을 확인하고 다시 시도해 주세요.',
          UNSUPPORTED_IMAGE_TYPE: MEDICINE_IMAGE_UNSUPPORTED_MESSAGE,
        },
        fallbackMessage: MEDICINE_REGISTER_ERROR_MESSAGE,
        statusMessages: {
          413: MEDICINE_IMAGE_TOO_LARGE_MESSAGE,
          415: MEDICINE_IMAGE_UNSUPPORTED_MESSAGE,
        },
      });

      Alert.alert('등록 실패', message);
    } finally {
      setIsUploading(false);
    }
  };

  const openCamera = async () => {
    if (isUploading) {
      return;
    }

    let hasPermission: boolean;

    try {
      hasPermission = await requestCameraPermission();
    } catch (error: unknown) {
      console.error('[MedicineAddScreen] 카메라 권한 확인 실패:', error);
      Alert.alert('권한 확인 실패', CAMERA_PERMISSION_ERROR_MESSAGE);
      return;
    }

    if (!hasPermission) {
      Alert.alert('권한 필요', '카메라 권한을 허용해야 촬영할 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: handleOpenSettings },
      ]);
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      saveToPhotos: false,
      quality: 0.9,
      cameraType: 'back',
    };

    try {
      const response: ImagePickerResponse = await launchCamera(options);

      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        console.error('[MedicineAddScreen] image picker failed:', {
          errorCode: response.errorCode,
          errorMessage: response.errorMessage,
        });
        Alert.alert('촬영 실패', CAMERA_START_ERROR_MESSAGE);
        return;
      }

      const asset = response.assets?.[0];

      if (!asset) {
        Alert.alert('촬영 실패', '카메라 결과를 가져오지 못했습니다.');
        return;
      }

      const imageBase64 =
        typeof asset.base64 === 'string' && asset.base64.length > 0
          ? asset.base64
          : asset.uri
          ? await fileUriToBase64(asset.uri)
          : '';

      if (!imageBase64) {
        Alert.alert('촬영 실패', '촬영한 사진 데이터를 읽지 못했습니다.');
        return;
      }

      await uploadCapturedPhoto(imageBase64);
    } catch (error) {
      console.error('[MedicineAddScreen] launchCamera failed', error);
      Alert.alert('촬영 실패', CAMERA_START_ERROR_MESSAGE);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-memoCard" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center"
            onPress={closeToMedicineMemo}
          >
            <Text className="text-2xl text-memoText">x</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityLabel="약품 사진 촬영"
          accessibilityRole="button"
          activeOpacity={0.9}
          className="relative mt-8 items-center justify-center overflow-hidden rounded-xl border border-dashed border-memoRed bg-camera_bg px-5 py-[80px]"
          disabled={isUploading}
          onPress={openCamera}
        >
          <View className="mb-5 items-center justify-center">
            <CameraRedIcon width={48} height={48} />
          </View>

          <Text className="text-base font-suitBold text-memoText">
            약품 사진을 먼저 촬영해 주세요
          </Text>

          <Text className="mt-5 text-center text-sm text-memoSubText">
            후면 카메라로 약품의 제품명이 잘 보이도록 촬영합니다.
          </Text>

          {isUploading ? (
            <View className="absolute inset-0 z-10 items-center justify-center bg-camera_bg/80">
              <ActivityIndicator size="large" color={colors.memoRed} />
            </View>
          ) : null}
        </TouchableOpacity>

        <View className="mt-5 flex-row items-center">
          <View className="h-[1px] flex-1 bg-memoLine" />
          <Text className="mx-4 text-sm font-suitBold text-memoSubText">
            또는
          </Text>
          <View className="h-[1px] flex-1 bg-memoLine" />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          className="mt-5 min-h-[88px] flex-row items-center rounded-xl border border-blue-200 bg-blue-50 px-4"
          onPress={() =>
            navigation.dispatch(StackActions.replace('MedicineManualInput'))
          }
        >
          <Text className="mr-3 text-2xl text-memoBlue">+</Text>

          <View className="flex-1">
            <Text className="text-base font-suitBold text-memoText">
              직접 수동 입력하기
            </Text>

            <Text className="mt-1 text-xs leading-5 text-memoSubText">
              사진 말고 직접 입력할 수 있어요.
            </Text>
          </View>

          <Text className="text-2xl text-memoBlue">{'>'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
