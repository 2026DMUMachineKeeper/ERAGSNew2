import * as Keychain from 'react-native-keychain';

import { useAuthStore } from '@/store/authStore';

import {
  AuthSessionChangedError,
  AuthSessionExpiredError,
  clearAuthSession,
  login,
  logout,
  refreshAuthTokens,
  restoreAuthSession,
  saveAuthTokens,
  updateStoredAuthUser,
} from '@/services/auth.service';
import { ApiRequestError } from '@/services/apiError.service';

jest.mock('@/query', () => ({
  prefetchMedicines: jest.fn(),
  removeMedicineQueries: jest.fn(),
}));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('restoreAuthSession', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      service: 'erags.auth.token',
      storage: 'KeystoreAESGCM_NoAuth' as Keychain.STORAGE_TYPE,
      username: 'user@example.com',
      password: JSON.stringify({
        accessToken: 'header.eyJleHAiOjF9.signature',
        refreshToken: 'saved-refresh-token',
        user: { id: 1, email: 'user@example.com' },
      }),
    });
  });

  it('만료 토큰 갱신이 거부되면 저장 세션을 제거한다', async (): Promise<void> => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      service: 'erags.auth.token',
      storage: 'KeystoreAESGCM_NoAuth' as Keychain.STORAGE_TYPE,
      username: 'user@example.com',
      password: JSON.stringify({
        accessToken: 'header.eyJleHAiOjF9.signature',
        refreshToken: 'expired-refresh-token',
      }),
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async (): Promise<string> =>
        JSON.stringify({ message: 'refresh token expired' }),
    } as Response);

    await expect(restoreAuthSession()).rejects.toBeInstanceOf(
      AuthSessionExpiredError,
    );
    expect(Keychain.resetGenericPassword).toHaveBeenCalled();
  });

  it.each(['오프라인', '서버 오류', '응답 형식 오류'] as const)(
    '%s 시 저장된 세션으로 진입하고 다음 복원에서 토큰을 갱신한다',
    async (
      failureKind: '오프라인' | '서버 오류' | '응답 형식 오류',
    ): Promise<void> => {
      if (failureKind === '오프라인') {
        fetchMock.mockRejectedValueOnce(
          new TypeError('Network request failed'),
        );
      } else {
        fetchMock.mockResolvedValueOnce({
          ok: failureKind === '응답 형식 오류',
          status: failureKind === '서버 오류' ? 503 : 200,
          text: async (): Promise<string> =>
            failureKind === '서버 오류'
              ? JSON.stringify({ message: 'unavailable' })
              : '<html>invalid</html>',
        } as Response);
      }

      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(useAuthStore.getState().restoreSession()).resolves.toBe(
        true,
      );
      warn.mockRestore();
      expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(useAuthStore.getState()).toMatchObject({
        isAuthenticated: true,
        user: { id: 1, email: 'user@example.com' },
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async (): Promise<string> =>
          JSON.stringify({
            access_token: 'renewed-access-token',
            refresh_token: 'renewed-refresh-token',
            expires_in: 3600,
          }),
      } as Response);
      await expect(useAuthStore.getState().restoreSession()).resolves.toBe(
        true,
      );
      expect(fetchMock.mock.calls[1][1].body).toBe(
        JSON.stringify({ refresh_token: 'saved-refresh-token' }),
      );
      expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState()).toMatchObject({
        isAuthenticated: true,
        user: { id: 1, email: 'user@example.com' },
      });
    },
  );

  it('저장소 읽기 실패는 토큰 갱신이나 삭제로 처리하지 않는다', async (): Promise<void> => {
    const storageError = new Error('저장소 접근 실패');
    jest
      .mocked(Keychain.getGenericPassword)
      .mockRejectedValueOnce(storageError);
    await expect(restoreAuthSession()).rejects.toBe(storageError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  it('동시에 시작한 토큰 갱신 요청은 서버 요청 하나를 공유한다', async (): Promise<void> => {
    let resolveRefresh: (response: Response) => void = (): void => {};
    fetchMock.mockImplementationOnce(
      (): Promise<Response> =>
        new Promise<Response>((resolve): void => {
          resolveRefresh = resolve;
        }),
    );

    const firstRefresh = refreshAuthTokens();
    const secondRefresh = refreshAuthTokens();

    expect(firstRefresh).toBe(secondRefresh);
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRefresh({
      ok: true,
      status: 200,
      text: async (): Promise<string> =>
        JSON.stringify({
          access_token: 'renewed-access-token',
          refresh_token: 'renewed-refresh-token',
          expires_in: 3600,
        }),
    } as Response);

    await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual([
      expect.objectContaining({ accessToken: 'renewed-access-token' }),
      expect.objectContaining({ accessToken: 'renewed-access-token' }),
    ]);
    expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(1);
  });
});

describe('인증 API 오류', () => {
  it('표준 오류의 상태, 코드, 메시지와 상세를 보존한다', async (): Promise<void> => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async (): Promise<string> =>
        JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'invalid email',
            details: ['email'],
          },
        }),
    } as Response);

    const error = await login({ email: 'invalid', password: 'password' }).catch(
      (requestError: unknown): unknown => requestError,
    );

    expect(error).toMatchObject<Partial<ApiRequestError>>({
      status: 400,
      code: 'INVALID_REQUEST',
      message: 'invalid email',
      details: ['email'],
    });
  });
});

