/* eslint-disable no-extend-native -- 구버전 JavaScriptCore에 누락된 표준 메서드만 조건부로 보완한다. */

type FindLastIndexPredicate = (
  value: unknown,
  index: number,
  array: unknown[],
) => unknown;

const arrayPrototype = Array.prototype as unknown as Record<string, unknown>;

// JavaScriptCore 구버전에서도 React Navigation 7의 탭 라우터가 동작하도록 보완한다.
if (typeof arrayPrototype.findLastIndex !== 'function') {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    writable: true,
    value: function findLastIndex(
      this: unknown[],
      predicate: FindLastIndexPredicate,
      thisArg?: unknown,
    ): number {
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      for (let index = this.length - 1; index >= 0; index -= 1) {
        if (predicate.call(thisArg, this[index], index, this)) {
          return index;
        }
      }

      return -1;
    },
  });
}

export {};
