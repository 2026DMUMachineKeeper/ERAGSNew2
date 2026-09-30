import React from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import Geolocation, {
  type GeolocationError,
  type GeolocationOptions,
  type GeolocationResponse,
} from '@react-native-community/geolocation';
import { useIsFocused } from '@react-navigation/native';
import { launchCamera, type CameraOptions } from 'react-native-image-picker';

import {
  createAudioEmergencyGuide,
  createPhotoEmergencyGuide,
  getAddressFromCoordinates,
  getEmergencyGuideErrorMessage,
  hasLocationPermission,
  startAudioRecording,
  stopAudioRecording,
} from '@/services';
import type { EmergencyGuideMediaFile, EmergencyGuideResponse } from '@/types';
import { showLocationPermissionPrompt } from '@/utils';

const CAMERA_OPTIONS: CameraOptions = {
  mediaType: 'photo',
  saveToPhotos: false,
  quality: 0.9,
  cameraType: 'back',
};

interface HomeEmergencyActionState {
  isListening: boolean;
  isPhotoVoiceRecording: boolean;
  isPhotoVoiceStarting: boolean;
  isVisionUploading: boolean;
  isVoiceProcessing: boolean;
  photoAdditionalText: string;
  photoCount: number;
  photoInputStep: PhotoInputStep;
  photoUris: readonly string[];
  visionStatus: string | null;
  voiceStatus: string | null;
  handleAddPhotoPress: () => Promise<void>;
  handleEmergencyReportPress: () => Promise<void>;
  handlePhotoInputBack: () => Promise<void>;
  handlePhotoFlowCancel: () => Promise<void>;
  handlePhotoPress: () => Promise<void>;
  handleRemovePhoto: (index: number) => void;
  handlePhotoTextChange: (text: string) => void;
  handlePhotoTextSubmit: () => Promise<void>;
  handlePhotoVoiceSubmit: () => Promise<void>;
  handleStartPhotoVoice: () => Promise<void>;
  handleSelectPhotoText: () => void;
  handleSelectPhotoVoice: () => void;
  handleSendPhotosOnly: () => Promise<void>;
  handleVoicePress: () => Promise<void>;
}

type GuideSource = 'image' | 'voice';
export type PhotoInputStep = 'options' | 'text' | 'voice' | null;
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

const requestCurrentPosition = (
  options: GeolocationOptions,
): Promise<GeolocationResponse> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });

const isLocationPermissionDeniedError = (
  error: unknown,
): error is GeolocationError =>
  error !== null &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 1;

