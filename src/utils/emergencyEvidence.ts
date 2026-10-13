import { Alert, Platform, ToastAndroid } from 'react-native';

import type { EmergencyGuideResponse } from '@/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const isFailedEvidence = (value: unknown): boolean =>
  isRecord(value) && value.status === 'FAILED';

const getErrorCode = (value: unknown): string | null =>
  isRecord(value) &&
  isRecord(value.error) &&
  typeof value.error.code === 'string'
    ? value.error.code
    : null;

// 서버는 일부 사진·음성 분석에 실패해도 200으로 가이드를 내려줍니다(부분 실패 정책).
// 실패한 항목이 있으면 사용자에게 알릴 문구를 만들고, 없으면 null을 돌려줍니다.
export const getEmergencyEvidenceFailureMessage = (
  guide: Pick<EmergencyGuideResponse, 'evidence'>,
): string | null => {
  const evidence = guide.evidence;
  if (!isRecord(evidence)) {
    return null;
  }

  const images = Array.isArray(evidence.images) ? evidence.images : [];
  const failedImageCount = images.filter(isFailedEvidence).length;
  const isVoiceFailed = isFailedEvidence(evidence.voice);
  const failedParts: string[] = [];

  if (failedImageCount > 0) {
    failedParts.push(
      failedImageCount === images.length
        ? '사진'
        : `사진 ${images.length}장 중 ${failedImageCount}장`,
    );
  }
  if (isVoiceFailed) {
    failedParts.push('음성');
  }
  if (failedParts.length === 0) {
    return null;
  }

  return `${failedParts.join(
    '과 ',
  )}을 분석할 수 없지만, 등록된 정보로 가이드를 제공합니다.`;
};

// 흐름을 막지 않도록 토스트로만 알립니다. 다시 찍고 싶으면 가이드 화면의 '새 요청'으로 새 세션을 만듭니다.
export const showEmergencyEvidenceFailureNotice = (
  guide: Pick<EmergencyGuideResponse, 'evidence' | 'sessionId'>,
): boolean => {
  const message = getEmergencyEvidenceFailureMessage(guide);
  if (!message) {
    return false;
  }

  const evidence: Record<string, unknown> = isRecord(guide.evidence)
    ? guide.evidence
    : {};
  const images = Array.isArray(evidence.images) ? evidence.images : [];
  console.warn('[EmergencyGuide API][Evidence]', {
    sessionId: guide.sessionId,
    failedImages: images.filter(isFailedEvidence).map(image => ({
      imageId: isRecord(image) ? image.imageId ?? null : null,
      code: getErrorCode(image),
    })),
    voiceErrorCode: isFailedEvidence(evidence.voice)
      ? getErrorCode(evidence.voice)
      : null,
  });

  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert('일부 정보 분석 실패', message);
  }

  return true;
};
