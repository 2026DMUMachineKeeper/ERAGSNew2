import React from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchCamera,
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
import { useEmergencyTriage } from '../erags-sm1/hooks/useEmergencyTriage';
import type {
  AccidentClassification,
  PatientContext,
} from '../erags-sm1/types';
import tailwindConfig from '../../tailwind.config';

const { colors } = tailwindConfig;

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const defaultPatientContext: PatientContext = {
  bleedingLevel: 'MEDIUM',
  consciousness: 'UNKNOWN',
  ageGroup: 'ADULT',
};

const defaultImageAccident: AccidentClassification = {
  type: 'BLEEDING',
  confidence: 0,
  rawInputType: 'IMAGE',
};

const cardShadow = StyleSheet.create({
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
});

const requestMicrophonePermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: '마이크 권한 필요',
      message: '음성으로 응급 상황을 설명하려면 마이크 권한이 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '취소',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export function HomeScreen({ navigation }: HomeScreenProps) {
  const triage = useEmergencyTriage();
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
    setVisionStatus('사진 입력을 ML로 전송하는 중입니다.');

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

      if (!asset.uri) {
        Alert.alert('촬영 실패', '사진 경로를 가져오지 못했습니다.');
        setVisionStatus('사진 경로를 가져오지 못했습니다.');
        return;
      }

      const result = await triage.sendImageTriage(
        // 사진 버튼
        asset.uri,
        defaultImageAccident,
        defaultPatientContext,
      );

      if (!result.ok) {
        setVisionStatus('이미지 입력을 ML로 전달하지 못했습니다.');
        Alert.alert(
          '이미지 전송 실패',
          '이미지 입력을 ML로 전달하지 못했습니다.',
        );
        return;
      }

      setVisionStatus('이미지 입력을 ML로 전달했습니다.');
      Alert.alert('전송 완료', '이미지 입력을 ML로 전달했습니다.');
    } catch (error) {
      console.error('[HomeScreen] 사진 전송 실패:', error);
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '사진을 서버로 전송하지 못했습니다. 네트워크와 서버 상태를 확인해 주세요.';

      setVisionStatus(message);
      Alert.alert('사진 전송 실패', message);
    } finally {
      setIsVisionUploading(false);
    }
  };
  const voiceRequestInFlightRef = React.useRef(false);
  const [voiceStatus, setVoiceStatus] = React.useState<string | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const isVoiceBusy = isListening || triage.isBusy;

  const handleVoicePress = React.useCallback(async () => {
    if (voiceRequestInFlightRef.current) {
      return;
    }

    voiceRequestInFlightRef.current = true;

    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setVoiceStatus('마이크 권한이 필요합니다.');
        voiceRequestInFlightRef.current = false;
        return;
      }

      setVoiceStatus('음성을 듣고 있습니다.');
      setIsListening(true);
      const result = await triage.startVoiceTriage(
        // 음성 버튼
        undefined,
        defaultPatientContext,
      );

      if (!result.ok) {
        if (result.reason === 'NO_CLASSIFICATION' && result.text) {
          setVoiceStatus(`인식됨 : ${result.text}`);
          return;
        }
        if (result.reason === 'EMPTY_TEXT') {
          setVoiceStatus('음성이 비어 있습니다. 조금 더 길게 말해 주세요.');
          return;
        }
        if (result.reason === 'STT_UNAVAILABLE') {
          setVoiceStatus('음성 인식 서비스가 꺼져 있거나 없습니다.');
          return;
        }
        if (result.reason === 'ML_REQUEST_FAILED') {
          setVoiceStatus('ML 입력 전달에 실패했습니다.');
          return;
        }
        setVoiceStatus('음성을 인식하지 못했습니다. 다시 시도해 주세요.');
        return;
      }

      setVoiceStatus('음성 입력을 ML로 전달했습니다.');
    } catch (error) {
      console.error('[HomeScreen] voice input failed:', error);
      setVoiceStatus('음성 입력 처리 중 오류가 발생했습니다.');
    } finally {
      setIsListening(false);
      voiceRequestInFlightRef.current = false;
    }
  }, [triage]);

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className=" mt-15 px-4 pt-6">
        <View className="flex-row items-center mt-3 relative overflow-visible">
          <View className="z-10 flex-1">
            <EragsLogo />
            <Text className="text-coment text-textDim mt-1 z-10">
              EMERGENCY RESPONSE AID GUIDANCE
            </Text>
            <View className=" mt-10 z-10" />
          </View>

          <View className="absolute right-[-18px] top-2 z-0 pointer-events-none">
            <MainIcon width={200} height={100} />
          </View>
        </View>
      </View>

      <View className="px-4 mt-6">
        <TouchableOpacity
          className="h-[120px] rounded-2xl bg-red overflow-hidden flex-row items-center px-4"
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
              사고 유형 선택 및 맞춤형 가이드를 시작합니다.
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-5">
        <View className="flex-row justify-between gap-x-3">
          <TouchableOpacity
            className="flex-1 h-[170px] bg-background border border-background rounded-2xl px-2 py-4"
            style={cardShadow.elevated}
            disabled={isVoiceBusy}
            onPress={handleVoicePress}
          >
            <View className="items-center mt-2">
              {isVoiceBusy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <MicIcon width={40} height={40} />
              )}
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-black text-center font-suitBold">
                음성으로 설명
              </Text>
            </View>
            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-textDim text-center"
              >
                {voiceStatus ?? '다친 부분을 음성으로 설명해 주세요.'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 h-[170px] bg-background border border-background rounded-2xl px-2 py-4"
            style={cardShadow.elevated}
            onPress={handlePhotoPress}
            disabled={isVisionUploading}
          >
            <View className="items-center mt-2">
              {isVisionUploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <CameraIcon width={40} height={40} />
              )}
            </View>
            <View className="mt-4 items-center">
              <Text className="text-body text-black text-center font-suitBold">
                사진 촬영
              </Text>
            </View>

            <View className="mt-2 items-center w-full px-4">
              <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                className="text-coment text-textDim text-center"
              >
                {visionStatus ??
                  (isVisionUploading
                    ? '사진 입력을 ML로 전송하고 있습니다.'
                    : '다친 부분을 촬영해주세요.')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="h-[86px] bg-background border border-background rounded-2xl justify-center mt-3 px-4"
          style={cardShadow.elevated}
          onPress={() => navigation.navigate('MedicineMemo')}
        >
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-row items-center flex-1">
              <MedicinesIcon width={40} height={40} />
              <View className="ml-3 flex-1">
                <Text className="text-title2 text-black font-suitBold">
                  약품 메모
                </Text>
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  className="mt-1 text-coment text-textDim"
                >
                  등록한 약품과 복용 메모를 한눈에 확인합니다
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
