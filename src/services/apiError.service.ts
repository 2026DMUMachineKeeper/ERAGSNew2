interface ApiFailureBody {
  code: string;
  details: readonly unknown[];
  message: string;
}

interface ApiErrorMessageOptions {
  codeMessages?: Readonly<Record<string, string>>;
  fallbackMessage: string;
  statusMessages?: Readonly<Record<number, string>>;
}

const DEFAULT_API_STATUS_MESSAGES: Readonly<Record<number, string>> = {
  400: '입력 내용을 확인한 후 다시 시도해 주세요.',
  404: '요청한 정보를 찾을 수 없습니다.',
  409: '현재 상태에서는 요청을 처리할 수 없습니다.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  500: '서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  502: '서버에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
  503: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
};

export class ApiRequestError extends Error {
  readonly code: string;
  readonly details: readonly unknown[];
  readonly status: number;

  constructor({ code, details, message }: ApiFailureBody, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

const isRecord = (payload: unknown): payload is Record<string, unknown> =>
  payload !== null && typeof payload === 'object';

export const createApiRequestError = (
  payload: unknown,
  status: number,
  fallbackMessage: string,
  fallbackCode = 'REQUEST_FAILED',
): ApiRequestError => {
  const rootPayload = isRecord(payload) ? payload : null;
  const errorPayload =
    isRecord(payload) && isRecord(payload.error) ? payload.error : null;
  const code =
    typeof errorPayload?.code === 'string' && errorPayload.code.trim()
      ? errorPayload.code
      : fallbackCode;
  const message =
    typeof errorPayload?.message === 'string' && errorPayload.message.trim()
      ? errorPayload.message
      : typeof rootPayload?.message === 'string' && rootPayload.message.trim()
      ? rootPayload.message
      : fallbackMessage;
  const details = Array.isArray(errorPayload?.details)
    ? errorPayload.details
    : [];

  return new ApiRequestError({ code, details, message }, status);
};

export const readApiRequestError = async (
  response: Response,
  fallbackMessage: string,
  fallbackCode = 'REQUEST_FAILED',
): Promise<ApiRequestError> => {
  let payload: unknown = null;

  try {
    const responseText = await response.text();
    payload = responseText.trim()
      ? (JSON.parse(responseText) as unknown)
      : null;
  } catch {
    return createApiRequestError(
      null,
      response.status,
      fallbackMessage,
      'INVALID_RESPONSE',
    );
  }

  return createApiRequestError(
    payload,
    response.status,
    fallbackMessage,
    fallbackCode,
  );
};

export const getApiErrorUserMessage = (
  error: unknown,
  {
    codeMessages = {},
    fallbackMessage,
    statusMessages = {},
  }: ApiErrorMessageOptions,
): string => {
  if (!(error instanceof ApiRequestError)) {
    return fallbackMessage;
  }

  return (
    codeMessages[error.code] ??
    statusMessages[error.status] ??
    DEFAULT_API_STATUS_MESSAGES[error.status] ??
    fallbackMessage
  );
};
