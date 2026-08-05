import Config from 'react-native-config';
import * as Keychain from 'react-native-keychain';

import type {
  AuthRequest,
  AuthUser,
  LoginResponse,
  LogoutResponse,
  MyPageProfile,
  MyPageResponse,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenResponse,
} from '@/types/auth.types';

declare const atob: (encodedData: string) => string;

const AUTH_TOKEN_SERVICE = 'erags.auth.token';
const AUTH_SESSION_EXPIRED_MESSAGE = '';

export class AuthSessionExpiredError extends Error {
  constructor(message = AUTH_SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = 'AuthSessionExpiredError';
  }
}

export class AuthTokenExpiredError extends Error {
  constructor(message = AUTH_SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = 'AuthTokenExpiredError';
  }
}

class AuthRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

export const isAuthSessionExpiredError = (
  error: unknown,
): error is AuthSessionExpiredError => {
  return (
    error instanceof AuthSessionExpiredError ||
    (error instanceof Error && error.name === 'AuthSessionExpiredError')
  );
};

export const isAuthTokenExpiredError = (
  error: unknown,
): error is AuthTokenExpiredError => {
  return (
    error instanceof AuthTokenExpiredError ||
    (error instanceof Error && error.name === 'AuthTokenExpiredError')
  );
};

export type StoredAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user?: AuthUser;
};

interface ErrorResponseBody {
  success?: boolean;
  message?: string;
}

interface ParsedResponseBody {
  payload: unknown;
  rawText: string;
  isJson: boolean;
}

type AuthTokenPayload = {
  access_token?: unknown;
  accessToken?: unknown;
  access?: unknown;
  token?: unknown;
  jwt?: unknown;
  refresh_token?: unknown;
  refreshToken?: unknown;
  refresh?: unknown;
  expires_in?: unknown;
  expiresIn?: unknown;
  user?: unknown;
  data?: unknown;
  tokens?: unknown;
};

type AuthTokenResponse = LoginResponse | RefreshTokenResponse;

const getAuthBaseUrl = (): string => {
  const baseUrl = (Config.API_BASE_URL ?? Config.Base_URL ?? '').replace(
    /\/+$/,
    '',
  );

  if (!baseUrl) {
    throw new Error('API_BASE_URL is not configured. Please check .env.');
  }

  return baseUrl;
};

const parseResponseBody = async (
  response: Response,
): Promise<ParsedResponseBody> => {
  const text = await response.text();

  if (text.trim().length === 0) {
    return {
      payload: null,
      rawText: '',
      isJson: true,
    };
  }

  try {
    return {
      payload: JSON.parse(text) as unknown,
      rawText: text,
      isJson: true,
    };
  } catch {
    return {
      payload: null,
      rawText: text,
      isJson: false,
    };
  }
};

const isErrorResponseBody = (
  payload: unknown,
): payload is ErrorResponseBody => {
  return payload !== null && typeof payload === 'object';
};

const isRecord = (payload: unknown): payload is Record<string, unknown> => {
  return payload !== null && typeof payload === 'object';
};

const getObjectKeys = (payload: unknown): string[] => {
  return isRecord(payload) ? Object.keys(payload) : [];
};

const getErrorMessage = (payload: unknown, fallbackMessage: string): string => {
  if (
    isErrorResponseBody(payload) &&
    typeof payload.message === 'string' &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }

  return fallbackMessage;
};

const postAuthRequest = async <TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> => {
  const requestUrl = `${getAuthBaseUrl()}${path}`;
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const parsedResponseBody = await parseResponseBody(response);

  if (!parsedResponseBody.isJson) {
    const responsePreview = parsedResponseBody.rawText.trim().slice(0, 80);

    throw new Error(
      `Server returned a non-JSON response. (${response.status}) ${requestUrl} ${responsePreview}`,
    );
  }

  if (!response.ok) {
    throw new AuthRequestError(
      getErrorMessage(
        parsedResponseBody.payload,
        `Request failed. (${response.status})`,
      ),
      response.status,
    );
  }

  return parsedResponseBody.payload as TResponse;
};