const getCurrentPosition = async (): Promise<GeolocationResponse> => {
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

const getPhotoAsset = async (): Promise<EmergencyGuideMediaFile | null> => {
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

  return {
    uri: photoAsset.uri,
    name: photoAsset.fileName ?? `emergency-${Date.now()}.jpg`,
    type: photoAsset.type ?? 'image/jpeg',
  };
};

export const useHomeEmergencyActions = (
  onGuideCreated: HandleGuideCreated,
): HomeEmergencyActionState => {
  const isFocused = useIsFocused();
  const activeRequestControllersRef = React.useRef(new Set<AbortController>());
  const isFocusedRef = React.useRef(isFocused);
  const isListeningRef = React.useRef(false);
  const isPhotoVoiceRecordingRef = React.useRef(false);
  const isPhotoVoiceStartingRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const voiceRequestInFlightRef = React.useRef(false);
  const [isListening, setIsListening] = React.useState(false);
  const [isPhotoVoiceRecording, setIsPhotoVoiceRecording] =
    React.useState(false);
  const [isPhotoVoiceStarting, setIsPhotoVoiceStarting] =
    React.useState(false);
  const [isVisionUploading, setIsVisionUploading] = React.useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = React.useState(false);
  const [visionStatus, setVisionStatus] = React.useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = React.useState<string | null>(null);
  const [photoAssets, setPhotoAssets] = React.useState<
    EmergencyGuideMediaFile[]
  >([]);
  const [photoAdditionalText, setPhotoAdditionalText] = React.useState('');
  const [photoInputStep, setPhotoInputStep] =
    React.useState<PhotoInputStep>(null);

  const cancelActiveWork = React.useCallback((): void => {
    activeRequestControllersRef.current.forEach(controller =>
      controller.abort(),
    );
    activeRequestControllersRef.current.clear();

    if (!isListeningRef.current && !isPhotoVoiceRecordingRef.current) {
      return;
    }

    isListeningRef.current = false;
    isPhotoVoiceRecordingRef.current = false;
    stopAudioRecording().catch((error: unknown): void => {
      console.warn('[HomeScreen] 화면 이탈 시 녹음 정지 실패:', error);
    });
  }, []);

  React.useEffect((): void => {
    isFocusedRef.current = isFocused;

    if (isFocused) {
      return;
    }

    cancelActiveWork();
    setIsListening(false);
    setIsPhotoVoiceRecording(false);
    isPhotoVoiceStartingRef.current = false;
    setIsPhotoVoiceStarting(false);
    setIsVisionUploading(false);
    setIsVoiceProcessing(false);
    setVisionStatus(null);
    setVoiceStatus(null);
    setPhotoAssets([]);
    setPhotoAdditionalText('');
    setPhotoInputStep(null);
  }, [cancelActiveWork, isFocused]);

  React.useEffect(
    (): (() => void) => (): void => {
      isMountedRef.current = false;
      cancelActiveWork();
    },
    [cancelActiveWork],
  );

  const handleEmergencyReportPress =
    React.useCallback(async (): Promise<void> => {
      try {
        if (!(await hasLocationPermission())) {
          showLocationPermissionPrompt();
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

  const requestCameraPermission =
    React.useCallback(async (): Promise<boolean> => {
      let hasPermission: boolean;

      try {
        hasPermission = await requestAndroidPermission(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          '카메라 권한 필요',
          '사진을 찍어 응급 상황을 분석하려면 카메라 권한이 필요합니다.',
        );
      } catch (error: unknown) {
        console.error('[HomeScreen] 카메라 권한 확인 실패:', error);
        Alert.alert(
          '권한 확인 실패',
          '카메라 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        );
        return false;
      }
      if (!isMountedRef.current || !isFocusedRef.current) {
        return false;
      }
      if (!hasPermission) {
        Alert.alert(
          '권한 필요',
          '카메라 권한이 있어야 사진을 촬영할 수 있습니다.',
        );
        return false;
      }

      return true;
    }, []);

  const capturePhoto = React.useCallback(async (): Promise<void> => {
    try {
      const photoAsset = await getPhotoAsset();
      if (!photoAsset || !isMountedRef.current || !isFocusedRef.current) {
        return;
      }

      setPhotoAssets(currentAssets => {
        if (currentAssets.length >= 5) {
          return currentAssets;
        }

        const nextAssets = [...currentAssets, photoAsset];
        setVisionStatus(`사진 ${nextAssets.length}장 선택됨`);
        return nextAssets;
      });
      setPhotoInputStep('options');
    } catch (error: unknown) {
      console.error('[HomeScreen] 사진 촬영 실패:', error);
      Alert.alert(
        '촬영 실패',
        '사진을 촬영하지 못했습니다. 다시 시도해 주세요.',
      );
    }
  }, []);

  const sendPhotoRequest = React.useCallback(
    async (addition?: {
      text?: string;
      audio?: EmergencyGuideMediaFile;
    }): Promise<void> => {
      if (photoAssets.length === 0 || isVisionUploading) {
        return;
      }

      setIsVisionUploading(true);
      setVisionStatus(`사진 ${photoAssets.length}장을 전송하고 있습니다.`);
      let requestController: AbortController | null = null;

      try {
        requestController = new AbortController();
        activeRequestControllersRef.current.add(requestController);
        const createdGuide = await createPhotoEmergencyGuide(
          {
            images: photoAssets,
            ...(addition?.text ? { text: addition.text } : {}),
            ...(addition?.audio ? { audio: addition.audio } : {}),
          },
          requestController.signal,
        );
        if (isMountedRef.current && isFocusedRef.current) {
          setPhotoInputStep(null);
          setPhotoAssets([]);
          setPhotoAdditionalText('');
          onGuideCreated('image', createdGuide);
        }
      } catch (error) {
        if (requestController?.signal.aborted || !isFocusedRef.current) {
          return;
        }

        const errorMessage = getEmergencyGuideErrorMessage(error);

        setVisionStatus(errorMessage);
        Alert.alert('사진 전송 실패', errorMessage);
        setPhotoInputStep('options');
      } finally {
        if (requestController) {
          activeRequestControllersRef.current.delete(requestController);
        }
        if (isMountedRef.current) {
          setIsVisionUploading(false);
        }
      }
    },
    [isVisionUploading, onGuideCreated, photoAssets],
  );

  const handlePhotoPress = React.useCallback(async (): Promise<void> => {
    if (isVisionUploading || photoInputStep !== null) {
      return;
    }

    if (!(await requestCameraPermission())) {
      return;
    }

    setPhotoAssets([]);
    setPhotoAdditionalText('');
    setVisionStatus('사진을 준비하고 있습니다.');
    await capturePhoto();
  }, [
    capturePhoto,
    isVisionUploading,
    photoInputStep,
    requestCameraPermission,
  ]);

  const handleAddPhotoPress = React.useCallback(async (): Promise<void> => {
    if (photoAssets.length >= 5) {
      return;
    }

    await capturePhoto();
  }, [capturePhoto, photoAssets.length]);

  const handleRemovePhoto = React.useCallback(
    (index: number): void => {
      if (index < 0 || index >= photoAssets.length || isVisionUploading) {
        return;
      }

      const nextPhotoAssets = photoAssets.filter(
        (_photoAsset, photoIndex) => photoIndex !== index,
      );
      setPhotoAssets(nextPhotoAssets);

      if (nextPhotoAssets.length === 0) {
        setPhotoAdditionalText('');
        setPhotoInputStep(null);
        setVisionStatus(null);
        return;
      }

      setVisionStatus(`사진 ${nextPhotoAssets.length}장 선택됨`);
    },
    [isVisionUploading, photoAssets],
  );

  const handlePhotoFlowCancel = React.useCallback(async (): Promise<void> => {
    if (isPhotoVoiceRecordingRef.current) {
      isPhotoVoiceRecordingRef.current = false;
      setIsPhotoVoiceRecording(false);
      try {
        await stopAudioRecording();
      } catch (error: unknown) {
        console.warn('[HomeScreen] 사진 추가 음성 녹음 취소 실패:', error);
      }
    }

    setPhotoAssets([]);
    setPhotoAdditionalText('');
    setPhotoInputStep(null);
    setVisionStatus(null);
  }, []);

  const handlePhotoInputBack = React.useCallback(async (): Promise<void> => {
    if (isPhotoVoiceRecordingRef.current) {
      isPhotoVoiceRecordingRef.current = false;
      setIsPhotoVoiceRecording(false);
      try {
        await stopAudioRecording();
      } catch (error: unknown) {
        console.warn('[HomeScreen] 사진 추가 음성 녹음 종료 실패:', error);
      }
    }

    setPhotoInputStep('options');
  }, []);

  const handleSelectPhotoVoice = React.useCallback((): void => {
    setPhotoInputStep('voice');
  }, []);

  const handleStartPhotoVoice = React.useCallback(async (): Promise<void> => {
    if (
      isPhotoVoiceStartingRef.current ||
      isPhotoVoiceRecordingRef.current
    ) {
      return;
    }

    isPhotoVoiceStartingRef.current = true;
    setIsPhotoVoiceStarting(true);

    try {
      const hasPermission = await requestAndroidPermission(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        '마이크 권한 필요',
        '사진에 음성 설명을 추가하려면 마이크 권한이 필요합니다.',
      );
      if (!hasPermission || !isMountedRef.current || !isFocusedRef.current) {
        if (hasPermission || !isMountedRef.current || !isFocusedRef.current) {
          return;
        }

        Alert.alert(
          '마이크 권한 필요',
          '음성 설명을 녹음하려면 마이크 권한을 허용해 주세요.',
        );
        return;
      }

      await startAudioRecording();
      if (!isMountedRef.current || !isFocusedRef.current) {
        await stopAudioRecording();
        return;
      }

      isPhotoVoiceRecordingRef.current = true;
      setIsPhotoVoiceRecording(true);
    } catch (error: unknown) {
      Alert.alert('녹음 시작 실패', getEmergencyGuideErrorMessage(error));
    } finally {
      isPhotoVoiceStartingRef.current = false;
      if (isMountedRef.current) {
        setIsPhotoVoiceStarting(false);
      }
    }
  }, []);

  const handlePhotoVoiceSubmit = React.useCallback(async (): Promise<void> => {
    if (!isPhotoVoiceRecordingRef.current) {
      return;
    }

    try {
      isPhotoVoiceRecordingRef.current = false;
      setIsPhotoVoiceRecording(false);
      const audioFile = await stopAudioRecording();
      await sendPhotoRequest({ audio: audioFile });
    } catch (error: unknown) {
      const errorMessage = getEmergencyGuideErrorMessage(error);
      setPhotoInputStep('options');
      setVisionStatus(errorMessage);
      Alert.alert('음성 추가 실패', errorMessage);
    }
  }, [sendPhotoRequest]);

  const handleVoicePress = React.useCallback(async (): Promise<void> => {
    if (voiceRequestInFlightRef.current) {
      return;
    }

    voiceRequestInFlightRef.current = true;
    let requestController: AbortController | null = null;

    try {
      if (isListeningRef.current) {
        isListeningRef.current = false;
        setIsListening(false);
        setIsVoiceProcessing(true);
        setVoiceStatus('녹음을 마치고 음성 파일을 전송 중입니다.');

        requestController = new AbortController();
        activeRequestControllersRef.current.add(requestController);
        const audioFile = await stopAudioRecording();
        const createdGuide = await createAudioEmergencyGuide(
          audioFile,
          requestController.signal,
        );
        if (isMountedRef.current && isFocusedRef.current) {
          onGuideCreated('voice', createdGuide);
        }
        return;
      }

      const hasPermission = await requestAndroidPermission(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        '마이크 권한 필요',
        '음성으로 응급 상황을 설명하려면 마이크 권한이 필요합니다.',
      );
      if (!isMountedRef.current || !isFocusedRef.current) {
        return;
      }
      if (!hasPermission) {
        setVoiceStatus('마이크 권한이 필요합니다.');
        return;
      }
      await startAudioRecording();
      if (!isMountedRef.current || !isFocusedRef.current) {
        await stopAudioRecording();
        return;
      }

      isListeningRef.current = true;
      setIsListening(true);
      setVoiceStatus('녹음 중입니다. 한 번 더 누르면 전송합니다.');
    } catch (error) {
      if (!isMountedRef.current || !isFocusedRef.current) {
        return;
      }

      isListeningRef.current = false;
      setIsListening(false);
      setVoiceStatus(getEmergencyGuideErrorMessage(error));
    } finally {
      if (requestController) {
        activeRequestControllersRef.current.delete(requestController);
      }
      if (isMountedRef.current) {
        setIsVoiceProcessing(false);
      }
      voiceRequestInFlightRef.current = false;
    }
  }, [onGuideCreated]);

  return {
    isListening,
    isPhotoVoiceRecording,
    isPhotoVoiceStarting,
    isVisionUploading,
    isVoiceProcessing,
    photoAdditionalText,
    photoCount: photoAssets.length,
    photoInputStep,
    photoUris: photoAssets.map(photoAsset => photoAsset.uri),
    visionStatus,
    voiceStatus,
    handleAddPhotoPress,
    handleEmergencyReportPress,
    handlePhotoInputBack,
    handlePhotoFlowCancel,
    handlePhotoPress,
    handleRemovePhoto,
    handlePhotoTextChange: setPhotoAdditionalText,
    handlePhotoTextSubmit: () =>
      sendPhotoRequest({ text: photoAdditionalText }),
    handlePhotoVoiceSubmit,
    handleStartPhotoVoice,
    handleSelectPhotoText: () => setPhotoInputStep('text'),
    handleSelectPhotoVoice,
    handleSendPhotosOnly: () => sendPhotoRequest(),
    handleVoicePress,
  };
};
