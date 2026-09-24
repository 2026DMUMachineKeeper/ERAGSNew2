import { fetchMedicineAlerts, fetchMedicines } from '@/services/medicineApi';

import { queryClient } from './queryClient';

export const MEDICINES_QUERY_KEY = ['medicines'] as const;
export const MEDICINE_ALERTS_QUERY_KEY = ['medicineAlerts'] as const;

export const medicineQueryOptions = {
  queryKey: MEDICINES_QUERY_KEY,
  queryFn: fetchMedicines,
  staleTime: 30_000,
} as const;

export const medicineAlertsQueryOptions = {
  queryKey: MEDICINE_ALERTS_QUERY_KEY,
  queryFn: fetchMedicineAlerts,
  staleTime: 30_000,
} as const;

export const prefetchMedicines = (): void => {
  queryClient.prefetchQuery(medicineQueryOptions).catch((error: unknown) => {
    console.warn('[medicineQueries] 약품 목록 사전 조회 실패:', error);
  });
};

export const invalidateMedicines = (): void => {
  queryClient
    .invalidateQueries({ queryKey: MEDICINES_QUERY_KEY })
    .catch((error: unknown) => {
      console.warn('[medicineQueries] 약품 목록 갱신 실패:', error);
    });
  queryClient
    .invalidateQueries({ queryKey: MEDICINE_ALERTS_QUERY_KEY })
    .catch((error: unknown) => {
      console.warn('[medicineQueries] 약품 알림 갱신 실패:', error);
    });
};

export const removeMedicineQueries = (): void => {
  queryClient.removeQueries({ queryKey: MEDICINES_QUERY_KEY });
  queryClient.removeQueries({ queryKey: MEDICINE_ALERTS_QUERY_KEY });
};
