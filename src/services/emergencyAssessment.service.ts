import Config from 'react-native-config';

import type {
  EmergencyAssessmentErrorResponse,
  EmergencyAssessmentResponse,
  EmergencyAssessmentVoiceUploadParams,
} from '@/types/emergencyAssessment.types';

const EMERGENCY_ASSESSMENT_PATH = '/api/emergency-assessments';

const readEnvValue = (...values: Array<string | undefined>): string | null => {
  for (const value of values) {
    const trimmedValue = value?.trim();

    if (trimmedValue) {
      return trimmedValue;
    }
  }

  return null;
};

const buildEndpointUrl = (url: string): string => {
  if (url.includes(EMERGENCY_ASSESSMENT_PATH)) {
    return url;
  }

  return `${url.replace(/\/+$/, '')}${EMERGENCY_ASSESSMENT_PATH}`;
};

const buildEmergencyAssessmentUrl = (): string => {
  const emergencyAssessmentUrl = readEnvValue(
    Config.SM_EMERGENCY_ASSESSMENT_API_URL,
    Config.SM_API_URL,
  );

  if (emergencyAssessmentUrl) {
    return buildEndpointUrl(emergencyAssessmentUrl);
  }

  const apiBaseUrl = readEnvValue(Config.API_BASE_URL);

  if (!apiBaseUrl) {
    throw new Error(
      'API_BASE_URL이 설정되지 않았습니다. .env를 확인하세요.',
    );
  }

  return buildEndpointUrl(apiBaseUrl);
};

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

const readSuccessResponse = async (
  response: Response,
): Promise<EmergencyAssessmentResponse> => {
  try {
    return (await response.json()) as EmergencyAssessmentResponse;
  } catch {
    throw new Error('SM 응급상황 판단 서버가 JSON 응답을 반환하지 않았습니다.');
  }
};

export const postEmergencyAssessmentVoice = async ({
  audio,
  language = 'ko-KR',
  requestId = `voice-${Date.now()}`,
}: EmergencyAssessmentVoiceUploadParams): Promise<EmergencyAssessmentResponse> => {
  const endpointUrl = buildEmergencyAssessmentUrl();
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

  console.log('[EmergencyAssessment] voice request:', {
    endpointUrl,
    requestId,
    audioFile,
  });

  const response = await fetch(endpointUrl, {
    method: 'POST',
    body: formData,
  });

  console.log('[EmergencyAssessment] voice response status:', response.status);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const assessment = await readSuccessResponse(response);
  console.log('[EmergencyAssessment] voice response body:', assessment);

  return assessment;
};
