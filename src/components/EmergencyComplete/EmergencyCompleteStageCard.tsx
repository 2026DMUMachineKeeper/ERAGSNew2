import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  completedSteps: number;
  totalSteps: number;
};

export function EmergencyCompleteStageCard({
  completedSteps,
  totalSteps,
}: Props) {
  return (
    <View className="rounded-[18px] border border-[#2B303A] bg-[#181C24] px-4 py-4">
      <Text className="text-sm text-[#A5ACB8]">완료 단계</Text>
      <Text className="mt-2 text-white text-base">
        {completedSteps} / {totalSteps} 단계 완료
      </Text>
    </View>
  );
}
