import { create } from 'zustand';

import {
  clearAuthSession,
  getStoredAuthUser,
  isTransientAuthError,
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
        // 오프라인·서버 오류처럼 서버가 토큰을 판정하지 못한 경우에만 저장된 세션으로 진입합니다.
        // 세션 만료나 4xx 거부는 동작하지 않는 세션에 갇히지 않도록 로그인 화면으로 보냅니다.
        if (!isTransientAuthError(error)) {
          throw error;
        }
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
