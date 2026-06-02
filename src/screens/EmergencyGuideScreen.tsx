import React from 'react';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  emergencyGuideSteps,
  emergencyGuideStepCountBySubtype,
  getEmergencySubtypeKey,
} from '../constants/emergencyGuideData';
import { GuideHeader } from '../components/EmergencyGuide/GuideHeader';
import { StepDetail } from '../components/EmergencyGuide/StepDetail';
import { GuideNextButton } from '../components/EmergencyGuide/GuideNextButton';
import { GuideActionButton } from '../components/EmergencyGuide/GuideActionButton';

type EmergencyGuideProps = NativeStackScreenProps<
  RootStackParamList,
  'EmergencyGuide'
>;

const guideSteps = [
  '환자의 상태를 먼저 확인하고, 위험한 환경이면 안전한 곳으로 옮기세요.',
  '의식이 없거나 호흡이 이상하면 즉시 119에 신고하세요.',
  '출혈이 있으면 깨끗한 천으로 압박하고, 심한 통증은 무리하게 움직이지 마세요.',
  '증상이 악화되면 지체하지 말고 응급실로 이동하세요.',
];

export function EmergencyGuideScreen({
  navigation,
  route,
}: EmergencyGuideProps) {
  const mainLabel = route.params?.mainLabel ?? '응급';
  const subtypeLabel = route.params?.subtypeLabel ?? '세부 유형';
  const subtypeKey = getEmergencySubtypeKey(subtypeLabel);
  const stepCount = emergencyGuideStepCountBySubtype[subtypeKey];
  const guideSteps = emergencyGuideSteps.slice(0, stepCount);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(current => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    '0',
  )}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const currentStep = guideSteps[currentStepIndex] ?? guideSteps[0];
  const progress = guideSteps.length
    ? (currentStepIndex + 1) / guideSteps.length
    : 0;

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(current => current - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < guideSteps.length - 1) {
      setCurrentStepIndex(current => current + 1);
      return;
    }

    navigation.navigate('EmergencyComplete', {
      mainLabel,
      subtypeLabel,
      elapsedLabel,
      completedSteps: guideSteps.length,
      totalSteps: guideSteps.length,
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <GuideHeader
        centerLabel="응급처치 종류"
        centerValue={`${mainLabel} / ${subtypeLabel}`}
        elapsedLabel={elapsedLabel}
        progress={progress}
        showBackButton={currentStepIndex > 0}
        onBackPress={handleBackStep}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <StepDetail
          step={currentStep}
          onStopPress={() => navigation.goBack()}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <GuideNextButton
          title={
            currentStepIndex < guideSteps.length - 1 ? '다음 단계' : '완료'
          }
          onPress={handleNextStep}
        />
      </View>
    </SafeAreaView>
  );
}
