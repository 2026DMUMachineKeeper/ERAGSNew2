import type {
  ApiError,
  CreateEmergencyGuideHandoverRequest,
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideMediaFile,
  EmergencyGuideHandoverSnapshot,
  EmergencyGuideResponse,
  EmergencyWasteGuideItem,
  EmergencyWasteGuideResponse,
} from '@/types';

import {
  fetchWithTimeout,
  getApiBaseUrl,
  RequestTimeoutError,
} from './authenticatedFetch.service';
import { ApiRequestError } from './apiError.service';

const EMERGENCY_GUIDE_UPLOAD_TIMEOUT_MS = 60_000;

interface EmergencyGuideSuccessEnvelope {
  success: true;
  data: EmergencyGuideResponse;
  message?: string;
}

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

export class EmergencyGuideRequestError extends ApiRequestError {
  constructor(
    message: string,
    status: number,
    code: string,
    public readonly requestUrl: string,
    details: readonly unknown[] = [],
  ) {
    super({ code, details, message }, status);
    this.name = 'EmergencyGuideRequestError';
  }
}

const getEmergencyGuideBaseUrl = getApiBaseUrl;

export const getEmergencyGuideImageUrl = (
  imageUrl: string | null,
  imageResource: string | null,
): string => {
  const normalizedImageUrl = imageUrl?.trim() ?? '';
  const normalizedImageResource = imageResource?.trim() ?? '';

  if (!normalizedImageUrl && !normalizedImageResource) {
    return '';
  }

  if (normalizedImageUrl) {
    const imagePathWithoutOrigin = normalizedImageUrl.replace(
      /^https?:\/\/[^/]+/i,
      '',
    );
    const imagePath = imagePathWithoutOrigin.startsWith('/')
      ? imagePathWithoutOrigin
      : `/${imagePathWithoutOrigin}`;

    return `${getEmergencyGuideBaseUrl()}${imagePath}`;
  }

  return `${getEmergencyGuideBaseUrl()}/images/${encodeURIComponent(
    normalizedImageResource,
  )}`;
};

const isRecord = (payload: unknown): payload is Record<string, unknown> =>
  payload !== null && typeof payload === 'object';

const EMERGENCY_GUIDE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  AUDIO_TOO_LARGE:
    '음성 파일 용량이 너무 큽니다. 더 작은 파일로 다시 요청해 주세요.',
  IMAGE_TOO_LARGE:
    '이미지 파일 용량이 너무 큽니다. 더 작은 파일로 다시 요청해 주세요.',
  GUIDE_PENDING: '응급 평가가 완료되었습니다. 처치 안내를 다시 요청해 주세요.',
  INVALID_RESPONSE:
    '응급 가이드 서버 응답을 확인하지 못했습니다. 앱과 서버 버전을 확인해 주세요.',
  UNSUPPORTED_AUDIO_TYPE:
    '지원하지 않는 음성 형식입니다. 다른 음성 파일로 다시 요청해 주세요.',
  UNSUPPORTED_IMAGE_TYPE:
    '지원하지 않는 이미지 형식입니다. 다른 이미지 파일로 다시 요청해 주세요.',
  SESSION_NOT_FOUND:
    '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
  WASTE_GUIDE_HANDOVER_NOT_FOUND:
    '해당 세션의 처치 완료 기록(인계장)이 없습니다.',
  SM_BAD_GATEWAY:
    '응급 가이드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  SM_UNAVAILABLE:
    '응급 가이드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
};

const EMERGENCY_GUIDE_STATUS_MESSAGES: Readonly<Record<number, string>> = {
  404: '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
  413: '파일 용량이 너무 큽니다. 더 작은 파일로 다시 요청해 주세요.',
  415: '지원하지 않는 파일 형식입니다. 다른 파일로 다시 요청해 주세요.',
  502: '응급 가이드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  503: '응급 가이드 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
};

