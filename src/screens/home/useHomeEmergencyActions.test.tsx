import React from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

import Geolocation from '@react-native-community/geolocation';
import { useIsFocused } from '@react-navigation/native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  createAudioEmergencyGuide,
  getAddressFromCoordinates,
  hasLocationPermission,
  retryEmergencyGuide,
  startAudioRecording,
  stopAudioRecording,
} from '@/services';
import type { EmergencyGuideResponse } from '@/types';
import { showLocationPermissionPrompt } from '@/utils';

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

jest.mock('@/utils', () => ({
  showLocationPermissionPrompt: jest.fn(),
}));

const AUDIO_FILE = {
  uri: 'file:///voice.m4a',
  name: 'voice.m4a',
  type: 'audio/mp4',
};
const GUIDE = {
  treatment: { steps: [{}] },
} as EmergencyGuideResponse;
const PENDING_GUIDE: EmergencyGuideResponse = {
  sessionId: 'session-pending',
  requestId: 'request-pending',
  generatedAt: '2026-09-06T00:00:00.000Z',
  status: 'GUIDE_PENDING',
  patientContext: null,
  evidence: null,
  assessment: {
    assessmentId: 'assessment-1',
    categoryCode: 'BLEEDING',
    subtypeCode: 'BLEEDING_MODERATE',
    severityCode: 'MEDIUM',
    confidence: 0.8,
    redFlags: [],
    call119Required: false,
    summary: '중간 정도의 출혈',
    reasons: ['지속 출혈'],
    missingInputs: [],
    decisionSource: 'ML_EVIDENCE',
    modelVersion: 'test-model',
  },
  treatment: {
    routeCode: null,
    modelVersion: null,
    steps: [],
  },
  error: {
    code: 'GUIDE_PENDING',
    message: '처치 안내를 준비하고 있습니다.',
    details: [],
  },
};

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
  const originalPlatformOs = Platform.OS;

  beforeEach((): void => {
    jest.clearAllMocks();
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest.mocked(hasLocationPermission).mockResolvedValue(true);
    jest.mocked(getAddressFromCoordinates).mockResolvedValue(null);
    jest.mocked(startAudioRecording).mockResolvedValue();
    jest.mocked(stopAudioRecording).mockResolvedValue(AUDIO_FILE);
  });

  afterEach((): void => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOs,
    });
    jest.restoreAllMocks();
  });

  it('카메라 권한 요청 실패를 사용자에게 안내한다', async (): Promise<void> => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockRejectedValue(new Error('권한 오류'));
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});
    jest.spyOn(console, 'error').mockImplementation((): void => {});
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handlePhotoPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      '권한 확인 실패',
      '카메라 권한을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('긴급 신고에서 위치 권한이 없으면 권한 안내를 표시한다', async (): Promise<void> => {
    jest.mocked(hasLocationPermission).mockResolvedValue(false);
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handleEmergencyReportPress();
    });

    expect(showLocationPermissionPrompt).toHaveBeenCalledTimes(1);
    await act(async (): Promise<void> => renderer.unmount());
  });

  it('빠른 위치 조회가 시간 초과되면 정밀 위치로 재시도한다', async (): Promise<void> => {
    const timeoutError = {
      code: 3,
      message: 'Location request timed out',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };
    const position = {
      coords: {
        latitude: 37.5665,
        longitude: 126.978,
        altitude: null,
        accuracy: 20,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    jest
      .mocked(Geolocation.getCurrentPosition)
      .mockImplementationOnce((_success, error): void => error?.(timeoutError))
      .mockImplementationOnce((success): void => success(position));
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((): void => {});
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handleEmergencyReportPress();
    });

    expect(Geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenCalledWith(
      '긴급 신고 문자',
      '현재 위치\n위도: 37.5665\n경도: 126.978',
    );
    await act(async (): Promise<void> => renderer.unmount());
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

  it('가이드 단계가 없어도 최초 음성 평가를 결과 화면에 전달한다', async (): Promise<void> => {
    jest.mocked(createAudioEmergencyGuide).mockResolvedValue(PENDING_GUIDE);
    const onGuideCreated = jest.fn();
    let renderer!: ReactTestRenderer;

    await act(async (): Promise<void> => {
      renderer = create(<HookHarness onGuideCreated={onGuideCreated} />);
    });
    await act(async (): Promise<void> => {
      await currentActions.handleVoicePress();
      await currentActions.handleVoicePress();
    });

    expect(onGuideCreated).toHaveBeenCalledWith('voice', PENDING_GUIDE);
    expect(retryEmergencyGuide).not.toHaveBeenCalled();
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
