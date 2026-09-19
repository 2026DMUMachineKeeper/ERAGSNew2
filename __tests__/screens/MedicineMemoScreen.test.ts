import React from 'react';
import { Text, TextInput } from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { MedicineItem } from '@/types';
import { MEDICINES_QUERY_KEY } from '@/query';
import { fetchMedicines } from '@/services/medicineApi';
import { filterMedicinesByName } from '@/utils/medicine/filterMedicinesByName';

import { MedicineMemoScreen } from '@/screens/MedicineMemoScreen';

const getRenderedText = (renderer: ReactTestRenderer): string =>
  renderer.root
    .findAllByType(Text)
    .flatMap(textNode => textNode.props.children)
    .filter((text): text is string | number => typeof text === 'string' || typeof text === 'number')
    .join(' ');

const waitForQueryUpdate = async (): Promise<void> => {
  await act(
    async (): Promise<void> =>
      new Promise(resolve => {
        setTimeout(resolve, 0);
      }),
  );
};

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@/services/medicineApi', () => ({
  fetchMedicines: jest.fn(),
}));

jest.mock('@/assets', () => ({
  BackIcon: (): null => null,
}));

const MEDICINES: MedicineItem[] = [
  {
    id: '1',
    name: '타이레놀',
    info: '',
    qty: 2,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
  {
    id: '2',
    name: 'Tylenol',
    info: '',
    qty: 1,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
  {
    id: '3',
    name: '게보린',
    info: '',
    qty: 3,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
];

describe('filterMedicinesByName', () => {
  it('공백과 영문 대소문자를 무시하고 약품명으로 검색한다', (): void => {
    expect(filterMedicinesByName(MEDICINES, ' 타이 ')).toEqual([MEDICINES[0]]);
    expect(filterMedicinesByName(MEDICINES, 'TYL')).toEqual([MEDICINES[1]]);
    expect(filterMedicinesByName(MEDICINES, '  ')).toBe(MEDICINES);
  });
});

describe('약품 탭 복귀 시 조회', () => {
  it('약품 탭을 벗어나면 검색어를 초기화한다', async (): Promise<void> => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const screenProps = {
      navigation: { getParent: jest.fn() },
    } as unknown as React.ComponentProps<typeof MedicineMemoScreen>;
    const renderScreen = (): React.ReactElement =>
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(MedicineMemoScreen, screenProps),
      );
    let renderer: ReactTestRenderer | undefined;

    jest.mocked(fetchMedicines).mockReset().mockResolvedValue(MEDICINES);
    jest.mocked(useIsFocused).mockReturnValue(true);

    try {
      await act(async (): Promise<void> => {
        renderer = create(renderScreen());
      });

      const searchInput = renderer?.root.findByType(TextInput);
      await act(async (): Promise<void> => {
        searchInput?.props.onChangeText('타이레놀');
      });
      expect(renderer?.root.findByType(TextInput).props.value).toBe('타이레놀');

      jest.mocked(useIsFocused).mockReturnValue(false);
      await act(async (): Promise<void> => {
        renderer?.update(renderScreen());
      });

      expect(renderer?.root.findByType(TextInput).props.value).toBe('');
    } finally {
      await act(async (): Promise<void> => {
        renderer?.unmount();
      });
      queryClient.clear();
    }
  });

  it.each(['최신 캐시', '오래된 캐시', '조회 실패'] as const)(
    '%s 상태에서 필요한 경우에만 재조회한다',
    async (cacheState: '최신 캐시' | '오래된 캐시' | '조회 실패'): Promise<void> => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      const screenProps = {
        navigation: { getParent: jest.fn() },
      } as unknown as React.ComponentProps<typeof MedicineMemoScreen>;
      const renderScreen = (): React.ReactElement =>
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(MedicineMemoScreen, screenProps),
        );
      let renderer: ReactTestRenderer | undefined;

      jest.mocked(fetchMedicines).mockReset().mockResolvedValue(MEDICINES);
      jest.mocked(useIsFocused).mockReturnValue(false);

      if (cacheState === '조회 실패') {
        jest.mocked(fetchMedicines).mockRejectedValueOnce(new Error('연결 실패'));
        await queryClient.prefetchQuery({
          queryKey: MEDICINES_QUERY_KEY,
          queryFn: fetchMedicines,
        });
        jest.mocked(fetchMedicines).mockClear();
      } else {
        queryClient.setQueryData(MEDICINES_QUERY_KEY, MEDICINES, {
          updatedAt: Date.now() - (cacheState === '오래된 캐시' ? 31_000 : 0),
        });
      }

      const errorSpy = jest.spyOn(console, 'error').mockImplementation((): void => {});
      try {
        await act(async (): Promise<void> => {
          renderer = create(renderScreen());
        });
        expect(fetchMedicines).not.toHaveBeenCalled();

        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async (): Promise<void> => {
          renderer?.update(renderScreen());
        });
        expect(fetchMedicines).toHaveBeenCalledTimes(cacheState === '최신 캐시' ? 0 : 1);
        expect(queryClient.getQueryState(MEDICINES_QUERY_KEY)?.status).toBe('success');
      } finally {
        await act(async (): Promise<void> => {
          renderer?.unmount();
        });
        queryClient.clear();
        errorSpy.mockRestore();
      }
    },
    15_000,
  );
});

