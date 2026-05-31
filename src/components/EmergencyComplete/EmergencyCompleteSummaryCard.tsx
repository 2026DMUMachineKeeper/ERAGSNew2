import React from 'react';
import { Text, View } from 'react-native';

export type EmergencyCompleteSummaryRow = {
  label: string;
  value: string;
  valueColor?: string;
};

type Props = {
  rows: EmergencyCompleteSummaryRow[];
};

export function EmergencyCompleteSummaryCard({ rows }: Props) {
  return (
    <View className="rounded-[18px] border border-[#2B303A] bg-[#181C24] px-4 py-4">
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 ? <View className="my-3 h-[1px] bg-[#2B303A]" /> : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-[#A5ACB8]">{row.label}</Text>
            <Text
              className="text-sm font-bold"
              style={{ color: row.valueColor ?? '#E5E7EB' }}
            >
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
