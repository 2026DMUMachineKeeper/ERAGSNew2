import React from 'react';
import { View } from 'react-native';

type GuideProgressBarProps = {
  progress: number;
};

export function GuideProgressBar({ progress }: GuideProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));

  return (
    <View className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
      <View
        className="h-full rounded-full bg-red"
        style={{ width: `${safeProgress * 100}%` }}
      />
    </View>
  );
}
