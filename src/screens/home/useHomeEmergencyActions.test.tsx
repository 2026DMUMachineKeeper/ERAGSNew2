import React from 'react';

import { useIsFocused } from '@react-navigation/native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  createAudioEmergencyGuide,
  startAudioRecording,
  stopAudioRecording,
} from '@/services';
import type { EmergencyGuideResponse } from '@/types';

import { useHomeEmergencyActions } from './useHomeEmergencyActions';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: { getCurrentPosition: jest.fn() },
}));

jest.mock('@/services', () => ({
  createAudioEmergencyGuide: jest.fn(),
  createImageEmergencyGuide: jest.fn(),
  getAddressFromCoordinates: jest.fn(),
  hasLocationPermission: jest.fn(),
  retryEmergencyGuide: jest.fn(),
  startAudioRecording: jest.fn(),
  stopAudioRecording: jest.fn(),
}));

const AUDIO_FILE = {
  uri: 'file:///voice.m4a',
  name: 'voice.m4a',
  type: 'audio/mp4',
};
const GUIDE = {
  treatment: { steps: [{}] },
} as EmergencyGuideResponse;

type EmergencyActions = ReturnType<typeof useHomeEmergencyActions>;
let currentActions!: EmergencyActions;

interface HookHarnessProps {
  onGuideCreated: jest.Mock;
}

const HookHarness = ({ onGuideCreated }: HookHarnessProps): null => {
  currentActions = useHomeEmergencyActions(onGuideCreated);
  return null;
};

describe('홈 응급 작업 정리', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.mocked(startAudioRecording).mockResolvedValue();
    jest.mocked(stopAudioRecording).mockResolvedValue(AUDIO_FILE);
  });

  it('녹음 중 탭을 떠나면 녹음을 정지한다', async (): Promise<void> => {
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handleVoicePress();
    });
    expect(currentActions.isListening).toBe(true);

    jest.mocked(useIsFocused).mockReturnValue(false);
    await act(async (): Promise<void> => {
      renderer.update(<HookHarness onGuideCreated={onGuideCreated} />);
    });

    expect(stopAudioRecording).toHaveBeenCalledTimes(1);
    expect(currentActions.isListening).toBe(false);
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('업로드 중 탭을 떠나면 요청을 취소하고 늦은 응답을 무시한다', async (): Promise<void> => {
    let resolveGuide: (guide: EmergencyGuideResponse) => void = (): void => {};
    jest.mocked(createAudioEmergencyGuide).mockImplementation(
      (): Promise<EmergencyGuideResponse> =>
        new Promise<EmergencyGuideResponse>((resolve): void => {
          resolveGuide = resolve;
        }),
    );
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handleVoicePress();
    });

    let uploadPromise!: Promise<void>;
    await act(async (): Promise<void> => {
      uploadPromise = currentActions.handleVoicePress();
      await Promise.resolve();
    });
    const requestSignal = jest.mocked(createAudioEmergencyGuide).mock
      .calls[0]?.[1];
    expect(requestSignal?.aborted).toBe(false);

    jest.mocked(useIsFocused).mockReturnValue(false);
    await act(async (): Promise<void> => {
      renderer.update(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    expect(requestSignal?.aborted).toBe(true);

    resolveGuide(GUIDE);
    await act(async (): Promise<void> => uploadPromise);
    expect(onGuideCreated).not.toHaveBeenCalled();
    await act(async (): Promise<void> => renderer.unmount());
  });
});
