import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type Props = {
  title?: string;
  onPress: () => void;
};

export function GuideNextButton({ title = '다음 단계', onPress }: Props) {
  return (
    <TouchableOpacity
      className="h-14 bg-red rounded-2xl justify-center items-center"
      onPress={onPress}
    >
      <Text className="text-white font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
