import Tts from 'react-native-tts';

import { initializeTts, speakTts } from './tts.service';

jest.mock('react-native-tts', () => ({
  __esModule: true,
  default: {
    getInitStatus: jest.fn(async (): Promise<void> => undefined),
    setDefaultLanguage: jest.fn(async (): Promise<void> => undefined),
    speak: jest.fn(),
    stop: jest.fn(async (): Promise<void> => undefined),
  },
}));

describe('tts.service', () => {
  it('엔진을 한 번만 초기화하고 이후 문장을 바로 재생한다', async (): Promise<void> => {
    await initializeTts();
    await speakTts('응급처치 안내');

    expect(Tts.getInitStatus).toHaveBeenCalledTimes(1);
    expect(Tts.setDefaultLanguage).toHaveBeenCalledTimes(1);
    expect(Tts.speak).toHaveBeenCalledWith('응급처치 안내');
  });

  it('119는 숫자 대신 일일구로 읽도록 변환한다', async (): Promise<void> => {
    await speakTts('119에 신고해 주세요.');

    expect(Tts.speak).toHaveBeenLastCalledWith('일일구에 신고해 주세요.');
  });
});
