import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface MedicineListEmptyStateProps {
  state: { isLoading: boolean; isFetching: boolean; loadError: string | null; searchQuery: string };
  onRetry: () => Promise<void>;
}
export const MedicineListEmptyState = ({
  state,
  onRetry,
}: MedicineListEmptyStateProps): React.JSX.Element => {
  const { isLoading, isFetching, loadError, searchQuery } = state;
  if (isLoading) {
    return (
      <View className="mt-12 items-center">
        <Text className="text-sm font-suitBold text-memoSubText">약품 목록을 불러오는 중...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="mt-12 items-center">
        <Text className="text-center text-sm font-suitBold text-memoRed">{loadError}</Text>
        <TouchableOpacity
          accessibilityLabel="약품 목록 다시 시도"
          accessibilityRole="button"
          className="mt-4 rounded-xl border border-memoRed px-5 py-3"
          disabled={isFetching}
          onPress={onRetry}>
          <Text className="text-sm font-suitBold text-memoRed">
            {isFetching ? '불러오는 중...' : '다시 시도'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emptyMessage =
    searchQuery.trim().length > 0 ? '검색 결과가 없습니다.' : '등록된 약품이 없습니다.';

  return (
    <View className="mt-12 items-center">
      <Text className="text-sm font-suitBold text-memoSubText">{emptyMessage}</Text>
    </View>
  );
};
export default MedicineListEmptyState;
