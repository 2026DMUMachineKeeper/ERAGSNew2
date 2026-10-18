import type {
  ApiError,
  CompoundGuideRequest,
  CreateEmergencyGuideHandoverRequest,
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideMediaFile,
  EmergencyGuidePhotoRequest,
  EmergencyGuideHandoverSnapshot,
  EmergencyGuideResponse,
  EmergencySessionLocationReport,
  EmergencyWasteGuideItem,
  EmergencyWasteGuideResponse,
} from '@/types';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';

import {
  authenticatedFetch,
  fetchWithTimeout,
  getApiBaseUrl,
  RequestTimeoutError,
} from './authenticatedFetch.service';
import { ApiRequestError } from './apiError.service';
import { logCompoundGuideDiagnostics } from './compoundGuide.service';
import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';

const EMERGENCY_GUIDE_UPLOAD_TIMEOUT_MS = 60_000;

// 백엔드 V2.1 용량 제한입니다. 초과 시 서버가 413으로 전체 요청을 거절하므로 전송 전에 미리 검사합니다.
export const EMERGENCY_GUIDE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const EMERGENCY_GUIDE_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const EMERGENCY_GUIDE_REQUEST_MAX_BYTES = 80 * 1024 * 1024;

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

// React Native에는 DOMException이 없어 fetch와 같은 모양의 AbortError를 직접 만듭니다.
const createAbortError = (): Error => {
  const error = new Error('The operation was aborted.');
  error.name = 'AbortError';
  return error;
};

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
  AI_PARSING_ERROR:
    '응급 상황 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  AUDIO_TOO_LARGE:
    '음성 파일 용량이 너무 큽니다(최대 25MB). 더 작은 파일로 다시 요청해 주세요.',
  IMAGE_TOO_LARGE:
    '이미지 파일 용량이 너무 큽니다(한 장당 최대 10MB). 더 작은 파일로 다시 요청해 주세요.',
  PAYLOAD_TOO_LARGE:
    '전송할 파일 용량이 너무 큽니다(합산 최대 80MB). 사진 수를 줄이거나 더 작은 파일로 다시 요청해 주세요.',
  GUIDE_PENDING: '응급 평가가 완료되었습니다. 처치 안내를 다시 요청해 주세요.',
  INVALID_COMPOUND_REQUEST: '복합 손상 요청을 서버가 확인하지 못했습니다.',
  REQUEST_ID_CONFLICT: '요청 내용이 변경되었습니다. 새 문진으로 요청해 주세요.',
  INVALID_RESPONSE:
    '응급 가이드 서버 응답을 확인하지 못했습니다. 앱과 서버 버전을 확인해 주세요.',
  UNSUPPORTED_AUDIO_TYPE:
    '지원하지 않는 음성 형식입니다. 다른 음성 파일로 다시 요청해 주세요.',
  UNSUPPORTED_IMAGE_TYPE:
    '지원하지 않는 이미지 형식입니다. 다른 이미지 파일로 다시 요청해 주세요.',
  SESSION_NOT_FOUND:
    '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
  SESSION_LOCATION_CONFLICT:
    '이 세션의 위치는 이미 다른 값으로 저장되어 변경할 수 없습니다.',
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

  if (payload.data.compound != null) {
    logCompoundGuideDiagnostics(payload.data, { operation: 'CREATE', httpStatus: response.status });
  }

  if (
    !isRecord(payload.data.treatment) ||
    !Array.isArray(payload.data.treatment.steps) ||
    !payload.data.treatment.steps.every(isEmergencyGuideTreatmentStep)
  ) {
    throw new EmergencyGuideRequestError(
      '응급 가이드 처치 단계 응답이 DTO 계약과 일치하지 않습니다.',
      response.status,
      'INVALID_RESPONSE',
      requestUrl,
    );
  }

  if (payload.data.compound != null && !isCompoundGuideResult(payload.data.compound)) {
    throw new EmergencyGuideRequestError(
      '복합 손상 응답 형식이 올바르지 않습니다.', response.status, 'INVALID_RESPONSE', requestUrl,
    );
  }

  const compound = payload.data.compound;
  if (isRecord(compound) && (compound.schemaVersion !== undefined ||
    compound.status === 'COMPLETE' || compound.status === 'PARTIAL')) {
    parseCompoundGuideSnapshot({ ...payload.data, planId: compound.planId });
    if (payload.data.sessionId !== compound.sessionId || payload.data.requestId !== compound.requestId ||
      payload.data.status !== (compound.status === 'PARTIAL' ? 'GUIDE_PENDING' : compound.status) ||
      payload.data.treatment.steps.length !== 0) {
      throw new EmergencyGuideRequestError(
        '복합 가이드 생성 응답이 저장 계획과 일치하지 않습니다.', response.status, 'INVALID_RESPONSE', requestUrl,
      );
    }
  }

  const guide = (payload as unknown as EmergencyGuideSuccessEnvelope).data;
  console.warn(
    '[EmergencyGuide API][Response Body]',
    JSON.stringify({
      sessionId: guide.sessionId,
      requestId: guide.requestId,
      status: guide.status,
      assessment: guide.assessment,
      treatment: {
        routeCode: guide.treatment.routeCode,
        stepCount: guide.treatment.steps.length,
        steps: guide.treatment.steps.map(step => ({
          stepId: step.stepId,
          stepNo: step.stepNo,
          instruction: step.instruction,
        })),
      },
      error: guide.error,
      compound: guide.compound ?? null,
    }),
  );
  return guide;
};

