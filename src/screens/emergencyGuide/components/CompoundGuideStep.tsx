import React from 'react';
import { View } from 'react-native';
import { StepDetail } from '@/components/EmergencyGuide/StepDetail';
import type { CompoundExecutionStep, CompoundGuidePlan } from '@/types';
import { getEmergencyGuideImageUrl } from '@/services';
import { getCompoundStepPresentation } from '@/utils/compoundGuidePresentation';

interface Props {
  plan: CompoundGuidePlan;
  step: CompoundExecutionStep;
  stepIndex: number;
  isStepCompleted?: boolean;
  canCompleteOnStop?: boolean;
  onStopPress?: (hasCompletedCurrentStep: boolean) => void;
}
export const CompoundGuideStep = ({
  plan,
  step,
  stepIndex,
  isStepCompleted,
  canCompleteOnStop,
  onStopPress,
}: Props): React.JSX.Element => {
  const presentation = getCompoundStepPresentation(plan, step);
  return (
    <View testID="compound-current-guide">
      <StepDetail
        key={step.executionStepId}
        step={{
          stepNo: stepIndex + 1,
          instruction: step.instruction,
          checkpointQuestion: presentation.checkpoints.join('\n'),
          imageResource: '',
        }}
        images={presentation.sources.map(source => ({
          uri: getEmergencyGuideImageUrl(
            source.step.imageUrl ?? null,
            source.step.imageResource,
          ),
          label: source.label,
        }))}
        supplies={presentation.supplies.map(unit => ({
          name: unit.name,
          quantity: unit.quantity,
        }))}
        isStepCompleted={isStepCompleted}
        canCompleteOnStop={canCompleteOnStop}
        onStopPress={onStopPress}
      />
    </View>
  );
};
