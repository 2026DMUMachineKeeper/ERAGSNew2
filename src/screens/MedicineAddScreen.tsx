import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchCamera,
  type Asset,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { postMedicineVision } from '../services/medicineApi';
import tailwindConfig from '../../tailwind.config';
import { CameraRedIcon } from '../assets';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineAdd'>;

const { colors } = tailwindConfig;

const getAssetBase64 = (asset?: Asset) => {
  if (!asset?.base64) {
    throw new Error('촬영한 사진에서 데이터를 가져오지 못했습니다.');
  }

  return asset.base64;
};

export function MedicineAddScreen({ navigation }: Props) {
  const [isUploading, setIsUploading] = React.useState(false);

  const registerWithCamera = async () => {
    if (isUploading) {
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      saveToPhotos: false,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      cameraType: 'back',
    };

    try {
      const response: ImagePickerResponse = await launchCamera(options);

      if (response.didCancel) {
        return;
      }

      if (response.errorCode === 'permission') {
        Alert.alert('권한 필요', '카메라 권한을 허용해야 촬영할 수 있습니다.', [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      if (response.errorCode) {
        Alert.alert('촬영 실패', response.errorMessage ?? response.errorCode);
        return;
      }

      const imageBase64 = getAssetBase64(response.assets?.[0]);

      setIsUploading(true);

      await postMedicineVision({
        imageBase64,
        quantityToAdd: 1,
      });

      Alert.alert('등록 완료', '약품 정보가 자동으로 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '약품을 등록하지 못했습니다.';

      Alert.alert('등록 실패', message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-memoCard" edges={['top', 'bottom']}>
      <View className="flex-1 px-5 pt-3">
        <View className="h-10 flex-row items-center justify-between">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-2xl text-memoText">×</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          className="mt-8 py-[80px] items-center justify-center rounded-xl border border-dashed border-memoRed bg-camera_bg px-5 relative overflow-hidden"
          onPress={registerWithCamera}
          disabled={isUploading}
        >
          <View className="mb-5 items-center justify-center">
            <CameraRedIcon width={48} height={48} />
          </View>

          <Text className="text-base font-extrabold text-memoText">
            약품 사진을 먼저 촬영해주세요
          </Text>

          <Text className="mt-5 text-center text-sm text-memoSubText">
            약품의 모든 제품 사진이 잘 보이도록 촬영합니다.
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
          onPress={() => navigation.navigate('MedicineManualInput')}
        >
          <Text className="mr-3 text-2xl text-memoBlue">✎</Text>

          <View className="flex-1">
            <Text className="text-base font-extrabold text-memoText">
              임시로 수동 입력하기
            </Text>

            <Text className="mt-1 text-xs leading-5 text-memoSubText">
              사진이 안될 때만 임시로 정보를 입력할 수 있어요.
              {'\n'}(추후 사진 등록 시 자동 업데이트)
            </Text>
          </View>

          <Text className="text-2xl text-memoBlue">›</Text>
        </TouchableOpacity>

        <View className="mt-auto mb-8 rounded-xl bg-memoBg px-4 py-4">
          <Text className="text-sm leading-6 text-memoSubText">
            ⓘ 사진 등록 후 약품 정보가 자동으로 입력됩니다.
            {'\n'}정보가 다를 경우 수정할 수 있어요.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