export const getEmergencyGuideErrorMessage = (error: unknown): string => {
  if (error instanceof RequestTimeoutError) {
    return '요청 시간이 초과되었습니다. 네트워크 연결을 확인한 후 다시 시도해 주세요.';
  }

  if (error instanceof TypeError) {
    return '네트워크 연결을 확인한 후 다시 시도해 주세요.';
  }

  const code =
    error instanceof ApiRequestError
      ? error.code
      : isRecord(error) && typeof error.code === 'string'
      ? error.code
      : null;
  const status = error instanceof ApiRequestError ? error.status : null;

  return (
    (code ? EMERGENCY_GUIDE_ERROR_MESSAGES[code] : undefined) ??
    (status ? EMERGENCY_GUIDE_STATUS_MESSAGES[status] : undefined) ??
    '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  );
};

const logRequest = (requestUrl: string, method = 'POST'): void => {
  console.warn('[EmergencyGuide API][Request]', { requestUrl, method });
};

const summarizeHandoverUrl = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string') {
    return { type: typeof value };
  }

  const hashIndex = value.indexOf('#');
  const token = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';

  return {
    type: 'string',
    length: value.length,
    path: hashIndex >= 0 ? value.slice(0, hashIndex) : value,
    hasToken: token.startsWith('token='),
    tokenLength: token.startsWith('token=') ? token.slice(6).length : 0,
    matchesExpectedFormat:
      /^https?:\/\/[^#]+\/handover\.html#token=[A-Za-z0-9_-]{43}$/.test(value),
  };
};

const readFailure = (payload: unknown): ApiError | null => {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return null;
  }

  const { code, message, details } = payload.error;

  if (typeof code !== 'string' || typeof message !== 'string') {
    return null;
  }

  return {
    code,
    message,
    details: Array.isArray(details)
      ? details.filter((detail): detail is string => typeof detail === 'string')
      : [],
  };
};

const getHandoverEnvelopeValidationIssue = (
  payload: unknown,
): string | null => {
  if (!isRecord(payload)) {
    return 'payload_not_object';
  }

  if (payload.success !== true) {
    return 'success_not_true';
  }

  if (!isRecord(payload.data)) {
    return 'data_not_object';
  }

  if (typeof payload.data.publicHandoverUrl !== 'string') {
    return 'public_handover_url_not_string';
  }

  if (
    !/^https?:\/\/[^#]+\/handover\.html#token=[A-Za-z0-9_-]{43}$/.test(
      payload.data.publicHandoverUrl,
    )
  ) {
    return 'public_handover_url_invalid_format';
  }

  return null;
};

const readEmergencyGuideResponse = async (
  response: Response,
  requestUrl: string,
): Promise<EmergencyGuideResponse> => {
  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    console.error('[EmergencyGuide API][Response]', {
      requestUrl,
      status: response.status,
      ok: response.ok,
      errorCode: 'INVALID_RESPONSE',
    });
    throw new EmergencyGuideRequestError(
      '응급 가이드 응답 형식이 올바르지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  const failure = readFailure(payload);
  console.warn('[EmergencyGuide API][Response]', {
    requestUrl,
    status: response.status,
    ok: response.ok,
    errorCode: failure?.code ?? null,
  });

  if (!response.ok || failure) {
    throw new EmergencyGuideRequestError(
      failure?.message ?? '응급 가이드 요청에 실패했습니다.',
      response.status,
      failure?.code ?? 'REQUEST_FAILED',
      requestUrl,
      failure?.details ?? [],
    );
  }

  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    (payload.data.sessionId !== null &&
      (typeof payload.data.sessionId !== 'string' ||
        payload.data.sessionId.trim().length === 0))
  ) {
    throw new EmergencyGuideRequestError(
      '응급 가이드 sessionId가 없습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  return (payload as unknown as EmergencyGuideSuccessEnvelope).data;
};

export const createEmergencyGuide = async (
  formData: FormData,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  const requestUrl = `${getEmergencyGuideBaseUrl()}/api/v1/emergency-guide-sessions`;
  logRequest(requestUrl);
  const response = await fetchWithTimeout(
    requestUrl,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
      signal,
    },
    EMERGENCY_GUIDE_UPLOAD_TIMEOUT_MS,
  );

  return readEmergencyGuideResponse(response, requestUrl);
};

const createMediaEmergencyGuide = (
  fieldName: 'audio' | 'image',
  mediaFile: EmergencyGuideMediaFile,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  const formData = new FormData();
  const requestIdPrefix = fieldName === 'audio' ? 'voice' : 'image';
  const reactNativeFile: ReactNativeFile = mediaFile;

  formData.append(
    'request',
    JSON.stringify({
      requestId: `${requestIdPrefix}-${Date.now()}`,
      language: 'ko-KR',
    }),
  );
  formData.append(fieldName, reactNativeFile as unknown as Blob);

  return createEmergencyGuide(formData, signal);
};

export const createAudioEmergencyGuide = (
  audioFile: EmergencyGuideMediaFile,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> =>
  createMediaEmergencyGuide('audio', audioFile, signal);

export const createImageEmergencyGuide = (
  imageFile: EmergencyGuideMediaFile,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> =>
  createMediaEmergencyGuide('image', imageFile, signal);

export const retryEmergencyGuide = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    throw new Error('응급 가이드 sessionId가 없습니다.');
  }

  const requestUrl = `${getEmergencyGuideBaseUrl()}/api/v1/emergency-guide-sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/guide`;
  logRequest(requestUrl);
  const response = await fetchWithTimeout(requestUrl, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    signal,
  });

  return readEmergencyGuideResponse(response, requestUrl);
};

