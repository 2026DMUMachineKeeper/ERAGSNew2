import { Alert, Platform, ToastAndroid } from 'react-native';

import type {
  EmergencyGuideEvidence,
  EmergencyGuideEvidenceImage,
} from '@/types';
import {
  getEmergencyEvidenceFailureMessage,
  showEmergencyEvidenceFailureNotice,
} from '@/utils/emergencyEvidence';

const buildEvidence = (
  overrides: Partial<EmergencyGuideEvidence> = {},
): EmergencyGuideEvidence => ({
  voice: null,
  images: null,
  questionnaire: null,
  ...overrides,
});

const failedImage = (
  index: number,
  code = 'UNSUPPORTED_IMAGE_TYPE',
): EmergencyGuideEvidenceImage => ({
  imageId: `image-${index}`,
  status: 'FAILED',
  error: { code, message: '지원하지 않는 이미지 형식입니다.' },
});

const succeededImage = (index: number): EmergencyGuideEvidenceImage => ({
  imageId: `image-${index}`,
  status: 'SUCCEEDED',
  visibleBlood: true,
  visibleBloodScore: 0.85,
});

describe('emergencyEvidence', () => {
  const originalPlatformOs = Platform.OS;

  beforeEach((): void => {
    jest.spyOn(console, 'warn').mockImplementation((): void => {});
    jest.spyOn(ToastAndroid, 'show').mockImplementation((): void => {});
    jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
  });

  afterEach((): void => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOs,
    });
    jest.restoreAllMocks();
  });

  it('실패한 증거가 없으면 안내하지 않는다', (): void => {
    expect(getEmergencyEvidenceFailureMessage({ evidence: null })).toBeNull();
    expect(
      getEmergencyEvidenceFailureMessage({
        evidence: buildEvidence({
          images: [succeededImage(0), succeededImage(1)],
          voice: { status: 'SUCCEEDED' },
        }),
      }),
    ).toBeNull();
    expect(
      showEmergencyEvidenceFailureNotice({ sessionId: 's', evidence: null }),
    ).toBe(false);
    expect(ToastAndroid.show).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('일부 사진만 실패하면 장수를 함께 알린다', (): void => {
    expect(
      getEmergencyEvidenceFailureMessage({
        evidence: buildEvidence({
          images: [succeededImage(0), failedImage(1), failedImage(2)],
        }),
      }),
    ).toBe(
      '사진 3장 중 2장을 분석할 수 없지만, 등록된 정보로 가이드를 제공합니다.',
    );
  });

  it('사진 전체와 음성이 실패하면 둘 다 알린다', (): void => {
    expect(
      getEmergencyEvidenceFailureMessage({
        evidence: buildEvidence({
          images: [failedImage(0, 'AI_PARSING_ERROR')],
          voice: {
            status: 'FAILED',
            error: { code: 'SM_UNAVAILABLE', message: '서버 오류' },
          },
        }),
      }),
    ).toBe(
      '사진과 음성을 분석할 수 없지만, 등록된 정보로 가이드를 제공합니다.',
    );
  });

  it('안드로이드에서는 토스트로, 그 외에는 Alert로 흐름을 막지 않고 알린다', (): void => {
    const evidence = buildEvidence({ images: [failedImage(0)] });

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });
    expect(
      showEmergencyEvidenceFailureNotice({ sessionId: 'emg-1', evidence }),
    ).toBe(true);
    expect(ToastAndroid.show).toHaveBeenCalledWith(
      '사진을 분석할 수 없지만, 등록된 정보로 가이드를 제공합니다.',
      ToastAndroid.LONG,
    );
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      '[EmergencyGuide API][Evidence]',
      expect.objectContaining({
        sessionId: 'emg-1',
        failedImages: [{ imageId: 'image-0', code: 'UNSUPPORTED_IMAGE_TYPE' }],
        voiceErrorCode: null,
      }),
    );

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
    showEmergencyEvidenceFailureNotice({ sessionId: 'emg-1', evidence });
    expect(Alert.alert).toHaveBeenCalledWith(
      '일부 정보 분석 실패',
      '사진을 분석할 수 없지만, 등록된 정보로 가이드를 제공합니다.',
    );
  });
});
