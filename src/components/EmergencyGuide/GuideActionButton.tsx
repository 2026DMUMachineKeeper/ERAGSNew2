import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

type GuideActionButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

export function GuideActionButton({
  title,
  onPress,
  disabled,
}: GuideActionButtonProps) {
  return (
    <TouchableOpacity
      className={`${
        disabled ? 'h-16 bg-disabled' : 'h-16 bg-red'
      } rounded-lg justify-center items-center`}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text className="text-white font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