export const parseEmergencyGuideHandoverSnapshot = (
  value: unknown,
  requestUrl = '',
): EmergencyGuideHandoverSnapshot => {
  const validationIssue = getHandoverSnapshotValidationIssue(value);

  if (validationIssue) {
    console.error('[EmergencyGuide API][Handover Snapshot]', {
      requestUrl,
      errorCode: 'INVALID_RESPONSE',
      validationIssue,
      snapshotKeys: isRecord(value) ? Object.keys(value) : [],
    });
    throw new EmergencyGuideRequestError(
      '구급대원 인계 응답이 DTO 계약과 일치하지 않습니다.',
      200,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  return value as unknown as EmergencyGuideHandoverSnapshot;
};

const getHandoverSnapshotValidationIssue = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return 'snapshot_not_object';
  }

  const unexpectedKey = [
    'handoverId',
    'sessionId',
    'token',
    'evidence',
    'routeCode',
    'plan',
  ].find(key => key in value);

  if (unexpectedKey) {
    return `unexpected_snapshot_key:${unexpectedKey}`;
  }

  if (value.version !== 2) {
    return 'snapshot_version_invalid';
  }

  if (!isDateTime(value.generatedAt)) {
    return 'snapshot_generated_at_invalid';
  }

  if (!isDateTime(value.expiresAt)) {
    return 'snapshot_expires_at_invalid';
  }

  if (!['COMPLETED', 'IN_PROGRESS'].includes(String(value.status))) {
    return 'snapshot_status_invalid';
  }

  if (!isHandoverAssessment(value.assessment)) {
    return 'snapshot_assessment_invalid';
  }

  if (!Array.isArray(value.completedTreatments)) {
    return 'completed_treatments_not_array';
  }

  if (!value.completedTreatments.every(isCompletedTreatment)) {
    return 'completed_treatment_item_invalid';
  }

  if (!Array.isArray(value.usedSupplies)) {
    return 'used_supplies_not_array';
  }

  if (!value.usedSupplies.every(isUsedSupply)) {
    return 'used_supply_item_invalid';
  }

  return null;
};

const isDateTime = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value));

const isHandoverAssessment = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.categoryCode === 'string' &&
  typeof value.subtypeCode === 'string' &&
  ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'].includes(
    String(value.severityCode),
  ) &&
  ['CONSCIOUS', 'UNCONSCIOUS', 'UNKNOWN'].includes(
    String(value.consciousness),
  ) &&
  ['CHILD', 'ADULT', 'ELDERLY', 'UNKNOWN'].includes(String(value.ageGroup)) &&
  Array.isArray(value.redFlags) &&
  value.redFlags.every(redFlag => typeof redFlag === 'string') &&
  typeof value.call119Required === 'boolean' &&
  typeof value.summary === 'string';

const isCompletedTreatment = (value: unknown): boolean =>
  isRecord(value) &&
  Number.isInteger(value.stepId) &&
  (value.stepId as number) > 0 &&
  Number.isInteger(value.stepNo) &&
  (value.stepNo as number) > 0 &&
  typeof value.instruction === 'string' &&
  value.instruction.trim().length > 0;

const isUsedSupply = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  value.name.trim().length > 0 &&
  Number.isInteger(value.quantity) &&
  (value.quantity as number) > 0;

