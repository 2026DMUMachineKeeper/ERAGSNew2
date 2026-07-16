import { login } from '../src/services/auth.service';

describe('auth.service login', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('accepts legacy token-only login responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          message: 'ok',
          token: 'legacy-access-token',
          user: {
            id: 1,
            email: 'user@example.com',
          },
        }),
    });

    await expect(
      login({ email: 'user@example.com', password: 'password' }),
    ).resolves.toEqual({
      access_token: 'legacy-access-token',
      refresh_token: '',
      expires_in: 0,
      user: {
        id: 1,
        email: 'user@example.com',
        name: undefined,
        guardian_phone: undefined,
      },
    });
  });

  it('accepts nested access and refresh token login responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            user: {
              id: 2,
              email: 'nested@example.com',
            },
          },
        }),
    });

    await expect(
      login({ email: 'nested@example.com', password: 'password' }),
    ).resolves.toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      user: {
        id: 2,
        email: 'nested@example.com',
      },
    });
  });
});
