import Config from 'react-native-config';
import * as Keychain from 'react-native-keychain';

import type {
  AuthRequest,
  LoginResponse,
  RegisterResponse,
} from '@/types/auth.types';

const AUTH_TOKEN_SERVICE = 'erags.auth.token';

type AuthErrorCode =
  | 'CONFIG_MISSING'
  | 'NETWORK_FAILED'
  | 'INVALID_RESPONSE'
  | 'INVALID_CREDENTIALS'
  | 'DUPLICATE_EMAIL'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'SERVER_UNAVAILABLE'
  | 'REQUEST_FAILED';

class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AuthErrorCode,
    public readonly isUserFacing = false,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

interface ErrorResponseBody {
  success?: boolean;
  message?: string;
}

interface ParsedResponseBody {
  payload: unknown;
  rawText: string;
  isJson: boolean;
}

const getAuthBaseUrl = (): string => {
  const baseUrl = (
    Config.API_BASE_URL ??
    Config.Base_URL ??
    Config.BaseURL ??
    ''
  ).replace(/\/+$/, '');

  if (!baseUrl) {
    throw new AuthServiceError(
      'API_BASE_URL이 설정되지 않았습니다. .env를 확인하세요.',
      'CONFIG_MISSING',
    );
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

const getAuthErrorCode = (
  responseStatus: number,
  payload: unknown,
): AuthErrorCode => {
  const serverMessage = getUserFacingServerMessage(payload)?.toLowerCase() ?? '';

  if (
    responseStatus === 401 ||
    responseStatus === 403 ||
    serverMessage.includes('password') ||
    serverMessage.includes('비밀번호') ||
    serverMessage.includes('credentials') ||
    serverMessage.includes('인증')
  ) {
    return 'INVALID_CREDENTIALS';
  }

  if (
    responseStatus === 409 ||
    serverMessage.includes('already') ||
    serverMessage.includes('duplicate') ||
    serverMessage.includes('exists') ||
    serverMessage.includes('중복') ||
    serverMessage.includes('이미')
  ) {
    return 'DUPLICATE_EMAIL';
  }

  if (responseStatus === 400 || responseStatus === 422) {
    return 'VALIDATION_FAILED';
  }

  if (responseStatus === 429) {
    return 'RATE_LIMITED';
  }

  if (responseStatus >= 500) {
    return 'SERVER_UNAVAILABLE';
  }

  return 'REQUEST_FAILED';
};

const fetchAuthRequest = async (
  requestUrl: string,
  body: AuthRequest,
): Promise<Response> => {
  try {
    return await fetch(requestUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new AuthServiceError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_FAILED',
    );
  }
};

const postAuthRequest = async <TResponse>(
  path: string,
  body: AuthRequest,
): Promise<TResponse> => {
  const requestUrl = `${getAuthBaseUrl()}${path}`;
  const response = await fetchAuthRequest(requestUrl, body);
  const parsedResponseBody = await parseResponseBody(response);

  if (!parsedResponseBody.isJson) {
    const responsePreview = parsedResponseBody.rawText.trim().slice(0, 80);

    throw new AuthServiceError(
      `서버가 JSON이 아닌 응답을 반환했습니다. API 주소를 확인하세요. (${response.status}) ${requestUrl} ${responsePreview}`,
      'INVALID_RESPONSE',
    );
  }

  if (!response.ok) {
    const serverMessage = getUserFacingServerMessage(parsedResponseBody.payload);
    const errorCode = getAuthErrorCode(response.status, parsedResponseBody.payload);

    throw new AuthServiceError(
      serverMessage ?? `요청에 실패했습니다. (${response.status})`,
      errorCode,
      serverMessage !== null,
    );
  }

  return parsedResponseBody.payload as TResponse;
};

export const register = async (
  authRequest: AuthRequest,
): Promise<RegisterResponse> => {
  return postAuthRequest<RegisterResponse>('/api/auth/register', authRequest);
};

export const login = async (
  authRequest: AuthRequest,
): Promise<LoginResponse> => {
  return postAuthRequest<LoginResponse>('/api/auth/login', authRequest);
};

export const saveAuthToken = async (
  email: string,
  token: string,
): Promise<void> => {
  await Keychain.setGenericPassword(email, token, {
    service: AUTH_TOKEN_SERVICE,
  });
};

export const getVisibleAuthErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof AuthServiceError) {
    switch (error.code) {
      case 'NETWORK_FAILED':
        return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
      case 'INVALID_CREDENTIALS':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'DUPLICATE_EMAIL':
        return '이미 가입된 이메일입니다.';
      case 'VALIDATION_FAILED':
        return '입력한 정보를 다시 확인해주세요.';
      case 'RATE_LIMITED':
        return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
      case 'SERVER_UNAVAILABLE':
        return '서버가 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
      case 'CONFIG_MISSING':
      case 'INVALID_RESPONSE':
      case 'REQUEST_FAILED':
        return fallbackMessage;
      default:
        return fallbackMessage;
    }
  }

  return fallbackMessage;
};

const getUserFacingServerMessage = (payload: unknown): string | null => {
  if (
    isErrorResponseBody(payload) &&
    typeof payload.message === 'string' &&
    payload.message.trim().length > 0
  ) {
    return payload.message;
  }

  return null;
};
