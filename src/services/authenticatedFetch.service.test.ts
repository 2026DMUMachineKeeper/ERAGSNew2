import {
  authenticatedFetch,
  type AuthenticatedFetchParams,
} from './authenticatedFetch.service';

class TestTokenExpiredError extends Error {}

const createResponse = (status: number): Response =>
  ({ status } as unknown as Response);

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const createParams = (): AuthenticatedFetchParams => ({
  getAccessToken: jest.fn(async (): Promise<string> => 'access-token'),
  isAccessTokenExpiredError: (error: unknown): boolean =>
    error instanceof TestTokenExpiredError,
  path: '/api/test',
  refreshAccessToken: jest.fn(
    async (): Promise<string> => 'refreshed-access-token',
  ),
});

describe('authenticatedFetch', () => {
  beforeEach((): void => {
    fetchMock.mockReset();
  });

  it('로컬 토큰이 만료되면 갱신한 토큰으로 요청한다', async (): Promise<void> => {
    const params = createParams();
    params.getAccessToken = jest.fn(async (): Promise<string> => {
      throw new TestTokenExpiredError();
    });
    fetchMock.mockResolvedValue(createResponse(200));

    await authenticatedFetch(params);

    expect(params.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'test-api-base-url/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer refreshed-access-token',
        }),
      }),
    );
  });

  it('401 응답이면 토큰 갱신 후 한 번만 재시도한다', async (): Promise<void> => {
    const params = createParams();
    fetchMock
      .mockResolvedValueOnce(createResponse(401))
      .mockResolvedValueOnce(createResponse(200));

    await expect(authenticatedFetch(params)).resolves.toMatchObject({
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(params.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