const isEmergencyGuideTreatmentStep = (value: unknown): boolean =>
  isRecord(value) &&
  Number.isInteger(value.stepId) &&
  (value.stepId as number) > 0;

const isCompoundGuideResult = (value: unknown): boolean => {
  if (!isRecord(value) || typeof value.call119Required !== 'boolean' ||
    !Array.isArray(value.blockedReasons) || !value.blockedReasons.every(code => typeof code === 'string') ||
    !Array.isArray(value.injuries) || value.injuries.length !== 2) {
    return false;
  }
  if (value.display != null && (!isRecord(value.display) ||
    (value.display.blockedReasons != null && (!Array.isArray(value.display.blockedReasons) ||
      !value.display.blockedReasons.every(reason => isRecord(reason) && typeof reason.code === 'string' && typeof reason.label === 'string'))))) {
    return false;
  }
  return value.injuries.every(injury => {
    if (!isRecord(injury) || typeof injury.injuryId !== 'string' || typeof injury.categoryCode !== 'string' ||
      (injury.deferredReason != null && typeof injury.deferredReason !== 'string') ||
      (injury.display != null && !isRecord(injury.display))) {
      return false;
    }
    const assessment = injury.assessment;
    if (assessment === null) {
      return true;
    }
    return isRecord(assessment) && typeof assessment.call119Required === 'boolean' &&
      Array.isArray(assessment.missingInputs) && assessment.missingInputs.every(code => typeof code === 'string') &&
      (assessment.display == null || (isRecord(assessment.display) &&
        (assessment.display.missingInputs == null || (Array.isArray(assessment.display.missingInputs) &&
          assessment.display.missingInputs.every(input => isRecord(input) && typeof input.code === 'string' && typeof input.label === 'string')))));
  });
};

