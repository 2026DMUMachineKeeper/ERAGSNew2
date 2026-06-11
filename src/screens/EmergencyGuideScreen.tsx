import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  emergencyGuideSteps,
  type EmergencyGuideRuntimeStep,
} from '../constants/emergencyGuideData';
import { GuideHeader } from '../components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '../components/EmergencyGuide/GuideNextButton';
import { StepDetail } from '../components/EmergencyGuide/StepDetail';

type EmergencyGuideProps = NativeStackScreenProps<
  RootStackParamList,
  'EmergencyGuide'
>;

const getVisibleStepCount = (label?: string) => {
  if (!label) {
    return emergencyGuideSteps.length;
  }
  if (label.includes('경미')) {
    return 2;
  }
  if (label.includes('일반') || label.includes('중간')) {
    return 3;
  }
  return emergencyGuideSteps.length;
};

const toGuideRuntimeStep = (
  step: (typeof emergencyGuideSteps)[number],
  index: number,
): EmergencyGuideRuntimeStep => ({
  stepNo: index + 1,
  title: step.title,
  instruction: step.title.replace(/^\d+단계:\s*/, ''),
  checkpointQuestion: step.description,
  requiredItemId: index === 0 ? 1 : null,
  requiredSlotId: index === 0 ? 1 : null,
  imageResource: '',
});

export function EmergencyGuideScreen({
  navigation,
  route,
}: EmergencyGuideProps) {
  const mainLabel = route.params?.mainLabel ?? '응급';
  const subtypeLabel = route.params?.subtypeLabel ?? '';
  const visibleStepCount = getVisibleStepCount(subtypeLabel);
  const steps = emergencyGuideSteps
    .slice(0, visibleStepCount)
    .map(toGuideRuntimeStep);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isChecked, setIsChecked] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    setIsChecked(false);
  }, [currentStepIndex]);

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const progress = steps.length ? (currentStepIndex + 1) / steps.length : 0;
  const isLastStep = currentStepIndex >= steps.length - 1;

  const moveToComplete = () => {
    navigation.replace('EmergencyComplete', {
      mainLabel,
      subtypeLabel,
      elapsedLabel,
      completedSteps: currentStepIndex + 1,
      totalSteps: steps.length,
    });
  };

  const handleNextStep = () => {
    if (!isLastStep) {
      setCurrentStepIndex(index => index + 1);
      return;
    }

    moveToComplete();
  };

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(index => index - 1);
      return;
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <GuideHeader
        centerLabel="응급처치 종류"
        centerValue={`${mainLabel}${subtypeLabel ? ` / ${subtypeLabel}` : ''}`}
        elapsedLabel={elapsedLabel}
        progress={progress}
        showBackButton
        onBackPress={handleBackStep}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <StepDetail
          step={currentStep}
          isChecked={isChecked}
          showCheckpoint
          onToggle={setIsChecked}
          onStopPress={moveToComplete}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <GuideNextButton
          title={isLastStep ? '완료' : '다음 단계'}
          onPress={handleNextStep}
        />
      </View>
    </SafeAreaView>
  );
}

function formatElapsed(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
