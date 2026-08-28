import * as Keychain from 'react-native-keychain';

import { AuthSessionExpiredError, restoreAuthSession } from './auth.service';

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('restoreAuthSession', () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    fetchMock.mockReset();
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
});
