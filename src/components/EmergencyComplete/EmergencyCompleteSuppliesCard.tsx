import React from 'react';
import { Text, View } from 'react-native';

type SupplyItem = {
  name: string;
  qty: string;
};

type Props = {
  items: SupplyItem[];
};

export function EmergencyCompleteSuppliesCard({ items }: Props) {
  return (
    <View className="rounded-[18px] border border-[#2B303A] bg-[#181C24] px-4 py-4">
      <Text className="text-sm text-[#A5ACB8]">사용된 약품 / 물품</Text>
      <View className="mt-4">
        {items.map((item, index) => (
          <View
            key={item.name}
            className={`${
              index > 0 ? 'mt-3' : ''
            } flex-row items-center justify-between`}
          >
            <Text className="text-base text-white">{item.name}</Text>
            <Text className="text-sm font-bold text-[#F59E0B]">{item.qty}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
