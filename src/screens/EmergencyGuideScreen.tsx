import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
import {
  EmergencyGuideRequestError,
  getEmergencyGuideErrorMessage,
  getEmergencyGuideImageUrl,
  retryEmergencyGuide,
  speakTts,
  stopTts,
} from '../services';
import { useEmergencyGuideStore } from '../store';
import type { EmergencyGuideTreatmentStep } from '../types';

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
  stepId: null,
  stepNo: index + 1,
  title: step.title,
  instruction: step.title.replace(/^\d+단계:\s*/, ''),
  checkpointQuestion: step.description,
  requiredItemId: index === 0 ? 1 : null,
  requiredItemName: index === 0 ? '붕대' : null,
  requiredQuantity: index === 0 ? 1 : 0,
  requiredSlotId: index === 0 ? 1 : null,
  imageResource: '',
});

const toServerGuideRuntimeStep = (
  step: EmergencyGuideTreatmentStep,
): EmergencyGuideRuntimeStep => ({
  stepId: step.stepId,
  stepNo: step.stepNo,
  title: `${step.stepNo}단계: ${step.instruction}`,
  instruction: step.instruction,
  checkpointQuestion: step.checkpointQuestion,
  requiredItemId: step.requiredItemId,
  requiredItemName: step.requiredItemName,
  requiredQuantity: step.requiredQuantity,
  requiredSlotId: step.requiredSlotId,
  imageResource: getEmergencyGuideImageUrl(step.imageUrl, step.imageResource),
});

export function EmergencyGuideScreen({ navigation }: EmergencyGuideProps) {
  const storedGuide = useEmergencyGuideStore(state => state.guide);
  const storedMainLabel = useEmergencyGuideStore(state => state.mainLabel);
  const storedSubtypeLabel = useEmergencyGuideStore(
    state => state.subtypeLabel,
  );
  const currentStepIndex = useEmergencyGuideStore(
    state => state.currentStepIndex,
  );
  const elapsedSeconds = useEmergencyGuideStore(state => state.elapsedSeconds);
  const incrementElapsedSeconds = useEmergencyGuideStore(
    state => state.incrementElapsedSeconds,
  );
  const markStepCompleted = useEmergencyGuideStore(
    state => state.markStepCompleted,
  );
  const moveToNextStep = useEmergencyGuideStore(state => state.moveToNextStep);
  const moveToPreviousStep = useEmergencyGuideStore(
    state => state.moveToPreviousStep,
  );
  const setGuide = useEmergencyGuideStore(state => state.setGuide);
  const setHandoverStatus = useEmergencyGuideStore(
    state => state.setHandoverStatus,
  );
  const guide = storedGuide;
  const mainLabel = storedMainLabel;
  const subtypeLabel = storedSubtypeLabel;
  const lastSpokenMessageRef = React.useRef('');
  const [isRetrying, setIsRetrying] = React.useState(false);
  const visibleStepCount = getVisibleStepCount(subtypeLabel);
  const fallbackSteps = emergencyGuideSteps
    .slice(0, visibleStepCount)
    .map(toGuideRuntimeStep);
  const serverSteps =
    guide?.treatment.steps.map(toServerGuideRuntimeStep) ?? [];
  const steps = guide ? serverSteps : fallbackSteps;

  React.useEffect(() => {
    const timer = setInterval(incrementElapsedSeconds, 1000);
    return () => clearInterval(timer);
  }, [incrementElapsedSeconds]);

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const progress = steps.length ? (currentStepIndex + 1) / steps.length : 0;
  const isLastStep = currentStepIndex >= steps.length - 1;
  const currentInstruction = currentStep?.instruction?.trim() ?? '';

  React.useEffect(() => {
    if (
      !currentInstruction ||
      lastSpokenMessageRef.current === currentInstruction
    ) {
      return undefined;
    }

    lastSpokenMessageRef.current = currentInstruction;

    const speakCurrentStep = async (): Promise<void> => {
      try {
        await speakTts(currentInstruction);
      } catch (error) {
        console.error('[EmergencyGuideScreen] TTS 자동 재생 실패:', error);
        Alert.alert('음성 재생 실패', '기기의 음성 합성 설정을 확인해 주세요.');
      }
    };

    speakCurrentStep();

    return () => {
      stopTts().catch(error => {
        console.warn('[EmergencyGuideScreen] TTS 정지 실패:', error);
      });
    };
  }, [currentInstruction]);

  const moveToComplete = (): void => {
    setHandoverStatus('IN_PROGRESS');
    navigation.replace('QRCode');
  };

  const handleNextStep = (): void => {
    markStepCompleted(currentStep?.stepId ?? null);

    if (!isLastStep) {
      moveToNextStep(steps.length);
      return;
    }

    setHandoverStatus('COMPLETED');
    navigation.replace('QRCode');
  };

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      moveToPreviousStep();
    }
  };

  const handleRetryPress = async (): Promise<void> => {
    if (!guide?.sessionId) {
      return;
    }

    setIsRetrying(true);

    try {
      setGuide(await retryEmergencyGuide(guide.sessionId));
    } catch (error) {
      const errorMessage = getEmergencyGuideErrorMessage(error);

      if (error instanceof EmergencyGuideRequestError && error.status === 404) {
        Alert.alert('응급 가이드 재시도 실패', errorMessage, [
          { text: '새 요청', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      Alert.alert('응급 가이드 재시도 실패', errorMessage);
    } finally {
      setIsRetrying(false);
    }
  };

  if (guide && steps.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <GuideHeader
          centerLabel="응급 가이드 상태"
          centerValue={guide.status}
          elapsedLabel={elapsedLabel}
          progress={0}
          showBackButton
          onBackPress={() => navigation.goBack()}
        />

        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-title2 font-suitBold text-black">
            {guide.assessment?.summary ?? '응급처치 안내를 준비하고 있습니다.'}
          </Text>
          <Text className="mt-3 text-center text-body font-suitRegular text-textDim">
            {guide.error
              ? getEmergencyGuideErrorMessage(guide.error)
              : '서버에서 처치 단계가 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.'}
          </Text>
          {guide.sessionId ? (
            <Text className="mt-4 text-center text-coment font-suitRegular text-textDim">
              세션: {guide.sessionId}
            </Text>
          ) : null}
          <TouchableOpacity
            className="mt-8 h-12 items-center justify-center rounded-lg bg-red px-8"
            disabled={isRetrying}
            onPress={guide.sessionId ? handleRetryPress : navigation.goBack}
          >
            {isRetrying ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-body font-suitBold text-white">
                {guide.sessionId ? '다시 시도' : '새 요청'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <GuideHeader
        centerLabel="응급처치 종류"
        centerValue={`${mainLabel}${subtypeLabel ? ` / ${subtypeLabel}` : ''}`}
        elapsedLabel={elapsedLabel}
        progress={progress}
        showBackButton={currentStepIndex > 0}
        onBackPress={handleBackStep}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-4">
          <StepDetail step={currentStep} onStopPress={moveToComplete} />
        </View>
      </ScrollView>

      <View className="bg-background px-5 pb-5">
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
