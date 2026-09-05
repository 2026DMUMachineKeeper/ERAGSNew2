import React from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import Geolocation, {
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import {
  launchCamera,
  type Asset,
  type CameraOptions,
} from 'react-native-image-picker';

import {
  createAudioEmergencyGuide,
  createImageEmergencyGuide,
  getAddressFromCoordinates,
  hasLocationPermission,
  retryEmergencyGuide,
  startAudioRecording,
  stopAudioRecording,
} from '@/services';
import type { EmergencyGuideResponse } from '@/types';

const CAMERA_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  saveToPhotos: false,
  quality: 0.9,
  cameraType: 'back',
};

interface HomeEmergencyActionState {
  isListening: boolean;
  isVisionUploading: boolean;
  isVoiceProcessing: boolean;
  visionStatus: string | null;
  voiceStatus: string | null;
  handleEmergencyReportPress: () => Promise<void>;
  handlePhotoPress: () => Promise<void>;
  handleVoicePress: () => Promise<void>;
}

type GuideSource = 'image' | 'voice';
type HandleGuideCreated = (
  source: GuideSource,
  guide: EmergencyGuideResponse,
) => void;

const requestAndroidPermission = async (
  permission: typeof PermissionsAndroid.PERMISSIONS.CAMERA,
  title: string,
  message: string,
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title,
    message,
    buttonPositive: '허용',
    buttonNegative: '취소',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const getCurrentPosition = (): Promise<GeolocationResponse> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    });
  });

const ensureGuideHasSteps = async (
  guide: EmergencyGuideResponse,
): Promise<EmergencyGuideResponse> => {
  if (guide.treatment.steps.length > 0) {
    return guide;
  }

  return retryEmergencyGuide(guide.sessionId);
};

const getPhotoAsset = async (): Promise<Asset | null> => {
  const response = await launchCamera(CAMERA_OPTIONS);

  if (response.didCancel) {
    return null;
  }

  if (response.errorCode) {
    throw new Error(response.errorMessage ?? response.errorCode);
  }

  const photoAsset = response.assets?.[0];
  if (!photoAsset?.uri) {
    throw new Error('사진 경로를 가져오지 못했습니다.');
  }

  return photoAsset;
};

export const useHomeEmergencyActions = (
  onGuideCreated: HandleGuideCreated,
): HomeEmergencyActionState => {
  const voiceRequestInFlightRef = React.useRef(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isVisionUploading, setIsVisionUploading] = React.useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = React.useState(false);
  const [visionStatus, setVisionStatus] = React.useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = React.useState<string | null>(null);

  const handleEmergencyReportPress =
    React.useCallback(async (): Promise<void> => {
      try {
        if (!(await hasLocationPermission())) {
          Alert.alert(
            '위치 정보 없음',
            '위치 권한이 없어 현재 위치를 표시할 수 없습니다.',
          );
          return;
        }

        const { coords } = await getCurrentPosition();
        const address = await getAddressFromCoordinates(
          coords.latitude,
          coords.longitude,
        );
        const addressText = address ? `주소: ${address}\n` : '';

        Alert.alert(
          '긴급 신고 문자',
          `현재 위치\n${addressText}위도: ${coords.latitude}\n경도: ${coords.longitude}`,
        );
      } catch (error) {
        console.error('[HomeScreen] 현재 위치 조회 실패:', error);
        Alert.alert(
          '위치 조회 실패',
          '현재 위치를 가져오지 못했습니다. 위치 설정을 확인해 주세요.',
        );
      }
    }, []);

  const handlePhotoPress = React.useCallback(async (): Promise<void> => {
    if (isVisionUploading) {
      return;
    }

    const hasPermission = await requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      '카메라 권한 필요',
      '사진을 찍어 응급 상황을 분석하려면 카메라 권한이 필요합니다.',
    );
    if (!hasPermission) {
      Alert.alert(
        '권한 필요',
        '카메라 권한이 있어야 사진을 촬영할 수 있습니다.',
      );
      return;
    }

    setIsVisionUploading(true);
    setVisionStatus('사진을 준비하고 있습니다.');

    try {
      const photoAsset = await getPhotoAsset();
      if (!photoAsset?.uri) {
        setVisionStatus(null);
        return;
      }

      setVisionStatus('사진을 전송하고 있습니다.');
      const createdGuide = await createImageEmergencyGuide({
        uri: photoAsset.uri,
        name: photoAsset.fileName ?? `emergency-${Date.now()}.jpg`,
        type: photoAsset.type ?? 'image/jpeg',
      });
      const guide = await ensureGuideHasSteps(createdGuide);

      onGuideCreated('image', guide);
    } catch (error) {
      console.error('[HomeScreen] 사진 전송 실패:', error);
      const errorMessage =
        error instanceof Error && error.message.trim()
          ? error.message
          : '사진을 서버로 전송하지 못했습니다. 네트워크와 서버 상태를 확인해 주세요.';

      setVisionStatus(errorMessage);
      Alert.alert('사진 전송 실패', errorMessage);
    } finally {
      setIsVisionUploading(false);
    }
  }, [isVisionUploading, onGuideCreated]);

  const handleVoicePress = React.useCallback(async (): Promise<void> => {
    if (voiceRequestInFlightRef.current) {
      return;
    }

    voiceRequestInFlightRef.current = true;

    try {
      if (isListening) {
        setIsListening(false);
        setIsVoiceProcessing(true);
        setVoiceStatus('녹음을 마치고 음성 파일을 전송 중입니다.');

        const audioFile = await stopAudioRecording();
        const createdGuide = await createAudioEmergencyGuide(audioFile);
        const guide = await ensureGuideHasSteps(createdGuide);

        onGuideCreated('voice', guide);
        return;
      }

      const hasPermission = await requestAndroidPermission(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        '마이크 권한 필요',
        '음성으로 응급 상황을 설명하려면 마이크 권한이 필요합니다.',
      );
      if (!hasPermission) {
        setVoiceStatus('마이크 권한이 필요합니다.');
        return;
      }

      await startAudioRecording();
      setIsListening(true);
      setVoiceStatus('녹음 중입니다. 한 번 더 누르면 전송합니다.');
    } catch (error) {
      console.error('[HomeScreen] 음성 파일 처리 실패:', error);
      setIsListening(false);
      setVoiceStatus('음성 파일을 전송하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setIsVoiceProcessing(false);
      voiceRequestInFlightRef.current = false;
    }
  }, [isListening, onGuideCreated]);

  return {
    isListening,
    isVisionUploading,
    isVoiceProcessing,
    visionStatus,
    voiceStatus,
    handleEmergencyReportPress,
    handlePhotoPress,
    handleVoicePress,
  };
};
