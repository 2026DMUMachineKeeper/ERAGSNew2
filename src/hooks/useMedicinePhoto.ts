import React from 'react';
import { Alert, Linking } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StackActions } from '@react-navigation/native';
import {
  launchCamera,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';

import type { MedicinePhotoState } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { invalidateMedicines } from '@/query';
import { postMedicineVision, updateMedicine } from '@/services/medicineApi';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';
import { fileUriToBase64, requestCameraPermission } from '@/services/camera';
import {
  formatMedicineExpireDateInput,
  getMedicineExpireDateError,
} from '@/utils/medicine/medicineExpireDateValidation';

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

export const useMedicinePhoto = (
  navigation: NativeStackScreenProps<
    RootStackParamList,
    'MedicineAdd'
  >['navigation'],
): MedicinePhotoState => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSavingExpiry, setIsSavingExpiry] = React.useState(false);
  const [registeredMedicine, setRegisteredMedicine] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [expireDate, setExpireDate] = React.useState('');
  const [expireDateError, setExpireDateError] = React.useState<string | null>(
    null,
  );

  const handleAuthSessionExpired = React.useCallback((): void => {
    redirectToLoginForExpiredSession(navigation);
  }, [navigation]);

  // 등록 화면을 이동 기록에서 지워 뒤로가기로 같은 약품을 다시 등록하지 않게 합니다.
  const handleClose = React.useCallback((): void => {
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

  const handleExpireDateChange = (nextText: string): void => {
    setExpireDate(formatMedicineExpireDateInput(nextText));
    setExpireDateError(null);
  };

  const handleConfirmRegistration = async (
    shouldSkipExpiry = false,
  ): Promise<void> => {
    if (!registeredMedicine || isSavingExpiry) {
      return;
    }

    const nextExpireDate = shouldSkipExpiry ? '' : expireDate;
    const error = getMedicineExpireDateError(nextExpireDate);
    setExpireDateError(error);
    if (error) {
      return;
    }

    if (nextExpireDate.trim()) {
      try {
        setIsSavingExpiry(true);
        await updateMedicine(String(registeredMedicine.id), {
          expire_date: nextExpireDate.trim(),
        });
        invalidateMedicines();
      } catch (requestError) {
        if (isAuthSessionExpiredError(requestError)) {
          handleAuthSessionExpired();
          return;
        }

        Alert.alert(
          '유통기한 저장 실패',
          getApiErrorUserMessage(requestError, {
            fallbackMessage:
              '유통기한을 저장하지 못했습니다. 다시 시도해 주세요.',
          }),
        );
        return;
      } finally {
        setIsSavingExpiry(false);
      }
    }

    setRegisteredMedicine(null);
    setExpireDate('');
    Alert.alert('등록 완료', '약품 정보가 자동으로 등록되었습니다.', [
      { text: '확인', onPress: handleClose },
    ]);
  };

  const handleRegisterWithoutExpiry = async (): Promise<void> => {
    await handleConfirmRegistration(true);
  };

  const uploadCapturedPhoto = async (imageBase64: string): Promise<void> => {
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
      if (registerResult.id !== undefined) {
        setRegisteredMedicine({
          id: registerResult.id,
          name: registerResult.name,
        });
        setExpireDate('');
        setExpireDateError(null);
        return;
      }

      Alert.alert('등록 완료', '약품 정보가 자동으로 등록되었습니다.', [
        {
          text: '확인',
          onPress: handleClose,
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

  const handleOpenCamera = async (): Promise<void> => {
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

      let imageBase64 = typeof asset.base64 === 'string' ? asset.base64 : '';

      // 촬영 결과에 인코딩된 내용이 없을 때만 파일을 읽어 중복 변환을 피합니다.
      if (!imageBase64 && asset.uri) {
        imageBase64 = await fileUriToBase64(asset.uri);
      }

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

  return {
    isUploading,
    isSavingExpiry,
    registeredMedicineName: registeredMedicine?.name ?? null,
    expireDate,
    expireDateError,
    handleClose,
    handleOpenCamera,
    handleExpireDateChange,
    handleConfirmRegistration,
    handleRegisterWithoutExpiry,
  };
};
