import { MEDICINES_QUERY_KEY, queryClient } from '@/query';
import { clearAuthSession, login } from '@/services/auth.service';
import { fetchMedicines } from '@/services/medicineApi';
import { useAuthStore } from '@/store';

import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';

jest.mock('@/services/auth.service', () => ({
  clearAuthSession: jest.fn(),
  login: jest.fn(),
  saveAuthTokens: jest.fn(),
}));

jest.mock('@/services/medicineApi', () => ({
  fetchMedicines: jest.fn(),
}));

const PREVIOUS_USER = { id: 1, email: 'previous@example.com' };
const NEXT_USER = { id: 2, email: 'next@example.com' };

describe('세션 만료 후 계정 전환', () => {
  beforeEach((): void => {
    jest.resetAllMocks();
    queryClient.clear();
    useAuthStore.setState({ user: PREVIOUS_USER, isAuthenticated: true });
    queryClient.setQueryData(MEDICINES_QUERY_KEY, [
      { id: 'previous-medicine' },
    ]);
    jest.mocked(fetchMedicines).mockResolvedValue([]);
  });

  afterEach((): void => {
    queryClient.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    jest.restoreAllMocks();
  });

  it.each([false, true])(
    '저장소 정리 실패 여부가 %s여도 상태와 캐시를 지운 뒤 이동한다',
    async (hasStorageError: boolean): Promise<void> => {
      let finishCleanup: () => void = (): void => {};
      jest.mocked(clearAuthSession).mockImplementation(
        (): Promise<void> =>
          new Promise<void>((resolve, reject): void => {
            finishCleanup = (): void => {
              if (hasStorageError) {
                reject(new Error('저장소 오류'));
              } else {
                resolve();
              }
            };
          }),
      );
      jest.spyOn(console, 'warn').mockImplementation((): void => {});
      const reset = jest.fn();

      redirectToLoginForExpiredSession({ reset });
      expect(reset).not.toHaveBeenCalled();
      finishCleanup();
      await new Promise<void>((resolve): void => {
        setImmediate(resolve);
      });

      expect(useAuthStore.getState()).toMatchObject({
        user: null,
        isAuthenticated: false,
      });
      expect(queryClient.getQueryData(MEDICINES_QUERY_KEY)).toBeUndefined();
      expect(reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    },
  );

  it('새 로그인에서는 이전 계정의 최신 캐시도 재사용하지 않는다', async (): Promise<void> => {
    jest.mocked(login).mockResolvedValue({
      user: NEXT_USER,
      access_token: 'next-access',
      refresh_token: 'next-refresh',
      expires_in: 3600,
    });

    await useAuthStore.getState().signIn({
      email: NEXT_USER.email,
      password: 'test-password',
    });
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });

    expect(fetchMedicines).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(MEDICINES_QUERY_KEY)).toEqual([]);
    expect(useAuthStore.getState().user).toEqual(NEXT_USER);
  });
});
