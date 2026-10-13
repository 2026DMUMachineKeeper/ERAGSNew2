/* eslint-disable no-extend-native -- 폴리필 설치 여부를 검증하기 위해 테스트에서 원형을 임시 교체한다. */

type FindLastIndex = (
  predicate: (value: unknown, index: number, array: unknown[]) => unknown,
  thisArg?: unknown,
) => number;

const getFindLastIndex = (): FindLastIndex | undefined =>
  (Array.prototype as unknown as Record<string, FindLastIndex | undefined>)
    .findLastIndex;

describe('arrayFindLastIndex polyfill', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    'findLastIndex',
  );

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(
        Array.prototype,
        'findLastIndex',
        originalDescriptor,
      );
    } else {
      delete (
        Array.prototype as unknown as Record<string, FindLastIndex | undefined>
      ).findLastIndex;
    }

    jest.resetModules();
  });

  it('지원하지 않는 런타임에 역방향 검색 메서드를 추가한다', () => {
    delete (
      Array.prototype as unknown as Record<string, FindLastIndex | undefined>
    ).findLastIndex;

    jest.isolateModules(() => {
      require('../../src/polyfills/arrayFindLastIndex');
    });

    const findLastIndex = getFindLastIndex();

    expect(findLastIndex).toBeDefined();
    expect(findLastIndex?.call([1, 2, 3, 2], (value) => value === 2)).toBe(3);
    expect(findLastIndex?.call([1, 2, 3], (value) => value === 4)).toBe(-1);
  });

  it('이미 지원하는 런타임의 구현은 덮어쓰지 않는다', () => {
    const nativeImplementation: FindLastIndex = () => 99;
    Object.defineProperty(Array.prototype, 'findLastIndex', {
      configurable: true,
      writable: true,
      value: nativeImplementation,
    });

    jest.isolateModules(() => {
      require('../../src/polyfills/arrayFindLastIndex');
    });

    expect(getFindLastIndex()).toBe(nativeImplementation);
  });
});
