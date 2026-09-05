import {
  AuthSessionExpiredError,
  RequestTimeoutError,
  authenticatedFetch,
  fetchWithTimeout,
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

  it('토큰 갱신 후에도 401이면 세션 만료 오류를 반환한다', async (): Promise<void> => {
    const params = createParams();
    fetchMock.mockResolvedValue(createResponse(401));

    await expect(authenticatedFetch(params)).rejects.toBeInstanceOf(
      AuthSessionExpiredError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(params.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('제한 시간이 지나면 진행 중인 요청을 취소한다', async (): Promise<void> => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_input: RequestInfo, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject): void => {
          init?.signal?.addEventListener('abort', (): void => {
            const abortError = new Error('요청 취소');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    try {
      const request = authenticatedFetch({ ...createParams(), timeoutMs: 100 });
      let requestError: unknown;
      const settledRequest = request.catch((error: unknown): void => {
        requestError = error;
      });
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(100);

      await settledRequest;
      expect(requestError).toBeInstanceOf(RequestTimeoutError);
    } finally {
      jest.useRealTimers();
    }
  });

  it('화면에서 전달한 취소 신호로 요청을 중단한다', async (): Promise<void> => {
    const callerController = new AbortController();
    fetchMock.mockImplementation(
      (_input: RequestInfo, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject): void => {
          init?.signal?.addEventListener('abort', (): void => {
            const abortError = new Error('요청 취소');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    );

    const request = fetchWithTimeout('/api/test', {
      signal: callerController.signal,
    });
    callerController.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('이미 취소된 신호로 새 요청을 시작하지 않는다', async (): Promise<void> => {
    const callerController = new AbortController();
    callerController.abort();
    fetchMock.mockImplementation(
      (_input: RequestInfo, init?: RequestInit): Promise<Response> => {
        if (init?.signal?.aborted) {
          const abortError = new Error('요청 취소');
          abortError.name = 'AbortError';
          return Promise.reject(abortError);
        }

        return Promise.resolve(createResponse(200));
      },
    );

    await expect(
      fetchWithTimeout('/api/test', { signal: callerController.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
