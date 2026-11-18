import { useEffect, useRef } from 'react';
import { Image } from 'react-native';

interface PrefetchQueue {
  pendingUrls: string[];
  activeUrls: Set<string>;
  completedUrls: Set<string>;
  isEnabled: boolean;
}

export const useGuideImagePrefetch = (imageUrls: readonly string[]): void => {
  const queueRef = useRef<PrefetchQueue>({
    pendingUrls: [],
    activeUrls: new Set(),
    completedUrls: new Set(),
    isEnabled: false,
  });

  useEffect(() => {
    const queue = queueRef.current;
    queue.isEnabled = true;
    // 단계 전환 시 진행 중인 요청은 유지하고, 대기 목록만 최신 단계로 교체합니다.
    queue.pendingUrls = [...new Set(imageUrls.filter(Boolean))].filter(
      uri => !queue.activeUrls.has(uri) && !queue.completedUrls.has(uri),
    );

    const startNextImages = (): void => {
      // 이전 단계에서 시작한 요청까지 포함해 동시 미리 받기를 두 개로 제한합니다.
      while (queue.isEnabled && queue.activeUrls.size < 2) {
        const uri = queue.pendingUrls.shift();
        if (!uri) {
          return;
        }
        queue.activeUrls.add(uri);
        Promise.resolve()
          .then(() => (queue.isEnabled ? Image.prefetch(uri) : false))
          .catch(() => false)
          .then(hasLoaded => {
            if (hasLoaded) {
              queue.completedUrls.add(uri);
            }
            queue.activeUrls.delete(uri);
            // 느린 요청을 기다리지 않고 빈 자리마다 최신 대기 목록을 처리합니다.
            startNextImages();
          });
      }
    };

    startNextImages();
    return () => {
      queue.isEnabled = false;
      queue.pendingUrls = [];
    };
  }, [imageUrls]);
};
