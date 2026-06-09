import React from 'react';
import { Text, View } from 'react-native';
import tailwindConfig from '../../../tailwind.config';

const { colors } = tailwindConfig;

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
    <View className="rounded-[18px] border border-borderSubtle bg-surfaceAlt px-4 py-4">
      {rows.map((row, index) => (
        <View key={row.label}>
          {index > 0 ? <View className="my-3 h-[1px] bg-borderSubtle" /> : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-textMuted">{row.label}</Text>
            <Text
              className="text-sm font-bold"
              style={{ color: row.valueColor ?? colors.offWhite }}
            >
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
