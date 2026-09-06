import type {
  ApiError,
  EmergencyGuideMediaFile,
  EmergencyGuideResponse,
} from '@/types';

import { fetchWithTimeout, getApiBaseUrl } from './authenticatedFetch.service';

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

export class EmergencyGuideRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestUrl: string,
  ) {
    super(message);
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

const readFormDataFieldNames = (formData: FormData): string[] => {
  const reactNativeFormData = formData as unknown as {
    getParts?: () => readonly unknown[];
  };

  if (typeof reactNativeFormData.getParts === 'function') {
    return reactNativeFormData
      .getParts()
      .flatMap(part =>
        isRecord(part) && typeof part.fieldName === 'string'
          ? [part.fieldName]
          : [],
      );
  }

  const standardFormData = formData as unknown as {
    entries?: () => Iterable<readonly [string, unknown]>;
  };

  return typeof standardFormData.entries === 'function'
    ? Array.from(standardFormData.entries(), ([fieldName]) => fieldName)
    : [];
};

const logRequest = (requestUrl: string, fieldNames: string[]): void => {
  console.warn('[EmergencyGuide API][Request]', {
    requestUrl,
    method: 'POST',
    fieldNames,
  });
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
      '응급 가이드 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      response.status,
      failure?.code ?? 'REQUEST_FAILED',
      requestUrl,
    );
  }

  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data) ||
    typeof payload.data.sessionId !== 'string' ||
    payload.data.sessionId.trim().length === 0
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
  logRequest(requestUrl, readFormDataFieldNames(formData));
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
  logRequest(requestUrl, []);
  const response = await fetchWithTimeout(requestUrl, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    signal,
  });

  return readEmergencyGuideResponse(response, requestUrl);
};
