import Config from 'react-native-config';

const DEFAULT_API_REQUEST_TIMEOUT_MS = 10_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super(
      '요청 시간이 초과되었습니다. 네트워크 상태를 확인한 후 다시 시도해 주세요.',
    );
    this.name = 'RequestTimeoutError';
  }
}

export const fetchWithTimeout = async (
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  let isCallerAborted = false;
  let isTimedOut = false;
  const handleCallerAbort = (): void => {
    isCallerAborted = true;
    controller.abort();
  };
  const timeoutId = setTimeout((): void => {
    if (isCallerAborted) {
      return;
    }

    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  if (init.signal?.aborted) {
    handleCallerAbort();
  } else {
    init.signal?.addEventListener('abort', handleCallerAbort, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error: unknown) {
    if (isTimedOut) {
      throw new RequestTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', handleCallerAbort);
  }
};

export class AuthSessionExpiredError extends Error {
  constructor() {
    super('');
    this.name = 'AuthSessionExpiredError';
  }
}

export interface AuthenticatedFetchParams {
  getAccessToken: () => Promise<string>;
  init?: RequestInit;
  isAccessTokenExpiredError: (error: unknown) => boolean;
  path: string;
  refreshAccessToken: () => Promise<string>;
  timeoutMs?: number;
}

export const getApiBaseUrl = (): string => {
  const baseUrl = (Config.API_BASE_URL ?? Config.Base_URL ?? '').replace(
    /\/+$/,
    '',
  );

  if (!baseUrl) {
    throw new Error('API_BASE_URL이 설정되지 않았습니다. .env를 확인하세요.');
  }

  return baseUrl;
};

export const authenticatedFetch = async ({
  getAccessToken,
  init = {},
  isAccessTokenExpiredError,
  path,
  refreshAccessToken,
  timeoutMs,
}: AuthenticatedFetchParams): Promise<Response> => {
  const request = async (accessToken?: string): Promise<Response> => {
    const token = accessToken ?? (await getAccessToken());

    return fetchWithTimeout(
      `${getApiBaseUrl()}${path}`,
      {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${token}`,
        },
      },
      timeoutMs,
    );
  };

  const requestWithRefreshedToken = async (): Promise<Response> => {
    const retryResponse = await request(await refreshAccessToken());

    if (retryResponse.status === 401) {
      throw new AuthSessionExpiredError();
    }

    return retryResponse;
  };

  let response: Response;

  try {
    response = await request();
  } catch (error: unknown) {
    if (!isAccessTokenExpiredError(error)) {
      throw error;
    }

    return requestWithRefreshedToken();
  }

  if (response.status !== 401) {
    return response;
  }

  return requestWithRefreshedToken();
};
