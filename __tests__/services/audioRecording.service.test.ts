import Sound from 'react-native-nitro-sound';

import {
  startAudioRecording,
  stopAudioRecording,
} from '@/services/audioRecording.service';

describe('audioRecording.service', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  it('녹음을 시작하고 업로드 가능한 파일 정보로 종료한다', async (): Promise<void> => {
    const startRecorderMock = jest.mocked(Sound.startRecorder);
    const stopRecorderMock = jest.mocked(Sound.stopRecorder);
    stopRecorderMock.mockResolvedValue('file:///recordings/voice.m4a');

    await startAudioRecording();
    const audioFile = await stopAudioRecording();

    expect(startRecorderMock).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        AudioChannels: 1,
        AudioSamplingRate: 16000,
      }),
    );
    expect(audioFile).toEqual({
      uri: 'file:///recordings/voice.m4a',
      name: 'voice.m4a',
      type: 'audio/mp4',
    });
  });
});