// 세션 생성 시 JWT 사용자에게 소유권이 연결되어야 이후 위치 보고(PUT /sessions/{id}/location)가
// 허용됩니다. 다만 토큰 문제로 응급 가이드 자체가 막히면 안 되므로 토큰은 최선 노력으로만 붙입니다.
const getSessionOwnerHeaders = async (): Promise<Record<string, string>> => {
  try {
    return { Authorization: `Bearer ${await getAuthToken()}` };
  } catch (error: unknown) {
    if (!isAuthTokenExpiredError(error)) {
      console.warn('[EmergencyGuide API][Owner Token]', {
        reason: 'token_unavailable',
        errorName: error instanceof Error ? error.name : typeof error,
      });
      return {};
    }
  }

  try {
    return {
      Authorization: `Bearer ${(await refreshAuthTokens()).accessToken}`,
    };
  } catch (error: unknown) {
    console.warn('[EmergencyGuide API][Owner Token]', {
      reason: 'refresh_failed',
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return {};
  }
};

const EMERGENCY_GUIDE_SESSIONS_PATH = '/api/v1/emergency-guide-sessions';

const assertMediaFilesWithinLimits = (
  images: readonly EmergencyGuideMediaFile[],
  audio?: EmergencyGuideMediaFile,
): void => {
  const requestUrl = `${getEmergencyGuideBaseUrl()}${EMERGENCY_GUIDE_SESSIONS_PATH}`;
  const fail = (code: string): never => {
    throw new EmergencyGuideRequestError(
      EMERGENCY_GUIDE_ERROR_MESSAGES[code],
      413,
      code,
      requestUrl,
    );
  };

  if (
    images.some(image => (image.size ?? 0) > EMERGENCY_GUIDE_IMAGE_MAX_BYTES)
  ) {
    fail('IMAGE_TOO_LARGE');
  }
  if ((audio?.size ?? 0) > EMERGENCY_GUIDE_AUDIO_MAX_BYTES) {
    fail('AUDIO_TOO_LARGE');
  }

  const totalBytes = [...images, audio].reduce(
    (sum, file) => sum + (file?.size ?? 0),
    0,
  );
  if (totalBytes > EMERGENCY_GUIDE_REQUEST_MAX_BYTES) {
    fail('PAYLOAD_TOO_LARGE');
  }
};

export const createEmergencyGuide = async (
  formData: FormData,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  const requestUrl = `${getEmergencyGuideBaseUrl()}${EMERGENCY_GUIDE_SESSIONS_PATH}`;
  const ownerHeaders = await getSessionOwnerHeaders();
  if (signal?.aborted) {
    throw createAbortError();
  }
  logRequest(requestUrl);
  const response = await fetchWithTimeout(
    requestUrl,
    {
      method: 'POST',
      headers: { Accept: 'application/json', ...ownerHeaders },
      body: formData,
      signal,
    },
    EMERGENCY_GUIDE_UPLOAD_TIMEOUT_MS,
  );

  return readEmergencyGuideResponse(response, requestUrl);
};

export const createCompoundGuide = async (
  request: CompoundGuideRequest,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  if (signal?.aborted) {
    throw createAbortError();
  }
  const formData = new FormData();
  formData.append('request', JSON.stringify(request));
  const requestUrl = `${getEmergencyGuideBaseUrl()}${EMERGENCY_GUIDE_SESSIONS_PATH}`;
  logRequest(requestUrl);
  console.warn('[EmergencyGuide API][Compound Request]', JSON.stringify(request));
  const response = await authenticatedFetch({
    path: EMERGENCY_GUIDE_SESSIONS_PATH,
    getAccessToken: async () => {
      const token = await getAuthToken();
      if (signal?.aborted) {
        throw createAbortError();
      }
      return token;
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    refreshAccessToken: async () => (await refreshAuthTokens()).accessToken,
    init: { method: 'POST', body: formData, signal },
    timeoutMs: EMERGENCY_GUIDE_UPLOAD_TIMEOUT_MS,
  });
  const guide = await readEmergencyGuideResponse(response, requestUrl);
  if (guide.compound?.schemaVersion === '2' && (guide.requestId !== request.requestId ||
    request.injuries.some(input => !guide.compound?.injuries.some(injury =>
      injury.injuryId === input.injuryId && injury.categoryCode === input.categoryCode)))) {
    throw new EmergencyGuideRequestError(
      '복합 가이드가 요청한 손상과 일치하지 않습니다.', response.status, 'INVALID_RESPONSE', requestUrl,
    );
  }
  return guide;
};

// 사진은 한 장이어도 서버 규격(V2.1)에 맞춰 images 배열 필드로 보냅니다.
const createMediaEmergencyGuide = async (
  fieldName: 'audio' | 'images',
  mediaFile: EmergencyGuideMediaFile,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  if (fieldName === 'audio') {
    assertMediaFilesWithinLimits([], mediaFile);
  } else {
    assertMediaFilesWithinLimits([mediaFile]);
  }

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
  createMediaEmergencyGuide('images', imageFile, signal);

export const createPhotoEmergencyGuide = async (
  input: EmergencyGuidePhotoRequest,
  signal?: AbortSignal,
): Promise<EmergencyGuideResponse> => {
  if (input.images.length === 0 || input.images.length > 5) {
    throw new Error('응급 사진은 1장 이상 5장 이하로 전송해야 합니다.');
  }
  assertMediaFilesWithinLimits(input.images, input.audio);

  const formData = new FormData();
  formData.append(
    'request',
    JSON.stringify({
      requestId: `image-${Date.now()}`,
      language: 'ko-KR',
    }),
  );
  input.images.forEach(imageFile => {
    const reactNativeFile: ReactNativeFile = imageFile;
    formData.append('images', reactNativeFile as unknown as Blob);
  });

  const normalizedText = input.text?.trim();
  if (normalizedText) {
    formData.append('text', normalizedText);
  }
  if (input.audio) {
    const reactNativeFile: ReactNativeFile = input.audio;
    formData.append('audio', reactNativeFile as unknown as Blob);
  }

  return createEmergencyGuide(formData, signal);
};

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

  const path = `/api/v1/emergency-guide-sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/handover`;
  const requestUrl = `${getEmergencyGuideBaseUrl()}${path}`;
  logRequest(requestUrl);
  const response = await authenticatedFetch({
    getAccessToken: getAuthToken,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
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

  const path = `/api/v2/emergency-guide-sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/waste-guide`;
  const requestUrl = `${getEmergencyGuideBaseUrl()}${path}`;
  logRequest(requestUrl, 'GET');
  const response = await authenticatedFetch({
    getAccessToken: getAuthToken,
    init: { method: 'GET', signal },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
  });

  return readEmergencyWasteGuideResponse(response, requestUrl);
};

const SESSION_LOCATION_STATUS_CODES: Readonly<Record<number, string>> = {
  403: 'SESSION_FORBIDDEN',
  404: 'SESSION_NOT_FOUND',
  409: 'SESSION_LOCATION_CONFLICT',
};

const isValidSessionLocationReport = (
  report: EmergencySessionLocationReport,
): boolean => {
  if (report.status !== 'AVAILABLE') {
    return (
      report.latitude === null &&
      report.longitude === null &&
      report.accuracy === null
    );
  }

  return (
    Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    (report.accuracy === null || Number.isFinite(report.accuracy))
  );
};

// PUT /api/v1/sessions/{sessionId}/location
// 세션 소유자 토큰으로 일회성 GPS 수집 결과를 저장합니다. 같은 내용의 재시도는 성공하고,
// 이미 다른 값이 저장된 세션은 409(SESSION_LOCATION_CONFLICT)로 거절됩니다.
export const reportEmergencySessionLocation = async (
  sessionId: string,
  report: EmergencySessionLocationReport,
  signal?: AbortSignal,
): Promise<void> => {
  const normalizedSessionId = sessionId.trim();

  if (!normalizedSessionId) {
    throw new Error('응급 가이드 sessionId가 없습니다.');
  }

  if (!isValidSessionLocationReport(report)) {
    throw new Error('세션 위치 보고 내용이 올바르지 않습니다.');
  }

  const path = `/api/v1/sessions/${encodeURIComponent(
    normalizedSessionId,
  )}/location`;
  const requestUrl = `${getEmergencyGuideBaseUrl()}${path}`;
  logRequest(requestUrl, 'PUT');
  const response = await authenticatedFetch({
    getAccessToken: getAuthToken,
    init: {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      signal,
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (
        await refreshAuthTokens()
      ).accessToken,
  });

  if (response.ok) {
    console.warn('[EmergencyGuide API][Response]', {
      requestUrl,
      status: response.status,
      ok: true,
      errorCode: null,
    });
    return;
  }

  let payload: unknown = null;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    payload = null;
  }

  const failure = readFailure(payload);
  const code =
    failure?.code ??
    SESSION_LOCATION_STATUS_CODES[response.status] ??
    'REQUEST_FAILED';
  console.warn('[EmergencyGuide API][Response]', {
    requestUrl,
    status: response.status,
    ok: false,
    errorCode: code,
  });

  throw new EmergencyGuideRequestError(
    failure?.message ?? '세션 위치 저장에 실패했습니다.',
    response.status,
    code,
    requestUrl,
    failure?.details ?? [],
  );
};
