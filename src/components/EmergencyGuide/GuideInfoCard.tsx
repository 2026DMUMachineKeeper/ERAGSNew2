import React from 'react';
import { View, Text } from 'react-native';

type GuideInfoCardProps = {
  title: string;
  description: string;
  tone?: 'neutral' | 'success';
};

export function GuideInfoCard({
  title,
  description,
  tone = 'neutral',
}: GuideInfoCardProps) {
  const containerClassName =
    tone === 'success'
      ? 'mt-4 bg-white border border-success rounded-2xl p-4'
      : 'bg-white border border-memoLine rounded-2xl p-4';

  const descriptionClassName =
    tone === 'success'
      ? 'text-gray text-body mt-2 leading-6'
      : 'text-textDim text-body mt-3 leading-6';

  return (
    <View className={containerClassName}>
      <Text className="text-black text-title tracking-erags font-suitBold">
        {title}
      </Text>
      <Text className={descriptionClassName}>{description}</Text>
    </View>
  );
}
