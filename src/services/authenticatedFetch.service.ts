import Config from 'react-native-config';

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
}: AuthenticatedFetchParams): Promise<Response> => {
  const request = async (accessToken?: string): Promise<Response> => {
    const token = accessToken ?? (await getAccessToken());

    return fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      },
    });
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
