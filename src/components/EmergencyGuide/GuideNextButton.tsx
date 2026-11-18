import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type Props = {
  title?: string;
  onPress: () => void;
  isDisabled?: boolean;
  accessibilityLabel?: string;
};

export function GuideNextButton({
  title = '다음 단계',
  onPress,
  isDisabled = false,
  accessibilityLabel,
}: Props) {
  return (
    <TouchableOpacity
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      className={`h-14 ${
        isDisabled ? 'bg-disabled' : 'bg-red'
      } rounded-2xl justify-center items-center`}
      onPress={onPress}
    >
      <Text className="text-white font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