export const register = async (
  authRequest: AuthRequest,
): Promise<RegisterResponse> => {
  return postAuthRequest<RegisterResponse>('/api/auth/register', authRequest);
};

export const resetPassword = async (
  resetPasswordRequest: ResetPasswordRequest,
): Promise<ResetPasswordResponse> => {
  return postAuthRequest<ResetPasswordResponse>(
    '/api/auth/reset-password',
    resetPasswordRequest,
  );
};

export const login = async (
  authRequest: AuthRequest,
): Promise<LoginResponse> => {
  const response = await postAuthRequest<unknown>(
    '/api/auth/login',
    authRequest,
  );

  return normalizeAuthTokenResponse(
    response,
    authRequest.email,
  ) as LoginResponse;
};

export const saveAuthTokens = async (
  email: string,
  tokens: StoredAuthTokens,
): Promise<void> => {
  await Keychain.setGenericPassword(email, JSON.stringify(tokens), {
    service: AUTH_TOKEN_SERVICE,
  });
};

export const saveAuthToken = async (
  email: string,
  token: string,
): Promise<void> => {
  await saveAuthTokens(email, {
    accessToken: token,
    refreshToken: '',
  });
};

const getStoredAuthUserFromPayload = (
  userPayload: unknown,
  fallbackEmail: string,
): AuthUser | undefined => {
  if (!isRecord(userPayload)) {
    return undefined;
  }

  const id =
    typeof userPayload.id === 'number' && Number.isFinite(userPayload.id)
      ? userPayload.id
      : 0;
  const email =
    typeof userPayload.email === 'string' && userPayload.email.trim().length > 0
      ? userPayload.email
      : fallbackEmail;
  const name =
    typeof userPayload.name === 'string' && userPayload.name.trim().length > 0
      ? userPayload.name
      : undefined;
  const guardianPhone =
    typeof userPayload.guardian_phone === 'string' &&
    userPayload.guardian_phone.trim().length > 0
      ? userPayload.guardian_phone
      : undefined;

  return {
    id,
    email,
    ...(name ? { name } : {}),
    ...(guardianPhone ? { guardian_phone: guardianPhone } : {}),
  };
};

const readStoredAuthTokens = async (): Promise<{
  email: string;
  tokens: StoredAuthTokens;
}> => {
  const credentials = await Keychain.getGenericPassword({
    service: AUTH_TOKEN_SERVICE,
  });

  if (!credentials) {
    console.warn('[auth.service] auth token missing');
    throw new AuthSessionExpiredError();
  }

  if (credentials.password.trim().length === 0) {
    console.warn('[auth.service] auth token empty');
    throw new AuthSessionExpiredError();
  }

  try {
    const parsedTokens = JSON.parse(
      credentials.password,
    ) as Partial<StoredAuthTokens> & {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
      user?: unknown;
    };

    const accessToken =
      typeof parsedTokens.accessToken === 'string'
        ? parsedTokens.accessToken
        : typeof parsedTokens.access_token === 'string'
        ? parsedTokens.access_token
        : '';

    if (accessToken.trim().length > 0) {
      const user = getStoredAuthUserFromPayload(
        parsedTokens.user,
        credentials.username,
      );

      return {
        email: credentials.username,
        tokens: {
          accessToken,
          refreshToken:
            typeof parsedTokens.refreshToken === 'string'
              ? parsedTokens.refreshToken
              : typeof parsedTokens.refresh_token === 'string'
              ? parsedTokens.refresh_token
              : '',
          expiresIn:
            typeof parsedTokens.expiresIn === 'number'
              ? parsedTokens.expiresIn
              : typeof parsedTokens.expires_in === 'number'
              ? parsedTokens.expires_in
              : undefined,
          ...(user ? { user } : {}),
        },
      };
    }
  } catch {
    return {
      email: credentials.username,
      tokens: {
        accessToken: credentials.password,
        refreshToken: '',
      },
    };
  }

  throw new AuthSessionExpiredError();
};

