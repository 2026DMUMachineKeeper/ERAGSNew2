import React from 'react';
import { Text, View } from 'react-native';
import type { EmergencyWasteGuideItem } from '@/types';

interface Props {
  errorMessage: string | null;
  isLoading: boolean;
  items: EmergencyWasteGuideItem[] | null;
}

export function WasteGuideCard({
  errorMessage,
  isLoading,
  items,
}: Props): React.JSX.Element {
  return (
    <View className="mt-5 rounded-2xl bg-white p-4">
      <Text className="text-sm font-suitBold text-warning">
        폐기물 배출 안내
      </Text>

      {isLoading ? (
        <Text className="mt-3 leading-6 text-textDim">
          사용한 약품과 도구의 배출 방법을 확인하는 중입니다.
        </Text>
      ) : errorMessage ? (
        <Text className="mt-3 leading-6 text-red">{errorMessage}</Text>
      ) : items && items.length > 0 ? (
        items.map(item => (
          <View
            key={`${item.itemName}-${item.wasteCategory}`}
            className="mt-3 rounded-xl bg-background p-3"
          >
            <View className="flex-row items-center justify-between">
              <Text className="flex-1 font-suitBold text-black">
                {item.itemName}
              </Text>
              <Text
                className={
                  item.dangerLevel === 'HIGH'
                    ? 'font-suitBold text-red'
                    : 'font-suitBold text-textDim'
                }
              >
                {item.dangerLevel === 'HIGH' ? '⚠ 주의' : '일반 배출'}
              </Text>
            </View>
            <Text className="mt-1 leading-6 text-black">
              {item.disposalMethod}
            </Text>
          </View>
        ))
      ) : (
        <Text className="mt-3 leading-6 text-textDim">
          사용된 약품이나 도구가 없어 폐기 안내가 필요하지 않습니다.
        </Text>
      )}
    </View>
  );
}
