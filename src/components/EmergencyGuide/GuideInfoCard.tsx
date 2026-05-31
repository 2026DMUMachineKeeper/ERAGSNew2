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
      ? 'mt-4 bg-[#1C2F2C] border border-[#2ECC71] rounded-2xl p-4'
      : 'bg-[#22262E] border border-[#363C46] rounded-2xl p-4';

  const descriptionClassName =
    tone === 'success'
      ? 'text-[#BFE8D0] text-body mt-2 leading-6'
      : 'text-lightGray text-body mt-3 leading-6';

  return (
    <View className={containerClassName}>
      <Text className="text-white text-title tracking-erags font-suitBold">
        {title}
      </Text>
      <Text className={descriptionClassName}>{description}</Text>
    </View>
  );
}
