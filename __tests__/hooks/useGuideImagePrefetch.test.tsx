import React from 'react';
import { Image } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useGuideImagePrefetch } from '@/hooks/useGuideImagePrefetch';

const Harness = ({ urls }: { urls: readonly string[] }): null => {
  useGuideImagePrefetch(urls);
  return null;
};

describe('가이드 이미지 미리 받기', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    jest.restoreAllMocks();
  });

  it('두 번째 다운로드가 끝나지 않아도 세 번째 이미지를 바로 받는다', async () => {
    let finishFirst!: (value: boolean) => void;
    jest.mocked(Image.prefetch).mockImplementationOnce(
      () => new Promise(resolve => { finishFirst = resolve; }),
    );
    await act(async () => {
      renderer = create(<Harness urls={['', '/next.png', '/next.png', '/last.png']} />);
    });
    expect(jest.mocked(Image.prefetch).mock.calls.map(call => call[0])).toEqual([
      '/next.png', '/last.png',
    ]);
    await act(async () => finishFirst(true));
  });

  it('미리 받기에 실패해도 뒤의 이미지는 계속 준비한다', async () => {
    jest.mocked(Image.prefetch).mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      renderer = create(<Harness urls={['/failed.png', '/next.png']} />);
    });
    expect(Image.prefetch).toHaveBeenLastCalledWith('/next.png');
  });

  it('화면을 떠나면 남은 이미지 요청을 시작하지 않는다', async () => {
    let finishFirst!: (value: boolean) => void;
    let finishSecond!: (value: boolean) => void;
    jest.mocked(Image.prefetch).mockImplementationOnce(
      () => new Promise(resolve => { finishFirst = resolve; }),
    ).mockImplementationOnce(
      () => new Promise(resolve => { finishSecond = resolve; }),
    );
    await act(async () => {
      renderer = create(<Harness urls={['/first.png', '/second.png', '/unused.png']} />);
    });
    await act(async () => renderer.unmount());
    await act(async () => finishFirst(true));
    await act(async () => finishSecond(true));
    expect(Image.prefetch).toHaveBeenCalledTimes(2);
    expect(Image.prefetch).not.toHaveBeenCalledWith('/unused.png');
  });

  it('한 장이 끝나면 나머지 다운로드를 기다리지 않고 다음 이미지를 시작한다', async () => {
    let finishFirst!: (value: boolean) => void;
    let finishSecond!: (value: boolean) => void;
    jest.mocked(Image.prefetch)
      .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { finishSecond = resolve; }));
    await act(async () => {
      renderer = create(<Harness urls={['/slow.png', '/fast.png', '/third.png']} />);
    });
    expect(Image.prefetch).toHaveBeenCalledTimes(2);
    await act(async () => finishSecond(true));
    expect(Image.prefetch).toHaveBeenCalledTimes(3);
    expect(Image.prefetch).toHaveBeenLastCalledWith('/third.png');
    await act(async () => finishFirst(true));
  });

  it('단계를 연속으로 바꿔도 동시 요청을 두 개로 유지하고 최신 목록부터 받는다', async () => {
    const finishRequests = new Map<string, (value: boolean) => void>();
    let activeCount = 0;
    let maxActiveCount = 0;
    jest.mocked(Image.prefetch).mockImplementation(uri => {
      activeCount += 1;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      return new Promise(resolve => {
        finishRequests.set(uri, value => {
          activeCount -= 1;
          resolve(value);
        });
      });
    });
    await act(async () => {
      renderer = create(<Harness urls={['/first.png', '/second.png', '/obsolete.png']} />);
    });
    await act(async () => {
      renderer.update(<Harness urls={['/second.png', '/third.png']} />);
    });
    await act(async () => {
      renderer.update(<Harness urls={['/third.png', '/fourth.png']} />);
    });
    expect(Image.prefetch).toHaveBeenCalledTimes(2);
    await act(async () => finishRequests.get('/second.png')!(true));
    expect(Image.prefetch).toHaveBeenLastCalledWith('/third.png');
    await act(async () => finishRequests.get('/third.png')!(false));
    expect(Image.prefetch).toHaveBeenLastCalledWith('/fourth.png');
    expect(Image.prefetch).not.toHaveBeenCalledWith('/obsolete.png');
    expect(maxActiveCount).toBe(2);
    await act(async () => {
      finishRequests.get('/first.png')!(true);
      finishRequests.get('/fourth.png')!(true);
    });
  });

  it('단계를 바꿔도 진행 중인 요청과 성공한 요청을 중복 실행하지 않는다', async () => {
    let finishFirst!: (value: boolean) => void;
    jest.mocked(Image.prefetch).mockImplementationOnce(
      () => new Promise(resolve => { finishFirst = resolve; }),
    );
    await act(async () => {
      renderer = create(<Harness urls={['/second.png', '/third.png']} />);
    });
    await act(async () => {
      renderer.update(<Harness urls={['/second.png', '/third.png']} />);
    });
    expect(Image.prefetch).toHaveBeenCalledTimes(2);
    await act(async () => {
      renderer.update(<Harness urls={['/third.png', '/fourth.png']} />);
    });
    expect(jest.mocked(Image.prefetch).mock.calls.map(call => call[0])).toEqual([
      '/second.png', '/third.png', '/fourth.png',
    ]);
    await act(async () => finishFirst(true));
  });

  it('실패한 이미지는 이후 목록에서 다시 시도할 수 있다', async () => {
    jest.mocked(Image.prefetch).mockResolvedValueOnce(false);
    await act(async () => {
      renderer = create(<Harness urls={['/retry.png']} />);
    });
    await act(async () => {
      renderer.update(<Harness urls={['/retry.png', '/next.png']} />);
    });
    expect(jest.mocked(Image.prefetch).mock.calls.filter(call => call[0] === '/retry.png')).toHaveLength(2);
  });

  it('타이머 등으로 다시 렌더링돼도 같은 목록은 다시 요청하지 않는다', async () => {
    const urls = ['/next.png'];
    await act(async () => { renderer = create(<Harness urls={urls} />); });
    await act(async () => renderer.update(<Harness urls={urls} />));
    expect(Image.prefetch).toHaveBeenCalledTimes(1);
  });
});
