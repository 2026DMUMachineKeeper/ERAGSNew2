import React from 'react';

import * as Keychain from 'react-native-keychain';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { MEDICINES_QUERY_KEY, queryClient } from '@/query';
import { ProfileEditActions } from '@/screens/settings/components';
import { fetchMedicines } from '@/services/medicineApi';
import { useAuthStore } from '@/store';

import { SettingsScreen } from './SettingsScreen';

jest.mock('@/services', () => jest.requireActual('@/services/auth.service'));
jest.mock('@/services/medicineApi', () => ({ fetchMedicines: jest.fn() }));

const PREVIOUS_USER = {
  id: 1,
  email: 'previous@example.com',
  name: '이전 사용자',
};
const NEXT_USER = { id: 2, email: 'next@example.com', name: '다음 사용자' };

const createResponse = (status: number, payload: unknown): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: async (): Promise<string> => JSON.stringify(payload),
  } as Response);

describe('마이페이지 세션 만료 통합 검증', () => {
  afterEach((): void => {
    queryClient.clear();
    useAuthStore.setState({ user: null, isAuthenticated: false });
    jest.restoreAllMocks();
  });

  it.each(['조회', '저장'] as const)(
    '%s 중 인증 만료 후 다른 계정으로 로그인하면 이전 약품을 재사용하지 않는다',
    async (requestStage: '조회' | '저장'): Promise<void> => {
      jest.clearAllMocks();
      jest.spyOn(console, 'error').mockImplementation((): void => {});
      jest.spyOn(console, 'warn').mockImplementation((): void => {});
      jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
        username: PREVIOUS_USER.email,
        password: JSON.stringify({
          accessToken: 'previous-access',
          refreshToken: 'previous-refresh',
          user: PREVIOUS_USER,
        }),
        service: 'erags.auth.token',
        storage: 'KeystoreAESGCM' as Keychain.STORAGE_TYPE,
      });
      const requestSpy = jest.spyOn(globalThis, 'fetch');
      if (requestStage === '저장') {
        requestSpy.mockResolvedValueOnce(
          createResponse(200, {
            success: true,
            data: { name: PREVIOUS_USER.name, guardian_phone: '' },
          }),
        );
      }
      requestSpy
        .mockResolvedValueOnce(createResponse(401, { message: '만료' }))
        .mockResolvedValueOnce(createResponse(401, { message: '만료' }));
      useAuthStore.setState({ user: PREVIOUS_USER, isAuthenticated: true });
      queryClient.setQueryData(MEDICINES_QUERY_KEY, [
        { id: 'previous-medicine' },
      ]);
      const reset = jest.fn((): void => {
        expect(useAuthStore.getState()).toMatchObject({
          user: null,
          isAuthenticated: false,
        });
        expect(queryClient.getQueryData(MEDICINES_QUERY_KEY)).toBeUndefined();
      });
      const rootNavigation = { reset };
      const screenProps = {
        navigation: { getParent: (): typeof rootNavigation => rootNavigation },
      } as unknown as React.ComponentProps<typeof SettingsScreen>;
      let renderer: ReactTestRenderer | undefined;

      try {
        await act(async (): Promise<void> => {
          renderer = create(React.createElement(SettingsScreen, screenProps));
        });
        if (requestStage === '저장') {
          expect(reset).not.toHaveBeenCalled();
          await act(async (): Promise<void> => {
            const actionProps = renderer?.root.findByType(ProfileEditActions)
              .props as React.ComponentProps<typeof ProfileEditActions>;
            actionProps.handlers.onEdit();
          });
          await act(async (): Promise<void> => {
            const actionProps = renderer?.root.findByType(ProfileEditActions)
              .props as React.ComponentProps<typeof ProfileEditActions>;
            await actionProps.handlers.onSave();
          });
        }
        expect(reset).toHaveBeenCalledTimes(1);
        expect(reset).toHaveBeenCalledWith({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        expect(Keychain.resetGenericPassword).toHaveBeenCalled();
        expect(requestSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/auth/mypage/1'),
          expect.objectContaining({
            method: requestStage === '조회' ? 'GET' : 'PUT',
          }),
        );
        await act(async (): Promise<void> => {
          renderer?.unmount();
        });
        renderer = undefined;

        requestSpy.mockResolvedValueOnce(
          createResponse(200, {
            user: NEXT_USER,
            access_token: 'next-access',
            refresh_token: 'next-refresh',
            expires_in: 3600,
          }),
        );
        jest.mocked(fetchMedicines).mockResolvedValue([]);
        await useAuthStore
          .getState()
          .signIn({ email: NEXT_USER.email, password: 'test-password' });
        await new Promise<void>((resolve): void => {
          setImmediate(resolve);
        });
        expect(useAuthStore.getState().user).toEqual(NEXT_USER);
        expect(fetchMedicines).toHaveBeenCalledTimes(1);
        expect(queryClient.getQueryData(MEDICINES_QUERY_KEY)).toEqual([]);
      } finally {
        await act(async (): Promise<void> => {
          renderer?.unmount();
        });
      }
    },
    15_000,
  );
});
