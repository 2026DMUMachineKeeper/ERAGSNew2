import { create } from 'zustand';

import {
  clearAuthSession,
  getStoredAuthUser,
  isAuthSessionExpiredError,
  login,
  logout,
  restoreAuthSession,
  saveAuthTokens,
} from '@/services/auth.service';
import { prefetchMedicines, removeMedicineQueries } from '@/query';
import type { AuthUser } from '@/types';

interface SignInParams {
  email: string;
  password: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  clearSession: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  setUser: (user: AuthUser) => void;
  signIn: (params: SignInParams) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(set => ({
  user: null,
  isAuthenticated: false,

  clearSession: async (): Promise<void> => {
    try {
      await clearAuthSession();
    } finally {
      set({ user: null, isAuthenticated: false });
      removeMedicineQueries();
    }
  },

  restoreSession: async (): Promise<boolean> => {
    try {
      try {
        await restoreAuthSession();
      } catch (error: unknown) {
        if (isAuthSessionExpiredError(error)) {
          throw error;
        }
        // 오프라인·서버 오류처럼 일시적인 갱신 실패로 응급 앱 진입을 막지 않습니다.
        // 저장된 세션으로 진행하고, 이후 API 호출에서 토큰 갱신을 다시 시도합니다.
        console.warn('[authStore] 세션 갱신 실패, 저장된 세션으로 진행:', error);
      }
      const user = (await getStoredAuthUser()) ?? null;

      set({ user, isAuthenticated: true });
      prefetchMedicines();
      return true;
    } catch {
      set({ user: null, isAuthenticated: false });
      removeMedicineQueries();
      return false;
    }
  },

  setUser: (user: AuthUser): void => {
    set({ user });
  },

  signIn: async ({ email, password }: SignInParams): Promise<AuthUser> => {
    const loginResponse = await login({ email, password });

    await saveAuthTokens(loginResponse.user.email, {
      accessToken: loginResponse.access_token,
      refreshToken: loginResponse.refresh_token,
      expiresIn: loginResponse.expires_in,
      user: loginResponse.user,
    });
    removeMedicineQueries();
    set({ user: loginResponse.user, isAuthenticated: true });
    prefetchMedicines();

    return loginResponse.user;
  },

  signOut: async (): Promise<void> => {
    try {
      await logout();
    } catch (error: unknown) {
      await clearAuthSession();
      throw error;
    } finally {
      set({ user: null, isAuthenticated: false });
      removeMedicineQueries();
    }
  },
}));
