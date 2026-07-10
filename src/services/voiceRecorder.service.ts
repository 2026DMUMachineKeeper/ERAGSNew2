import { NativeModules, Platform } from 'react-native';

interface VoiceRecorderNativeModule {
  start: () => Promise<string>;
  stop: () => Promise<string>;
  cancel: () => Promise<void>;
}

const getVoiceRecorder = (): VoiceRecorderNativeModule => {
  if (Platform.OS !== 'android') {
    throw new Error('음성 녹음은 현재 Android에서만 지원합니다.');
  }

  const voiceRecorder = NativeModules.VoiceRecorder as
    | VoiceRecorderNativeModule
    | undefined;

  if (!voiceRecorder) {
    throw new Error('음성 녹음 모듈을 찾을 수 없습니다. 앱을 다시 빌드해 주세요.');
  }

  return voiceRecorder;
};

export const startVoiceRecording = async (): Promise<string> =>
  getVoiceRecorder().start();

export const stopVoiceRecording = async (): Promise<string> =>
  getVoiceRecorder().stop();

export const cancelVoiceRecording = async (): Promise<void> =>
  getVoiceRecorder().cancel();
