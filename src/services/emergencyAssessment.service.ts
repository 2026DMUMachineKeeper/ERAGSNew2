import Config from 'react-native-config';

import type {
  EmergencyAssessmentErrorResponse,
  EmergencyAssessmentResponse,
  EmergencyAssessmentVoiceUploadParams,
} from '@/types/emergencyAssessment.types';

const DEFAULT_EMERGENCY_ASSESSMENT_API_URL =
  'http://52.79.242.244:4000/api/emergency-assessments';

const buildEmergencyAssessmentUrl = (): string =>
  Config.SM_EMERGENCY_ASSESSMENT_API_URL ??
  DEFAULT_EMERGENCY_ASSESSMENT_API_URL;

const isEmergencyAssessmentErrorResponse = (
  payload: unknown,
): payload is EmergencyAssessmentErrorResponse => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== 'object') {
    return false;
  }

  return typeof (error as { message?: unknown }).message === 'string';
};

const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = (await response.json().catch(() => null)) as unknown;

  if (isEmergencyAssessmentErrorResponse(payload)) {
    const details = payload.error.details?.length
      ? ` (${payload.error.details.join(', ')})`
      : '';

    return `${payload.error.message}${details}`;
  }

  return `SM 응급상황 판단 요청 실패: ${response.status}`;
};

export const postEmergencyAssessmentVoice = async ({
  audio,
  language = 'ko-KR',
  requestId = `voice-${Date.now()}`,
}: EmergencyAssessmentVoiceUploadParams): Promise<EmergencyAssessmentResponse> => {
  const formData = new FormData();
  const audioFile = {
    uri: audio.uri,
    name: audio.name ?? 'record.m4a',
    type: audio.type ?? 'audio/m4a',
  };

  formData.append('inputSource', 'VOICE');
  formData.append('language', language);
  formData.append('requestId', requestId);
  formData.append('audio', audioFile as unknown as Blob);

  const response = await fetch(buildEmergencyAssessmentUrl(), {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as EmergencyAssessmentResponse;
};
