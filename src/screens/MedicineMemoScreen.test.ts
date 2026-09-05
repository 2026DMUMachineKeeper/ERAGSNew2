import React from 'react';

import { useIsFocused } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { MEDICINES_QUERY_KEY } from '@/query';
import { fetchMedicines } from '@/services/medicineApi';
import type { MedicineItem } from '@/services/medicineApi';

import {
  filterMedicinesByName,
  MedicineMemoScreen,
} from './MedicineMemoScreen';

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
}));

jest.mock('@/services/medicineApi', () => ({
  fetchMedicines: jest.fn(),
}));

jest.mock('../assets', () => ({
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
        jest
          .mocked(fetchMedicines)
          .mockRejectedValueOnce(new Error('연결 실패'));
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

      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation((): void => {});
      try {
        await act(async (): Promise<void> => {
          renderer = create(renderScreen());
        });
        expect(fetchMedicines).not.toHaveBeenCalled();

        jest.mocked(useIsFocused).mockReturnValue(true);
        await act(async (): Promise<void> => {
          renderer?.update(renderScreen());
        });
        expect(fetchMedicines).toHaveBeenCalledTimes(
          cacheState === '최신 캐시' ? 0 : 1,
        );
        expect(queryClient.getQueryState(MEDICINES_QUERY_KEY)?.status).toBe(
          'success',
        );
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