describe('약품 목록 조회 실패 화면', () => {
  const createScreenProps = (): React.ComponentProps<typeof MedicineMemoScreen> =>
    ({
      navigation: { getParent: jest.fn() },
    } as unknown as React.ComponentProps<typeof MedicineMemoScreen>);

  it('저장된 목록이 없으면 네트워크 안내와 재시도 버튼을 표시한다', async (): Promise<void> => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest
      .mocked(fetchMedicines)
      .mockReset()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(MEDICINES);
    let renderer: ReactTestRenderer | undefined;

    try {
      await act(async (): Promise<void> => {
        renderer = create(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(MedicineMemoScreen, createScreenProps()),
          ),
        );
      });
      if (!renderer) {
        throw new Error('약품 메모 화면을 렌더링하지 못했습니다.');
      }
      await waitForQueryUpdate();

      const failedScreen = getRenderedText(renderer);
      expect(failedScreen).toContain('네트워크 연결을 확인한 후 다시 시도해 주세요.');
      expect(failedScreen).not.toContain('0개');

      const retryButton = renderer?.root.findByProps({
        accessibilityLabel: '약품 목록 다시 시도',
      });
      await act(async (): Promise<void> => {
        await retryButton?.props.onPress();
      });
      await waitForQueryUpdate();

      expect(fetchMedicines).toHaveBeenCalledTimes(2);
      expect(getRenderedText(renderer)).toContain('3 개');
    } finally {
      await act(async (): Promise<void> => {
        renderer?.unmount();
      });
      queryClient.clear();
    }
  });

  it('저장된 목록이 있어도 오류 안내만 표시한다', async (): Promise<void> => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    queryClient.setQueryData(MEDICINES_QUERY_KEY, MEDICINES, {
      updatedAt: Date.now() - 31_000,
    });
    jest.mocked(useIsFocused).mockReturnValue(true);
    jest
      .mocked(fetchMedicines)
      .mockReset()
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    let renderer: ReactTestRenderer | undefined;

    try {
      await act(async (): Promise<void> => {
        renderer = create(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(MedicineMemoScreen, createScreenProps()),
          ),
        );
      });
      if (!renderer) {
        throw new Error('약품 메모 화면을 렌더링하지 못했습니다.');
      }
      await waitForQueryUpdate();

      const failedRefreshScreen = getRenderedText(renderer);
      expect(failedRefreshScreen).toContain('네트워크 연결을 확인한 후 다시 시도해 주세요.');
      expect(failedRefreshScreen).not.toContain('타이레놀');
      expect(failedRefreshScreen).not.toContain('3 개');
    } finally {
      await act(async (): Promise<void> => {
        renderer?.unmount();
      });
      queryClient.clear();
    }
  });
});
