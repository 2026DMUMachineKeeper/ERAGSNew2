import * as Keychain from 'react-native-keychain';

import { useAuthStore } from '@/store/authStore';

import {
  AuthSessionExpiredError,
  refreshAuthTokens,
  restoreAuthSession,
} from './auth.service';

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
    '%s 후 인증 정보를 유지하고 다음 복원에 성공한다',
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

      await expect(useAuthStore.getState().restoreSession()).resolves.toBe(
        false,
      );
      expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

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