describe('토큰 갱신과 세션 변경 경쟁', () => {
  let storedCredentials: { username: string; password: string } | null;

  const readStoredTokens = (): Record<string, unknown> =>
    JSON.parse(storedCredentials?.password ?? '{}');

  // 갱신 서버 응답을 테스트에서 원하는 시점에 돌려주도록 대기시킵니다.
  const holdRefreshResponse = (): ((refreshToken: string) => void) => {
    let resolveRefresh: (response: Response) => void = (): void => {};
    fetchMock.mockImplementationOnce(
      (): Promise<Response> =>
        new Promise<Response>((resolve): void => {
          resolveRefresh = resolve;
        }),
    );
    return (refreshToken: string): void =>
      resolveRefresh({
        ok: true,
        status: 200,
        text: async (): Promise<string> =>
          JSON.stringify({
            access_token: 'renewed-access-token',
            refresh_token: refreshToken,
            expires_in: 3600,
          }),
      } as Response);
  };

  const waitForRefreshRequest = (): Promise<void> =>
    new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });

  beforeEach((): void => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    storedCredentials = {
      username: 'user@example.com',
      password: JSON.stringify({
        accessToken: 'header.eyJleHAiOjF9.signature',
        refreshToken: 'saved-refresh-token',
        user: { id: 1, email: 'user@example.com', name: '이전 이름' },
      }),
    };
    jest.mocked(Keychain.getGenericPassword).mockImplementation(async () =>
      storedCredentials
        ? {
            ...storedCredentials,
            service: 'erags.auth.token',
            storage: 'KeystoreAESGCM_NoAuth' as Keychain.STORAGE_TYPE,
          }
        : false,
    );
    jest
      .mocked(Keychain.setGenericPassword)
      .mockImplementation(async (username: string, password: string) => {
        storedCredentials = { username, password };
        return false;
      });
    jest.mocked(Keychain.resetGenericPassword).mockImplementation(async () => {
      storedCredentials = null;
      return true;
    });
  });

  it('갱신 중 로그아웃하면 늦게 도착한 새 토큰을 다시 저장하지 않는다', async (): Promise<void> => {
    const respondRefresh = holdRefreshResponse();
    const refresh = refreshAuthTokens();
    await waitForRefreshRequest();

    await clearAuthSession();
    respondRefresh('renewed-refresh-token');

    await expect(refresh).rejects.toBeInstanceOf(AuthSessionChangedError);
    expect(storedCredentials).toBeNull();
  });

  it('갱신 중 다른 계정으로 로그인하면 새 계정 토큰을 덮어쓰지 않는다', async (): Promise<void> => {
    const respondRefresh = holdRefreshResponse();
    const refresh = refreshAuthTokens();
    await waitForRefreshRequest();

    await saveAuthTokens('other@example.com', {
      accessToken: 'other-access-token',
      refreshToken: 'other-refresh-token',
    });
    respondRefresh('renewed-refresh-token');

    await expect(refresh).rejects.toBeInstanceOf(AuthSessionChangedError);
    expect(storedCredentials?.username).toBe('other@example.com');
    expect(readStoredTokens()).toMatchObject({
      accessToken: 'other-access-token',
    });
  });

  it('갱신 중 프로필을 저장해도 새 토큰과 새 프로필을 모두 유지한다', async (): Promise<void> => {
    const respondRefresh = holdRefreshResponse();
    const refresh = refreshAuthTokens();
    await waitForRefreshRequest();

    await updateStoredAuthUser({ name: '새 이름' });
    respondRefresh('renewed-refresh-token');
    await refresh;

    expect(readStoredTokens()).toMatchObject({
      accessToken: 'renewed-access-token',
      refreshToken: 'renewed-refresh-token',
      user: { id: 1, name: '새 이름' },
    });
  });

  it('로그아웃은 진행 중인 갱신을 기다린 뒤 최신 refresh 토큰을 폐기한다', async (): Promise<void> => {
    const respondRefresh = holdRefreshResponse();
    const refresh = refreshAuthTokens();
    await waitForRefreshRequest();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async (): Promise<string> => JSON.stringify({ success: true }),
    } as Response);

    const logoutRequest = logout();
    respondRefresh('renewed-refresh-token');
    await refresh;
    await logoutRequest;

    const logoutBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(logoutBody).toEqual({ refresh_token: 'renewed-refresh-token' });
    expect(storedCredentials).toBeNull();
  });
});
