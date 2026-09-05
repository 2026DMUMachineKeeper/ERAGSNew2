import Sound, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
  type AudioSet,
} from 'react-native-nitro-sound';

import type { EmergencyGuideMediaFile } from '@/types';

const VOICE_AUDIO_SETTINGS: AudioSet = {
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AVFormatIDKeyIOS: 'aac',
  AudioQuality: 'medium',
  AudioChannels: 1,
  AudioSamplingRate: 16000,
  AudioEncodingBitRate: 64000,
};

export const startAudioRecording = async (): Promise<void> => {
  await Sound.startRecorder(undefined, VOICE_AUDIO_SETTINGS);
};

export const stopAudioRecording =
  async (): Promise<EmergencyGuideMediaFile> => {
    const uri = await Sound.stopRecorder();
    if (!uri.startsWith('file://')) {
      throw new Error('녹음된 음성 파일 경로가 올바르지 않습니다.');
    }

    return {
      uri,
      name: uri.split('/').pop() ?? 'voice.m4a',
      type: 'audio/mp4',
    };
  };