export const getStoredAuthUser = async (): Promise<AuthUser | undefined> => {
  const { email, tokens } = await readStoredAuthTokens();

  return tokens.user ?? { id: 0, email };
};

export const updateStoredAuthUser = async (
  nextProfile: Pick<AuthUser, 'name' | 'guardian_phone'>,
): Promise<AuthUser> => {
  const { email, tokens } = await readStoredAuthTokens();
  const currentUser = tokens.user ?? { id: 0, email };
  const nextName = nextProfile.name?.trim();
  const nextGuardianPhone = nextProfile.guardian_phone?.trim();
  const nextUser: AuthUser = {
    id: currentUser.id,
    email: currentUser.email || email,
    ...(nextName ? { name: nextName } : {}),
    ...(nextGuardianPhone ? { guardian_phone: nextGuardianPhone } : {}),
  };

  await saveAuthTokens(email, {
    ...tokens,
    user: nextUser,
  });

  return nextUser;
};

const getJwtExpiration = (token: string): number | undefined => {
  const tokenParts = token.split('.');

  // 이전 서버에서 발급한 비 JWT 토큰도 읽을 수 있도록 JWT 형식일 때만 exp를 검사합니다.
  if (tokenParts.length !== 3) {
    return undefined;
  }

  try {
    const base64Payload = tokenParts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, '=');
    const payload = JSON.parse(atob(base64Payload)) as unknown;

    if (
      payload !== null &&
      typeof payload === 'object' &&
      'exp' in payload &&
      typeof payload.exp === 'number'
    ) {
      return payload.exp;
    }
  } catch {
    throw new AuthTokenExpiredError();
  }

  throw new AuthTokenExpiredError();
};

export const getAuthToken = async (): Promise<string> => {
  const { tokens } = await readStoredAuthTokens();
  const expiration = getJwtExpiration(tokens.accessToken);

  if (expiration !== undefined && Date.now() >= expiration * 1000) {
    throw new AuthTokenExpiredError();
  }

  return tokens.accessToken;
};

