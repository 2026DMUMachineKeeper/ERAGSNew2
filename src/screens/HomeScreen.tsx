import React from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchCamera,
  type Asset,
  type CameraOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import {
  CameraIcon,
  MedicinesIcon,
  MicIcon,
  MainIcon,
  MainIcon2,
  EragsLogo,
} from '../assets/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { postMedicineVision } from '../services';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [isVisionUploading, setIsVisionUploading] = React.useState(false);
  const [visionStatus, setVisionStatus] = React.useState<string | null>(null);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: '카메라 권한 필요',
        message:
          '사진을 찍어 약품 비전 분석을 하려면 카메라 권한이 필요합니다.',
        buttonPositive: '허용',
        buttonNegative: '취소',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const uploadMedicineVision = async (asset: Asset) => {
    const base64Image = asset.base64;

    if (!base64Image) {
      Alert.alert(
        '업로드 실패',
        '촬영한 사진에서 base64 데이터를 가져오지 못했습니다.',
      );
      return;
    }

    const result = await postMedicineVision({
      imageBase64: base64Image,
    });

    // eslint-disable-next-line no-console
    console.log('[HomeScreen] /api/medicines/vision result:', result);
    Alert.alert('전송 완료', '사진을 서버로 전송했습니다.');
    setVisionStatus('사진을 서버로 전송했습니다.');
  };

  const handlePhotoPress = async () => {
    if (isVisionUploading) {
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        '권한 필요',
        '카메라 권한이 있어야 사진을 촬영할 수 있습니다.',
      );
      return;
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      saveToPhotos: false,
      quality: 0.9,
      cameraType: 'back',
    };

    setIsVisionUploading(true);
    setVisionStatus('사진을 서버로 전송하는 중입니다.');

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
      if (!asset) {
        Alert.alert('촬영 실패', '카메라 결과를 가져오지 못했습니다.');
        setVisionStatus('카메라 결과를 가져오지 못했습니다.');
        return;
      }

      await uploadMedicineVision(asset);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[HomeScreen] 사진 전송 실패:', error);
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '사진을 서버로 전송하지 못했습니다. 네트워크와 서버 상태를 확인해 주세요.';

      setVisionStatus(message);
      Alert.alert('전송 실패', message);
    } finally {
      setIsVisionUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className=" mt-15 px-4 pt-6">
        <View className="flex-row items-center mt-3 relative overflow-visible">
          <View className="z-10 flex-1">
            <EragsLogo />
            <Text className="text-coment text-[#7F8389] mt-1 z-10">
              EMERGENCY RESPONSE AID GUIDANCE
            </Text>
            <View className=" mt-10 z-10"></View>
          </View>

          <View className="absolute right-[-18px] top-2 z-0 pointer-events-none">
            <MainIcon width={200} height={100} />
          </View>
        </View>
      </View>

      <View className="px-4 mt-6">
        <TouchableOpacity
          className="h-[120px] rounded-2xl bg-[#AF2E26] overflow-hidden flex-row items-center px-4"
          onPress={() => navigation.navigate('FirstAid')}
        >
          <View className="w-24 items-start justify-center">
            <MainIcon2 width={72} height={72} />
          </View>

          <View className="flex-1 pl-2">
            <Text className="text-title text-white font-suitBold">
              응급 처치 시작
            </Text>
            <Text className="text-coment text-white mt-2">
              사고 유형 선택 후 맞춤형 가이드를 시작합니다.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-5">
        <View className="flex-row justify-between gap-x-3">
          <TouchableOpacity
            className="flex-1 h-[170px] bg-[#22262E] border border-[#363C46] rounded-2xl px-2 py-4 overflow-hidden"
            onPress={() => console.log('voice')}
          >
            <View className="items-center mt-2">
              <MicIcon width={40} height={40} />
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-white text-center font-suitBold">
                음성으로 설명
              </Text>
            </View>
            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-gray text-center"
              >
                다친 부분을 음성으로 설명해주세요.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 h-[170px] bg-[#22262E] border border-[#363C46] rounded-2xl px-2 py-4 overflow-hidden"
            onPress={handlePhotoPress}
            disabled={isVisionUploading}
          >
            <View className="items-center mt-2">
              {isVisionUploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <CameraIcon width={40} height={40} />
              )}
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-white text-center font-suitBold">
                사진 촬영
              </Text>
            </View>

            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-gray text-center"
              >
                {visionStatus ??
                  (isVisionUploading
                    ? '사진을 분석 서버로 전송하고 있습니다.'
                    : '다친 부분을 촬영해주세요.')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="h-[110px] bg-[#22262E] border border-[#363C46] rounded-2xl justify-center mt-4 px-4"
          onPress={() => navigation.navigate('MedicinesStock')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center flex-1">
              <MedicinesIcon width={40} height={40} />
              <View className="ml-3 flex-1">
                <Text className="text-title2 text-white font-sultBold">
                  약품 재고 확인
                </Text>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  className="mt-1 text-coment text-gray"
                >
                  보유중인 약품목록과 재고 현황을 확인합니다.
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
