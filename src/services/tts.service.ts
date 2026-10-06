import Tts from 'react-native-tts';

let initializationPromise: Promise<void> | null = null;

export const initializeTts = (): Promise<void> => {
  if (!initializationPromise) {
    initializationPromise = (async (): Promise<void> => {
      await Tts.getInitStatus();
      await Tts.setDefaultLanguage('ko-KR');
    })().catch((error: unknown) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
};

// signal이 중단되면(화면 이탈·단계 변경) 초기화가 끝난 뒤에도 재생하지 않습니다.
export const speakTts = async (
  message: string,
  signal?: AbortSignal,
): Promise<void> => {
  await initializeTts();
  if (signal?.aborted) {
    return;
  }
  // Android 엔진은 문장을 큐에 쌓으므로 이전 안내를 비운 뒤 현재 안내만 재생합니다.
  await Tts.stop();
  if (signal?.aborted) {
    return;
  }
  await Tts.speak(message.replace(/119/g, '일일구'));
};

export const stopTts = (): Promise<boolean> => Tts.stop();

export const requestTtsVoiceDataInstallation = async (): Promise<void> => {
  await Tts.requestInstallData();
};