const authenticatedAuthGet = async (path: string): Promise<Response> => {
  const request = async (accessToken?: string): Promise<Response> => {
    const token = accessToken ?? (await getAuthToken());

    return fetch(`${getAuthBaseUrl()}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  };

  let response: Response;

  try {
    response = await request();
  } catch (error) {
    if (isAuthTokenExpiredError(error)) {
      const refreshedTokens = await refreshAuthTokens();
      return request(refreshedTokens.accessToken);
    }

    throw error;
  }

  if (response.status !== 401) {
    return response;
  }

  const refreshedTokens = await refreshAuthTokens();

  return request(refreshedTokens.accessToken);
};

const authenticatedAuthPut = async (
  path: string,
  body: unknown,
): Promise<Response> => {
  const request = async (accessToken?: string): Promise<Response> => {
    const token = accessToken ?? (await getAuthToken());

    return fetch(`${getAuthBaseUrl()}${path}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  };

  let response: Response;

  try {
    response = await request();
  } catch (error) {
    if (isAuthTokenExpiredError(error)) {
      const refreshedTokens = await refreshAuthTokens();
      return request(refreshedTokens.accessToken);
    }

    throw error;
  }

  if (response.status !== 401) {
    return response;
  }

  const refreshedTokens = await refreshAuthTokens();

  return request(refreshedTokens.accessToken);
};

export const getMyPage = async (userId: number): Promise<MyPageProfile> => {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('로그인 사용자 ID를 확인할 수 없습니다.');
  }

  const response = await authenticatedAuthGet(
    `/api/auth/mypage/${encodeURIComponent(String(userId))}`,
  );

  if (response.status === 401 || response.status === 403) {
    await clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  const parsedResponseBody = await parseResponseBody(response);

  if (!parsedResponseBody.isJson) {
    throw new Error(
      `마이페이지 응답을 확인할 수 없습니다. (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new AuthRequestError(
      getErrorMessage(
        parsedResponseBody.payload,
        `마이페이지 조회에 실패했습니다. (${response.status})`,
      ),
      response.status,
    );
  }

  if (!isRecord(parsedResponseBody.payload)) {
    throw new Error('마이페이지 응답 형식이 올바르지 않습니다.');
  }

  const myPageResponse =
    parsedResponseBody.payload as unknown as MyPageResponse;

  if (
    myPageResponse.success !== true ||
    !isRecord(myPageResponse.data) ||
    typeof myPageResponse.data.name !== 'string' ||
    (typeof myPageResponse.data.guardian_phone !== 'string' &&
      myPageResponse.data.guardian_phone !== null)
  ) {
    throw new Error('마이페이지 응답 형식이 올바르지 않습니다.');
  }

  return {
    name: myPageResponse.data.name,
    guardian_phone: myPageResponse.data.guardian_phone ?? '',
  };
};

export const updateMyPage = async (
  userId: number,
  profile: MyPageProfile,
): Promise<MyPageProfile> => {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('로그인 사용자 ID를 확인할 수 없습니다.');
  }

  const response = await authenticatedAuthPut(
    `/api/auth/mypage/${encodeURIComponent(String(userId))}`,
    {
      name: profile.name.trim(),
      guardian_phone: profile.guardian_phone.trim(),
    },
  );

  if (response.status === 401 || response.status === 403) {
    await clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  const parsedResponseBody = await parseResponseBody(response);

  if (!parsedResponseBody.isJson) {
    throw new Error(
      `마이페이지 수정 응답을 확인할 수 없습니다. (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new AuthRequestError(
      getErrorMessage(
        parsedResponseBody.payload,
        `마이페이지 수정에 실패했습니다. (${response.status})`,
      ),
      response.status,
    );
  }

  if (!isRecord(parsedResponseBody.payload)) {
    throw new Error('마이페이지 수정 응답 형식이 올바르지 않습니다.');
  }

  const myPageResponse =
    parsedResponseBody.payload as unknown as MyPageResponse;

  if (
    myPageResponse.success !== true ||
    !isRecord(myPageResponse.data) ||
    typeof myPageResponse.data.name !== 'string' ||
    (typeof myPageResponse.data.guardian_phone !== 'string' &&
      myPageResponse.data.guardian_phone !== null)
  ) {
    throw new Error('마이페이지 수정 응답 형식이 올바르지 않습니다.');
  }

  return {
    name: myPageResponse.data.name,
    guardian_phone: myPageResponse.data.guardian_phone ?? '',
  };
};

const findNestedRecord = (
  payload: unknown,
  keys: string[],
): Record<string, unknown> | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  for (const key of keys) {
    if (isRecord(payload[key])) {
      return payload[key];
    }
  }

  return undefined;
};

const getStringField = (
  payload: Record<string, unknown>,
  keys: string[],
): string => {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return '';
};

const getNumberField = (
  payload: Record<string, unknown>,
  keys: string[],
): number => {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

const findTokenPayload = (response: unknown): AuthTokenPayload => {
  if (!isRecord(response)) {
    throw new Error('로그인 응답을 확인할 수 없습니다.');
  }

  const queue: Record<string, unknown>[] = [response];
  const visited = new Set<Record<string, unknown>>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);

    const hasAccessToken =
      getStringField(current, [
        'access_token',
        'accessToken',
        'access',
        'token',
        'jwt',
      ]).length > 0;

    if (hasAccessToken) {
      return current as AuthTokenPayload;
    }

    for (const key of ['data', 'payload', 'result', 'body', 'tokens']) {
      const next = current[key];

      if (isRecord(next)) {
        queue.push(next);
      }
    }
  }

  console.warn('[auth.service] login token fields not found', {
    rootKeys: getObjectKeys(response),
    nestedKeys: getObjectKeys(
      findNestedRecord(response, [
        'data',
        'payload',
        'result',
        'body',
        'tokens',
      ]),
    ),
  });

  throw new Error('로그인 응답에서 인증 토큰을 찾을 수 없습니다.');
};

const normalizeAuthTokenResponse = (
  response: unknown,
  fallbackEmail?: string,
): AuthTokenResponse => {
  const tokenPayload = findTokenPayload(response);
  const root = isRecord(response) ? response : {};
  const payload = isRecord(root.data)
    ? (root.data as AuthTokenPayload)
    : (root as AuthTokenPayload);
  const accessToken = getStringField(tokenPayload, [
    'access_token',
    'accessToken',
    'access',
    'token',
    'jwt',
  ]);
  const refreshToken = getStringField(tokenPayload, [
    'refresh_token',
    'refreshToken',
    'refresh',
  ]);
  const expiresIn = getNumberField(tokenPayload, ['expires_in', 'expiresIn']);
  const userPayload = payload.user ?? root.user;

  const user: AuthUser | undefined =
    fallbackEmail === undefined
      ? undefined
      : {
          id:
            isRecord(userPayload) && typeof userPayload.id === 'number'
              ? userPayload.id
              : 0,
          email:
            isRecord(userPayload) && typeof userPayload.email === 'string'
              ? userPayload.email
              : fallbackEmail,
          name:
            isRecord(userPayload) && typeof userPayload.name === 'string'
              ? userPayload.name
              : undefined,
          guardian_phone:
            isRecord(userPayload) &&
            typeof userPayload.guardian_phone === 'string'
              ? userPayload.guardian_phone
              : undefined,
        };

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    ...(user ? { user } : {}),
  } as AuthTokenResponse;
};