const readEmergencyGuideHandoverResponse = async (
  response: Response,
  requestUrl: string,
): Promise<CreateEmergencyGuideHandoverResponse> => {
  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new EmergencyGuideRequestError(
      '구급대원 인계 응답 형식이 올바르지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  const failure = readFailure(payload);
  const data =
    isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  const snapshot = data && isRecord(data.snapshot) ? data.snapshot : null;
  const validationIssue = getHandoverEnvelopeValidationIssue(payload);
  console.warn('[EmergencyGuide API][Response]', {
    requestUrl,
    status: response.status,
    ok: response.ok,
    errorCode: failure?.code ?? null,
    success: isRecord(payload) ? payload.success ?? null : null,
    payloadKeys: isRecord(payload) ? Object.keys(payload) : [],
    dataKeys: data ? Object.keys(data) : [],
    publicHandoverUrl: summarizeHandoverUrl(data?.publicHandoverUrl),
    snapshot: snapshot
      ? {
          keys: Object.keys(snapshot),
          version: snapshot.version ?? null,
          status: snapshot.status ?? null,
          completedTreatmentsCount: Array.isArray(snapshot.completedTreatments)
            ? snapshot.completedTreatments.length
            : null,
          usedSuppliesCount: Array.isArray(snapshot.usedSupplies)
            ? snapshot.usedSupplies.length
            : null,
        }
      : null,
    validationIssue,
  });

  if (!response.ok || failure) {
    throw new EmergencyGuideRequestError(
      failure?.message ?? '구급대원 인계 QR 발급에 실패했습니다.',
      response.status,
      failure?.code ?? 'REQUEST_FAILED',
      requestUrl,
      failure?.details ?? [],
    );
  }

  if (validationIssue) {
    throw new EmergencyGuideRequestError(
      '구급대원 인계 응답이 DTO 계약과 일치하지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  return {
    publicHandoverUrl: data?.publicHandoverUrl as string,
    snapshot: parseEmergencyGuideHandoverSnapshot(data?.snapshot, requestUrl),
  };
};

export const createEmergencyGuideHandover = async (
  sessionId: string,
  input: CreateEmergencyGuideHandoverRequest,
  signal?: AbortSignal,
): Promise<CreateEmergencyGuideHandoverResponse> => {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    throw new Error('응급 가이드 sessionId가 없습니다.');
  }

  const requestUrl = `${getEmergencyGuideBaseUrl()}/api/v1/emergency-guide-sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/handover`;
  logRequest(requestUrl);
  const response = await fetchWithTimeout(requestUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
    signal,
  });

  return readEmergencyGuideHandoverResponse(response, requestUrl);
};

const isEmergencyWasteGuideItem = (
  value: unknown,
): value is EmergencyWasteGuideItem =>
  isRecord(value) &&
  typeof value.itemName === 'string' &&
  typeof value.wasteCategory === 'string' &&
  typeof value.disposalMethod === 'string' &&
  (value.dangerLevel === 'HIGH' || value.dangerLevel === 'LOW');

const readEmergencyWasteGuideResponse = async (
  response: Response,
  requestUrl: string,
): Promise<EmergencyWasteGuideResponse> => {
  let payload: unknown;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw new EmergencyGuideRequestError(
      '폐기물 안내 응답 형식이 올바르지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  const failure = readFailure(payload);
  const payloadRecord = isRecord(payload) ? payload : null;
  const message =
    failure?.message ??
    (typeof payloadRecord?.message === 'string'
      ? payloadRecord.message
      : undefined);
  const code =
    failure?.code ??
    (response.status === 404
      ? 'WASTE_GUIDE_HANDOVER_NOT_FOUND'
      : 'REQUEST_FAILED');

  console.warn('[EmergencyGuide API][Response]', {
    requestUrl,
    status: response.status,
    ok: response.ok,
    errorCode: code,
  });

  if (!response.ok || !payloadRecord || payloadRecord.success !== true) {
    throw new EmergencyGuideRequestError(
      message ?? '폐기물 안내 요청에 실패했습니다.',
      response.status,
      code,
      requestUrl,
      failure?.details ?? [],
    );
  }

  if (
    !Array.isArray(payloadRecord.data) ||
    !payloadRecord.data.every(isEmergencyWasteGuideItem)
  ) {
    throw new EmergencyGuideRequestError(
      '폐기물 안내 응답이 DTO 계약과 일치하지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  return {
    success: true,
    data: payloadRecord.data,
    ...(typeof payloadRecord.message === 'string'
      ? { message: payloadRecord.message }
      : {}),
  };
};

export const getEmergencyWasteGuide = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<EmergencyWasteGuideResponse> => {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    throw new Error('응급 가이드 sessionId가 없습니다.');
  }

  const requestUrl = `${getEmergencyGuideBaseUrl()}/api/v2/emergency-guide-sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/waste-guide`;
  logRequest(requestUrl, 'GET');
  const response = await fetchWithTimeout(requestUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  return readEmergencyWasteGuideResponse(response, requestUrl);
};
