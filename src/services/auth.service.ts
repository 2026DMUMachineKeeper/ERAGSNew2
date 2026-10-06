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

import {
  AuthSessionExpiredError,
  authenticatedFetch,
  fetchWithTimeout,
  getApiBaseUrl,
} from './authenticatedFetch.service';
import { ApiRequestError, createApiRequestError } from './apiError.service';

declare const atob: (encodedData: string) => string;

const AUTH_TOKEN_SERVICE = 'erags.auth.token';
const AUTH_SESSION_EXPIRED_MESSAGE = '';

export { AuthSessionExpiredError };

export class AuthTokenExpiredError extends Error {
  constructor(message = AUTH_SESSION_EXPIRED_MESSAGE) {
    super(message);
    this.name = 'AuthTokenExpiredError';
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

// 토큰 갱신 중 로그아웃이나 다른 계정 로그인으로 세션이 바뀌었을 때 사용합니다.
// 새 세션을 지우지 않도록 세션 만료(AuthSessionExpiredError)와 구분합니다.
export class AuthSessionChangedError extends Error {
  constructor(message = '인증 세션이 변경되었습니다. 다시 시도해 주세요.') {
    super(message);
    this.name = 'AuthSessionChangedError';
  }
}

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

const getAuthBaseUrl = getApiBaseUrl;

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

const isRecord = (payload: unknown): payload is Record<string, unknown> => {
  return payload !== null && typeof payload === 'object';
};

const getObjectKeys = (payload: unknown): string[] => {
  return isRecord(payload) ? Object.keys(payload) : [];
};

const postAuthRequest = async <TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> => {
  const requestUrl = `${getAuthBaseUrl()}${path}`;
  const response = await fetchWithTimeout(requestUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const parsedResponseBody = await parseResponseBody(response);

  if (!parsedResponseBody.isJson) {
    throw createApiRequestError(
      null,
      response.status,
      '인증 서버 응답 형식이 올바르지 않습니다.',
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    throw createApiRequestError(
      parsedResponseBody.payload,
      response.status,
      '인증 요청에 실패했습니다.',
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

// 키체인 읽기-수정-쓰기 작업이 서로 끼어들어 최신 토큰을 덮어쓰지 않도록 순서대로 실행합니다.
let authStorageQueue: Promise<unknown> = Promise.resolve();

const runAuthStorageTask = <T>(task: () => Promise<T>): Promise<T> => {
  const result = authStorageQueue.then(task);
  authStorageQueue = result.catch((): void => undefined);
  return result;
};

// 로그인·로그아웃으로 세션이 바뀔 때마다 증가시켜, 이전 세션에서 시작한 토큰 갱신 결과를 버립니다.
let authSessionGeneration = 0;

const writeAuthTokens = async (
  email: string,
  tokens: StoredAuthTokens,
): Promise<void> => {
  await Keychain.setGenericPassword(email, JSON.stringify(tokens), {
    service: AUTH_TOKEN_SERVICE,
  });
};

// 새 세션을 저장합니다(로그인). 진행 중이던 이전 세션의 토큰 갱신 결과는 저장되지 않습니다.
export const saveAuthTokens = (
  email: string,
  tokens: StoredAuthTokens,
): Promise<void> => {
  authSessionGeneration += 1;
  return runAuthStorageTask(() => writeAuthTokens(email, tokens));
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

export const updateStoredAuthUser = (
  nextProfile: Pick<AuthUser, 'name' | 'guardian_phone'>,
): Promise<AuthUser> =>
  runAuthStorageTask(async (): Promise<AuthUser> => {
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

  await writeAuthTokens(email, {
    ...tokens,
    user: nextUser,
  });

  return nextUser;
  });

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
  return authenticatedFetch({
    getAccessToken: getAuthToken,
    init: {
      method: 'GET',
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
  });
};

const authenticatedAuthPut = async (
  path: string,
  body: unknown,
): Promise<Response> => {
  return authenticatedFetch({
    getAccessToken: getAuthToken,
    init: {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
  });
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
    throw createApiRequestError(
      null,
      response.status,
      '마이페이지 응답 형식이 올바르지 않습니다.',
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    throw createApiRequestError(
      parsedResponseBody.payload,
      response.status,
      '마이페이지 조회에 실패했습니다.',
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
    throw createApiRequestError(
      null,
      response.status,
      '마이페이지 수정 응답 형식이 올바르지 않습니다.',
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    throw createApiRequestError(
      parsedResponseBody.payload,
      response.status,
      '마이페이지 수정에 실패했습니다.',
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

const requestRefreshedAuthTokens = async (): Promise<StoredAuthTokens> => {
  const generation = authSessionGeneration;
  const { tokens } = await readStoredAuthTokens();

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
      error instanceof ApiRequestError &&
      (error.status === 401 || error.status === 403)
    ) {
      // 갱신 중에 다른 계정으로 로그인했다면 새 세션을 지우지 않습니다.
      if (generation !== authSessionGeneration) {
        throw new AuthSessionChangedError();
      }
      await clearAuthSession();
      throw new AuthSessionExpiredError();
    }

    throw error;
  }

  return runAuthStorageTask(async (): Promise<StoredAuthTokens> => {
    // 갱신 중에 로그아웃했거나 다른 계정으로 로그인했다면 이전 세션의 토큰을 되살리지 않습니다.
    if (generation !== authSessionGeneration) {
      throw new AuthSessionChangedError();
    }

    // 갱신 중에 저장된 사용자 정보(프로필 수정 등)를 잃지 않도록 최신 값을 다시 읽습니다.
    const { email, tokens: latestTokens } = await readStoredAuthTokens();
    const nextTokens: StoredAuthTokens = {
      accessToken: refreshResponse.access_token,
      refreshToken: refreshResponse.refresh_token,
      expiresIn: refreshResponse.expires_in,
      ...(latestTokens.user ? { user: latestTokens.user } : {}),
    };

    await writeAuthTokens(email, nextTokens);

    return nextTokens;
  });
};

let refreshAuthTokensPromise: Promise<StoredAuthTokens> | null = null;

export const refreshAuthTokens = (): Promise<StoredAuthTokens> => {
  if (refreshAuthTokensPromise) {
    return refreshAuthTokensPromise;
  }

  refreshAuthTokensPromise = requestRefreshedAuthTokens().finally((): void => {
    refreshAuthTokensPromise = null;
  });

  return refreshAuthTokensPromise;
};

export const restoreAuthSession = async (): Promise<string> => {
  try {
    return await getAuthToken();
  } catch (error) {
    if (isAuthSessionExpiredError(error)) {
      await clearAuthSession();
      throw error;
    }

    if (!isAuthTokenExpiredError(error)) {
      throw error;
    }

    // 일시적인 통신 실패에서는 다음 복원을 위해 저장된 인증 정보를 유지합니다.
    const tokens = await refreshAuthTokens();
    return tokens.accessToken;
  }
};

export const clearAuthSession = (): Promise<void> => {
  authSessionGeneration += 1;
  return runAuthStorageTask(async (): Promise<void> => {
    await Keychain.resetGenericPassword({
      service: AUTH_TOKEN_SERVICE,
    });
  });
};

export const logout = async (): Promise<LogoutResponse> => {
  // 진행 중인 토큰 갱신이 끝난 뒤의 최신 refresh 토큰을 보내야 서버에서 폐기됩니다.
  await refreshAuthTokensPromise?.catch((): void => undefined);
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
