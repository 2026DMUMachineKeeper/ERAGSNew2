import React from 'react';
import { View } from 'react-native';
import type { EmergencyGuideStep } from '../../constants/emergencyGuideData';
import { GuideStepCard } from './GuideStepCard';

type GuideStepListProps = {
  steps: EmergencyGuideStep[];
};

export function GuideStepList({ steps }: GuideStepListProps) {
  return (
    <View className="mt-4">
      {steps.map((step, index) => (
        <GuideStepCard key={step.id} step={step} index={index} />
      ))}
    </View>
  );
}
