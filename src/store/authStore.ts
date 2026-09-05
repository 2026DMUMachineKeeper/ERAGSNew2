import { create } from 'zustand';

import {
  clearAuthSession,
  getStoredAuthUser,
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
      await restoreAuthSession();
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
