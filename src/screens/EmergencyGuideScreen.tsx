import React from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import { AssessmentOnlyModal } from './emergencyGuide/components/AssessmentOnlyModal';
import {
  EmergencyGuideRequestError,
  getEmergencyGuideErrorMessage,
  getEmergencyGuideImageUrl,
  retryEmergencyGuide,
  requestTtsVoiceDataInstallation,
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
  const syncElapsedSeconds = useEmergencyGuideStore(
    state => state.syncElapsedSeconds,
  );
  const markStepCompleted = useEmergencyGuideStore(
    state => state.markStepCompleted,
  );
  const completedStepIds = useEmergencyGuideStore(
    state => state.completedStepIds,
  );
  const moveToNextStep = useEmergencyGuideStore(state => state.moveToNextStep);
  const moveToPreviousStep = useEmergencyGuideStore(
    state => state.moveToPreviousStep,
  );
  const setGuide = useEmergencyGuideStore(state => state.setGuide);
  const setHandoverStatus = useEmergencyGuideStore(
    state => state.setHandoverStatus,
  );
  const resetGuide = useEmergencyGuideStore(state => state.resetGuide);
  const guide = storedGuide;
  const mainLabel = storedMainLabel;
  const subtypeLabel = storedSubtypeLabel;
  const lastSpokenMessageRef = React.useRef('');
  const isStartingNewRequestRef = React.useRef(false);
  const shouldRetryTtsAfterInstallationRef = React.useRef(false);
  // 음성 재생에 한 번 실패하면 단계마다 같은 안내 창이 뜨지 않도록 자동 재생을 멈춥니다.
  const isTtsUnavailableRef = React.useRef(false);
  const hasShownTtsErrorAlertRef = React.useRef(false);
  const [ttsRetryCount, setTtsRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  // 진행 중인 재시도 요청입니다. 연타를 막고 화면을 떠날 때 취소하는 데 씁니다.
  const retryControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(
    () => () => {
      retryControllerRef.current?.abort();
    },
    [],
  );
  const visibleStepCount = getVisibleStepCount(subtypeLabel);
  const fallbackSteps = emergencyGuideSteps
    .slice(0, visibleStepCount)
    .map(toGuideRuntimeStep);
  const serverSteps =
    guide?.status === 'ASSESSMENT_ONLY'
      ? []
      : guide?.treatment.steps.map(toServerGuideRuntimeStep) ?? [];
  const steps = guide ? serverSteps : fallbackSteps;

  React.useEffect(() => {
    syncElapsedSeconds();
    const timer = setInterval(syncElapsedSeconds, 1000);
    // 백그라운드에서는 타이머가 멈추므로 앱으로 돌아오면 바로 실제 경과 시간을 반영합니다.
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        syncElapsedSeconds();
      }
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [syncElapsedSeconds]);

  const currentStep = steps[currentStepIndex] ?? steps[0];
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const progress = steps.length ? (currentStepIndex + 1) / steps.length : 0;
  const isLastStep = currentStepIndex >= steps.length - 1;
  const isCurrentStepCompleted =
    currentStep?.stepId != null &&
    completedStepIds.includes(currentStep.stepId);
  const currentInstruction = currentStep?.instruction?.trim() ?? '';

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && shouldRetryTtsAfterInstallationRef.current) {
        shouldRetryTtsAfterInstallationRef.current = false;
        isTtsUnavailableRef.current = false;
        lastSpokenMessageRef.current = '';
        setTtsRetryCount(count => count + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  React.useEffect(() => {
    if (
      isStartingNewRequestRef.current ||
      isTtsUnavailableRef.current ||
      !currentInstruction ||
      lastSpokenMessageRef.current === currentInstruction
    ) {
      return undefined;
    }

    lastSpokenMessageRef.current = currentInstruction;
    const speechController = new AbortController();

    const speakCurrentStep = async (): Promise<void> => {
      try {
        await speakTts(currentInstruction, speechController.signal);
      } catch (error) {
        if (speechController.signal.aborted) {
          return;
        }
        console.error('[EmergencyGuideScreen] TTS 자동 재생 실패:', error);
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'lang_missing_data'
        ) {
          // 음성 데이터가 없으면 설치 전까지는 실패가 반복되므로 자동 재생을 멈춥니다.
          isTtsUnavailableRef.current = true;
          Alert.alert(
            '한국어 음성 데이터가 필요해요',
            '한국어 음성 데이터를 설치한 뒤 돌아오면 음성 안내를 다시 시도합니다. 설치 전에도 화면의 처치 안내를 계속 확인할 수 있습니다.',
            [
              { text: '텍스트로 계속', style: 'cancel' },
              {
                text: '음성 데이터 설치',
                onPress: async (): Promise<void> => {
                  shouldRetryTtsAfterInstallationRef.current = true;
                  try {
                    await requestTtsVoiceDataInstallation();
                  } catch (installationError) {
                    shouldRetryTtsAfterInstallationRef.current = false;
                    console.warn('[EmergencyGuideScreen] 음성 데이터 설치 화면 열기 실패:', installationError);
                    Alert.alert(
                      '음성 데이터 설치 안내',
                      '설치 화면을 열지 못했습니다. 기기의 설정에서 텍스트 음성 변환을 찾아 한국어 음성 데이터를 설치해 주세요.',
                    );
                  }
                },
              },
            ],
          );
          return;
        }
        // 일시적 오류(오디오 포커스 등)는 다음 단계에서 다시 시도하되, 안내 창은 한 번만 띄웁니다.
        if (!hasShownTtsErrorAlertRef.current) {
          hasShownTtsErrorAlertRef.current = true;
          Alert.alert('음성 재생 실패', '기기의 음성 합성 설정을 확인해 주세요.');
        }
      }
    };

    speakCurrentStep();

    return () => {
      speechController.abort();
      stopTts().catch(error => {
        console.warn('[EmergencyGuideScreen] TTS 정지 실패:', error);
      });
    };
  }, [currentInstruction, ttsRetryCount]);

  const handleStopPress = (hasCompletedCurrentStep: boolean): void => {
    if (!hasCompletedCurrentStep && completedStepIds.length === 0) {
      resetGuide();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      return;
    }

    if (hasCompletedCurrentStep) {
      markStepCompleted(currentStep?.stepId ?? null);
    }

    setHandoverStatus('IN_PROGRESS');
    navigation.replace('QRCode');
  };

  const handleNextStep = (): void => {
    if (!currentStep) {
      return;
    }

    const handleConfirmCompletion = (): void => {
      markStepCompleted(currentStep.stepId);

      if (!isLastStep) {
        moveToNextStep(steps.length);
        return;
      }

      setHandoverStatus('COMPLETED');
      navigation.replace('QRCode');
    };

    if (isCurrentStepCompleted) {
      handleConfirmCompletion();
      return;
    }

    Alert.alert(
      '처치 완료 확인',
      `${currentStep.stepNo}단계: ${currentInstruction}\n\n이 단계의 처치를 완료했나요?`,
      [
        { text: '아직 안 했어요', style: 'cancel' },
        { text: '완료했어요', onPress: handleConfirmCompletion },
      ],
      { cancelable: true },
    );
  };

  const handleBackStep = () => {
    if (currentStepIndex > 0) {
      moveToPreviousStep();
    }
  };

  const handleRetryPress = async (): Promise<void> => {
    const sessionId = guide?.sessionId;
    if (!sessionId || retryControllerRef.current) {
      return;
    }

    const retryController = new AbortController();
    retryControllerRef.current = retryController;
    setIsRetrying(true);

    try {
      const retriedGuide = await retryEmergencyGuide(
        sessionId,
        retryController.signal,
      );
      // 응답 전에 화면을 떠났거나 새 가이드가 시작됐다면 늦은 응답으로 덮어쓰지 않습니다.
      if (
        retryController.signal.aborted ||
        useEmergencyGuideStore.getState().guide?.sessionId !== sessionId
      ) {
        return;
      }
      setGuide(retriedGuide);
    } catch (error) {
      if (retryController.signal.aborted) {
        return;
      }
      const errorMessage = getEmergencyGuideErrorMessage(error);

      if (error instanceof EmergencyGuideRequestError && error.status === 404) {
        Alert.alert('응급 가이드 재시도 실패', errorMessage, [
          { text: '새 요청', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      Alert.alert('응급 가이드 재시도 실패', errorMessage);
    } finally {
      if (retryControllerRef.current === retryController) {
        retryControllerRef.current = null;
      }
      if (!retryController.signal.aborted) {
        setIsRetrying(false);
      }
    }
  };

  const handleNewRequestPress = (): void => {
    isStartingNewRequestRef.current = true;
    resetGuide();
    navigation.popTo('FirstAid');
  };

  if (guide?.status === 'ASSESSMENT_ONLY') {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <AssessmentOnlyModal
          assessment={guide.assessment}
          onClose={() => navigation.goBack()}
          onNewRequest={handleNewRequestPress}
        />
      </SafeAreaView>
    );
  }

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
          <StepDetail
            step={currentStep}
            isStepCompleted={isCurrentStepCompleted}
            onStopPress={handleStopPress}
          />
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
