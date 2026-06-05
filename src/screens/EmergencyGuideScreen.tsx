import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTreatment } from '../erags-sm1/context/TreatmentContext';
import { GuideHeader } from '../components/EmergencyGuide/GuideHeader';
import { StepDetail } from '../components/EmergencyGuide/StepDetail';
import { GuideNextButton } from '../components/EmergencyGuide/GuideNextButton';

type EmergencyGuideProps = NativeStackScreenProps<
  RootStackParamList,
  'EmergencyGuide'
>;

const LOADING_STATES = [
  'checkingPlanInventory',
  'savingInventory',
  'savingLog',
  'finalizing',
  'switchingPlan',
];
const ERROR_STATES = [
  'serverUnavailable',
  'logSaveFailed',
  'inventoryInsufficient',
  'inventorySaveFailed',
  'completionFailed',
  'emergencyQrFailed',
];

export function EmergencyGuideScreen({
  navigation,
  route,
}: EmergencyGuideProps) {
  const treatment = useTreatment();
  const mainLabel = route.params?.mainLabel ?? '응급';
  const subtypeLabel = route.params?.subtypeLabel ?? '';

  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 세션 완료 시 완료 화면으로 이동
  React.useEffect(() => {
    if (
      treatment.state === 'completed' ||
      treatment.state === 'emergencyOverride'
    ) {
      const { steps, currentIndex } = treatment.context;
      const elapsedLabel = formatElapsed(elapsedSeconds);
      navigation.replace('EmergencyComplete', {
        mainLabel,
        subtypeLabel,
        elapsedLabel,
        completedSteps: currentIndex + 1,
        totalSteps: steps.length,
      });
    }
  }, [
    elapsedSeconds,
    mainLabel,
    navigation,
    subtypeLabel,
    treatment.context,
    treatment.state,
  ]);

  const { steps, currentIndex, isChecked } = treatment.context;
  const currentStep = steps[currentIndex] ??
    steps[0] ?? {
      stepNo: 1,
      instruction: '응급처치 단계를 불러오는 중입니다.',
      checkpointQuestion: '',
      requiredItemId: null,
      requiredSlotId: null,
      imageResource: '',
    };
  const progress = steps.length ? (currentIndex + 1) / steps.length : 0;
  const elapsedLabel = formatElapsed(elapsedSeconds);

  const isLoading = LOADING_STATES.includes(treatment.state as string);
  const isError = ERROR_STATES.includes(treatment.state as string);
  const isCheckPoint = treatment.state === 'checkPoint';
  const isShowStep = treatment.state === 'showStep';
  const isLastStep = currentIndex >= steps.length - 1;

  const hasRealSteps = steps.length > 0;

  React.useEffect(() => {
    console.log('[ERAGS EmergencyGuideScreen] render', {
      state: treatment.state,
      sessionId: treatment.context.session?.sessionId ?? null,
      stepsLength: steps.length,
      currentIndex,
      currentStepNo: currentStep.stepNo,
      currentStepInstruction: currentStep.instruction,
    });
  }, [
    currentIndex,
    currentStep.instruction,
    currentStep.stepNo,
    steps.length,
    treatment.context.session,
    treatment.state,
  ]);
  React.useEffect(() => {
    console.log('[Treatment Debug]', {
      state: treatment.state,
      lastError: treatment.context.lastError,

      currentStep,

      requiredItemId: currentStep?.requiredItemId,
      requiredSlotId: currentStep?.requiredSlotId,

      stepsLength: steps.length,
      currentIndex,
    });
  }, [
    treatment.state,
    treatment.context.lastError,
    currentStep,
    steps.length,
    currentIndex,
  ]);
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <GuideHeader
        centerLabel="응급처치 종류"
        centerValue={`${mainLabel}${subtypeLabel ? ` / ${subtypeLabel}` : ''}`}
        elapsedLabel={elapsedLabel}
        progress={progress}
        showBackButton={false}
        onBackPress={() => {}}
      />

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <StepDetail
          step={currentStep}
          isChecked={isChecked as boolean}
          showCheckpoint={isCheckPoint}
          onToggle={checked => treatment.toggle(checked)}
          onStopPress={() => navigation.goBack()}
        />

        {!hasRealSteps && (
          <View className="mt-4 p-4 rounded-xl border border-[#2B303A] bg-[#1E2530]">
            <Text className="text-sm text-[#BFE8D0] text-center">
              가이드 단계를 불러오지 못했거나 아직 응답을 기다리는 중입니다.
            </Text>
          </View>
        )}

        {isLoading && (
          <View className="mt-6 items-center">
            <ActivityIndicator color="#FFFFFF" />
            <Text className="text-gray mt-2 text-sm">처리 중...</Text>
          </View>
        )}

        {isError && (
          <View className="mt-6 p-4 bg-[#2A1D1D] rounded-xl border border-[#FF3B3B]">
            <Text className="text-[#FF6B6B] text-sm text-center">
              {treatment.context.lastError?.message ?? '오류가 발생했습니다.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        {isShowStep && (
          <GuideNextButton
            title={isLastStep ? '완료 확인' : '다음 단계'}
            onPress={() => treatment.next()}
          />
        )}

        {isCheckPoint && (
          <TouchableOpacity
            className={`h-16 rounded-lg justify-center items-center mt-6 mb-6 ${
              isChecked ? 'bg-[#2ECC71]' : 'bg-[#3A3A3A]'
            }`}
            disabled={!isChecked}
            onPress={() => treatment.confirm()}
          >
            <Text className="text-white font-bold">완료</Text>
          </TouchableOpacity>
        )}

        {isError && (
          <TouchableOpacity
            className="h-16 bg-[#AF2E26] rounded-lg justify-center items-center mt-6 mb-6"
            onPress={() => treatment.retry()}
          >
            <Text className="text-white font-bold">재시도</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatElapsed(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}
