import React from 'react';
import { Text, View } from 'react-native';

type Props = {
  mainLabel: string;
  elapsedLabel: string;
};

export function EmergencyCompleteHeaderCard({
  mainLabel,
  elapsedLabel,
}: Props) {
  return (
    <View className="rounded-[18px] border border-[#2B303A] bg-[#181C24] px-4 py-4">
      <View className="flex-row items-center">
        <View className="h-2 w-2 rounded-full bg-[#FF4D4D] mr-2" />
        <Text className="text-lg font-bold text-[#FF4D4D]">{mainLabel}</Text>
      </View>
      <Text className="mt-2 text-sm text-[#8B93A1]">처치 시간</Text>
      <Text className="mt-1 text-[44px] font-bold text-white tracking-tight">
        {elapsedLabel}
      </Text>
    </View>
  );
}
