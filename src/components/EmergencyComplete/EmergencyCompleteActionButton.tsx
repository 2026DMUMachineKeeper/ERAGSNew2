import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
};

export function EmergencyCompleteActionButton({ title, onPress }: Props) {
  return (
    <TouchableOpacity
      className="h-16 rounded-2xl bg-red items-center justify-center"
      onPress={onPress}
    >
      <Text className="text-white text-base font-bold">{title}</Text>
    </TouchableOpacity>
  );
}
