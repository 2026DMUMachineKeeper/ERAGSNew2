import {
  clearAuthSession,
  getStoredAuthUser,
  login,
  logout,
  restoreAuthSession,
  saveAuthTokens,
} from '@/services/auth.service';
import { prefetchMedicines, removeMedicineQueries } from '@/query';
import type { AuthUser, LoginResponse } from '@/types';

import { useAuthStore } from '@/store/authStore';

jest.mock('@/services/auth.service', () => ({
  clearAuthSession: jest.fn(),
  getStoredAuthUser: jest.fn(),
  isTransientAuthError: (error: unknown): boolean => error instanceof TypeError,
  login: jest.fn(),
  logout: jest.fn(),
  restoreAuthSession: jest.fn(),
  saveAuthTokens: jest.fn(),
}));

jest.mock('@/query', () => ({
  prefetchMedicines: jest.fn(),
  removeMedicineQueries: jest.fn(),
}));

const TEST_USER: AuthUser = {
  id: 1,
  email: 'user@example.com',
  name: '사용자',
};

const TEST_LOGIN_RESPONSE: LoginResponse = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  user: TEST_USER,
};

describe('useAuthStore', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('로그인 성공 시 사용자와 인증 상태를 저장한다', async (): Promise<void> => {
    jest.mocked(login).mockResolvedValue(TEST_LOGIN_RESPONSE);

    await expect(
      useAuthStore.getState().signIn({
        email: TEST_USER.email,
        password: 'password',
      }),
    ).resolves.toEqual(TEST_USER);

    expect(saveAuthTokens).toHaveBeenCalledTimes(1);
    expect(prefetchMedicines).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: TEST_USER,
      isAuthenticated: true,
    });
  });

  it('저장된 세션 복원 성공 시 사용자 상태를 복원한다', async (): Promise<void> => {
    jest.mocked(restoreAuthSession).mockResolvedValue('access-token');
    jest.mocked(getStoredAuthUser).mockResolvedValue(TEST_USER);

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(true);
    expect(prefetchMedicines).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: TEST_USER,
      isAuthenticated: true,
    });
  });

  it('오프라인으로 토큰 갱신에 실패해도 저장된 세션으로 진입한다', async (): Promise<void> => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest
      .mocked(restoreAuthSession)
      .mockRejectedValue(new TypeError('Network request failed'));
    jest.mocked(getStoredAuthUser).mockResolvedValue(TEST_USER);

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(true);
    expect(clearAuthSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: TEST_USER,
      isAuthenticated: true,
    });
  });

  it('세션이 만료되면 로그인 화면으로 보낸다', async (): Promise<void> => {
    const expiredError = new Error();
    expiredError.name = 'AuthSessionExpiredError';
    jest.mocked(restoreAuthSession).mockRejectedValue(expiredError);
    jest.mocked(getStoredAuthUser).mockResolvedValue(TEST_USER);

    await expect(useAuthStore.getState().restoreSession()).resolves.toBe(false);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
  });

  it('로그아웃 API가 실패해도 로컬 인증 상태를 제거한다', async (): Promise<void> => {
    useAuthStore.setState({ user: TEST_USER, isAuthenticated: true });
    jest.mocked(logout).mockRejectedValue(new Error('network error'));

    await expect(useAuthStore.getState().signOut()).rejects.toThrow(
      'network error',
    );
    expect(clearAuthSession).toHaveBeenCalledTimes(1);
    expect(removeMedicineQueries).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
    });
  });
});
