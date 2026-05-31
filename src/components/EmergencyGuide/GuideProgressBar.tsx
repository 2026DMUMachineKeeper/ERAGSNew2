import React from 'react';
import { View } from 'react-native';

type GuideProgressBarProps = {
  progress: number;
};

export function GuideProgressBar({ progress }: GuideProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));

  return (
    <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#22262E]">
      <View
        className="h-full rounded-full bg-[#FF3B3B]"
        style={{ width: `${safeProgress * 100}%` }}
      />
    </View>
  );
}
