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
import { postMedicineVision } from '../services/medicineApi';
import tailwindConfig from '../../tailwind.config';
import { CameraRedIcon } from '../assets';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineAdd'>;

const { colors } = tailwindConfig;

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

  const closeToMedicineMemo = React.useCallback(() => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'MedicineMemo' }],
    });
  }, [navigation]);

  const uploadCapturedPhoto = async (imageBase64: string) => {
    setIsUploading(true);

    try {
      const registerResult = await postMedicineVision({
        imageBase64,
        quantityToAdd: 1,
      });

      if (registerResult.isRegistered !== true) {
        const message =
          typeof registerResult.message === 'string' &&
          registerResult.message.trim().length > 0
            ? registerResult.message
            : '약품 이름을 직접 입력해 주세요.';

        Alert.alert('추가 입력 필요', message, [
          {
            text: '직접 입력',
            onPress: () =>
              navigation.dispatch(StackActions.replace('MedicineManualInput')),
          },
        ]);
        return;
      }

      Alert.alert('등록 완료', '약품 정보가 자동으로 등록되었습니다.', [
        {
          text: '확인',
          onPress: () =>
            navigation.reset({
              index: 1,
              routes: [{ name: 'Home' }, { name: 'MedicineMemo' }],
            }),
        },
      ]);
    } catch (error) {
      console.error('[MedicineAddScreen] uploadCapturedPhoto failed', error);
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '약품을 등록하지 못했습니다.';

      Alert.alert('등록 실패', message);
    } finally {
      setIsUploading(false);
    }
  };

  const openCamera = async () => {
    if (isUploading) {
      return;
    }

    const hasPermission = await requestCameraPermission();

    if (!hasPermission) {
      Alert.alert('권한 필요', '카메라 권한을 허용해야 촬영할 수 있습니다.', [
        { text: '취소', style: 'cancel' },
        { text: '설정 열기', onPress: () => Linking.openSettings() },
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
        Alert.alert('촬영 실패', response.errorMessage ?? response.errorCode);
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.base64) {
        Alert.alert('촬영 실패', '촬영한 사진 데이터를 가져오지 못했습니다.');
        return;
      }

      await uploadCapturedPhoto(asset.base64);
    } catch (error) {
      console.error('[MedicineAddScreen] launchCamera failed', error);
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '사진 촬영에 실패했습니다.';

      Alert.alert('촬영 실패', message);
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
          activeOpacity={0.9}
          className="relative mt-8 items-center justify-center overflow-hidden rounded-xl border border-dashed border-memoRed bg-camera_bg px-5 py-[80px]"
          disabled={isUploading}
          onPress={openCamera}
        >
          <View className="mb-5 items-center justify-center">
            <CameraRedIcon width={48} height={48} />
          </View>

          <Text className="text-base font-extrabold text-memoText">
            약품 사진을 먼저 촬영해 주세요
          </Text>

          <Text className="mt-5 text-center text-sm text-memoSubText">
            후면 카메라로 약품의 제품명이 잘 보이도록 촬영합니다
          </Text>

          {isUploading ? (
            <View className="absolute inset-0 z-10 items-center justify-center bg-camera_bg/80">
              <ActivityIndicator size="large" color={colors.memoRed} />
            </View>
          ) : null}
        </TouchableOpacity>

        <View className="mt-5 flex-row items-center">
          <View className="h-[1px] flex-1 bg-memoLine" />
          <Text className="mx-4 text-sm font-bold text-memoSubText">또는</Text>
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
            <Text className="text-base font-extrabold text-memoText">
              직접 수동 입력하기
            </Text>

            <Text className="mt-1 text-xs leading-5 text-memoSubText">
              사진 말고 직접 입력할 수도 있어요
            </Text>
          </View>

          <Text className="text-2xl text-memoBlue">{'>'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
