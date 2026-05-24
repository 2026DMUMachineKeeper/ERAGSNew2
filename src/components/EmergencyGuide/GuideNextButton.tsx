import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type Props = {
  title?: string;
  onPress: () => void;
};

export function GuideNextButton({ title = '다음 단계', onPress }: Props) {
  return (
    <TouchableOpacity
      className="h-16 bg-[#2ECC71] rounded-lg justify-center items-center mt-6 mb-6"
      onPress={onPress}
    >
      <Text className="text-white font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