export const refreshAuthTokens = async (): Promise<StoredAuthTokens> => {
  const { email, tokens } = await readStoredAuthTokens();

  if (tokens.refreshToken.trim().length === 0) {
    await clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  let refreshResponse: AuthTokenResponse;

  try {
    refreshResponse = normalizeAuthTokenResponse(
      await postAuthRequest<unknown>('/api/auth/refresh', {
        refresh_token: tokens.refreshToken,
      }),
    );
  } catch (error) {
    if (
      error instanceof AuthRequestError &&
      (error.status === 401 || error.status === 403)
    ) {
      await clearAuthSession();
      throw new AuthSessionExpiredError();
    }

    throw error;
  }

  const nextTokens: StoredAuthTokens = {
    accessToken: refreshResponse.access_token,
    refreshToken: refreshResponse.refresh_token,
    expiresIn: refreshResponse.expires_in,
    ...(tokens.user ? { user: tokens.user } : {}),
  };

  await saveAuthTokens(email, nextTokens);

  return nextTokens;
};

export const restoreAuthSession = async (): Promise<string> => {
  try {
    return await getAuthToken();
  } catch (error) {
    if (isAuthSessionExpiredError(error)) {
      await clearAuthSession();
      throw error;
    }

    try {
      const tokens = await refreshAuthTokens();
      return tokens.accessToken;
    } catch (refreshError: unknown) {
      // 복원할 수 없는 인증 정보가 남아 있으면 다음 실행에서도 홈 진입을 시도하므로 제거합니다.
      await clearAuthSession();
      throw refreshError;
    }
  }
};

export const clearAuthSession = async (): Promise<void> => {
  await Keychain.resetGenericPassword({
    service: AUTH_TOKEN_SERVICE,
  });
};

export const logout = async (): Promise<LogoutResponse> => {
  const { tokens } = await readStoredAuthTokens();

  if (tokens.refreshToken.trim().length === 0) {
    await clearAuthSession();
    throw new AuthSessionExpiredError();
  }

  try {
    return await postAuthRequest<LogoutResponse>('/api/auth/logout', {
      refresh_token: tokens.refreshToken,
    });
  } finally {
    await clearAuthSession();
  }
};
