import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface MedicineQuantityInputProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const MedicineQuantityInput = ({
  quantity,
  onIncrease,
  onDecrease,
}: MedicineQuantityInputProps): React.JSX.Element => {
  return (
    <View className="h-12 flex-row overflow-hidden rounded-xl border border-memoLine">
      <TouchableOpacity
        className="w-16 items-center justify-center border-r border-memoLine"
        onPress={onDecrease}>
        <Text className="text-xl font-suitBold text-memoSubText">-</Text>
      </TouchableOpacity>
      <View className="flex-1 items-center justify-center">
        <Text className="text-base font-suitBold text-memoText">{quantity}</Text>
      </View>
      <TouchableOpacity
        className="w-16 items-center justify-center border-l border-r border-memoLine"
        onPress={onIncrease}>
        <Text className="text-xl font-suitBold text-memoText">+</Text>
      </TouchableOpacity>
      <View className="w-12 items-center justify-center">
        <Text className="text-sm font-suitBold text-memoText">개</Text>
      </View>
    </View>
  );
};

export default MedicineQuantityInput;
