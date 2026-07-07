import Config from 'react-native-config';
import * as Keychain from 'react-native-keychain';

import type {
  AuthRequest,
  LoginResponse,
  RegisterResponse,
} from '@/types/auth.types';

const AUTH_TOKEN_SERVICE = 'erags.auth.token';

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
  const baseUrl = (Config.API_BASE_URL ?? Config.Base_URL ?? '').replace(
    /\/+$/,
    '',
  );

  if (!baseUrl) {
    throw new Error('API_BASE_URL이 설정되지 않았습니다. .env를 확인하세요.');
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
  body: AuthRequest,
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
      `서버가 JSON이 아닌 응답을 반환했습니다. API 주소를 확인하세요. (${response.status}) ${requestUrl} ${responsePreview}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(
        parsedResponseBody.payload,
        `요청에 실패했습니다. (${response.status})`,
      ),
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
