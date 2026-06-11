import React from 'react';
import { View, Text } from 'react-native';
import type { EmergencyGuideStep } from '../../constants/emergencyGuideData';

type GuideStepCardProps = {
  step: EmergencyGuideStep;
  index: number;
};

export function GuideStepCard({ step, index }: GuideStepCardProps) {
  return (
    <View className="bg-white border border-memoLine rounded-xl p-4 mb-3">
      <Text className="text-red text-sm tracking-erags">
        STEP {index + 1}
      </Text>
      <Text className="text-black text-body mt-2 leading-6 font-suitBold">
        {step.title}
      </Text>
      <Text className="text-textDim text-sm mt-2 leading-6">
        {step.description}
      </Text>
    </View>
  );
}
