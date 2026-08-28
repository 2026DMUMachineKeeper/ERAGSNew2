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

export const speakTts = async (message: string): Promise<void> => {
  await initializeTts();
  Tts.speak(message);
};

export const stopTts = (): Promise<boolean> => Tts.stop();
