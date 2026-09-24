import React from 'react';
import { Text, View } from 'react-native';

import type { MedicineItem } from '@/types';

interface MedicineInfoCardsProps {
  medicine: MedicineItem;
}

export const MedicineInfoCards = ({
  medicine,
}: MedicineInfoCardsProps): React.JSX.Element => {
  return (
    <View className="pb-4">
      <View className="mt-5 rounded-2xl bg-white p-4 shadow-md">
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-red">
            <Text className="text-lg text-white">약</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-suitBold text-memoText">
              {medicine.name}
            </Text>
            <Text className="mt-1 text-sm font-suitBold text-red">
              {medicine.qty}개
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-3 rounded-2xl bg-white p-4 shadow-md">
        <Text className="text-sm font-suitBold text-memoText">효능</Text>
        <Text className="mt-3 text-sm leading-6 text-memoSubText">
          {medicine.efficacy}
        </Text>
      </View>

      <View className="mt-3 rounded-2xl bg-white p-4 shadow-md">
        <Text className="text-sm font-suitBold text-memoText">사용 방법</Text>
        <Text className="mt-3 text-sm leading-6 text-memoSubText">
          {medicine.usage}
        </Text>
      </View>

      <View className="mt-3 rounded-2xl bg-white p-4 shadow-md">
        <Text className="text-sm font-suitBold text-memoText">유통기한</Text>
        <Text className="mt-3 text-sm leading-6 text-memoSubText">
          {medicine.expireDate || '등록된 유통기한 없음'}
        </Text>
      </View>
    </View>
  );
};

export default MedicineInfoCards;
