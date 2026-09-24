import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HandoverSummary } from './qrCode/components/HandoverSummary';
import { HandoverQrCard } from './qrCode/components/HandoverQrCard';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useEmergencyHandoverQr } from '@/hooks/useEmergencyHandoverQr';
import { useEmergencyGuideStore } from '@/store';
import type {
  EmergencyGuideHandoverCompletedTreatment,
  EmergencyGuideHandoverUsedSupply,
  EmergencyGuideTreatmentStep,
} from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCode'>;

const createLocalUsedSupplies = (
  completedSteps: EmergencyGuideTreatmentStep[],
): EmergencyGuideHandoverUsedSupply[] => {
  const quantityByName = new Map<string, number>();

  completedSteps.forEach(step => {
    const name = step.requiredItemName?.trim();
    if (!name || step.requiredQuantity <= 0) {
      return;
    }

    quantityByName.set(
      name,
      (quantityByName.get(name) ?? 0) + step.requiredQuantity,
    );
  });

  return Array.from(quantityByName, ([name, quantity]) => ({ name, quantity }));
};

export function QRCodeScreen({ navigation }: Props): React.JSX.Element {
  const guide = useEmergencyGuideStore(state => state.guide);
  const mainLabel = useEmergencyGuideStore(state => state.mainLabel);
  const completedStepIds = useEmergencyGuideStore(
    state => state.completedStepIds,
  );
  const handoverStatus = useEmergencyGuideStore(state => state.handoverStatus);
  const resetGuide = useEmergencyGuideStore(state => state.resetGuide);
  const {
    handover,
    qrSvg,
    handoverError,
    isIssuingQr,
    isHandoverUnavailable,
    handleQrRenderError,
  } = useEmergencyHandoverQr({
    sessionId: guide?.sessionId,
    completedStepIds,
    handoverStatus,
  });
  const completedStepIdSet = React.useMemo(
    () => new Set(completedStepIds),
    [completedStepIds],
  );
  const localCompletedSteps = React.useMemo(
    () =>
      guide?.treatment.steps.filter(
        step => step.stepId !== null && completedStepIdSet.has(step.stepId),
      ) ?? [],
    [completedStepIdSet, guide?.treatment.steps],
  );

  const snapshot = handover?.snapshot;
  const assessment = snapshot?.assessment ?? guide?.assessment;
  const patientContext = guide?.patientContext;
  const completedTreatments: EmergencyGuideHandoverCompletedTreatment[] =
    snapshot?.completedTreatments ??
    localCompletedSteps.map(step => ({
      stepId: step.stepId as number,
      stepNo: step.stepNo,
      instruction: step.instruction,
    }));
  const usedSupplies =
    snapshot?.usedSupplies ?? createLocalUsedSupplies(localCompletedSteps);
  const consciousness =
    snapshot?.assessment.consciousness ??
    patientContext?.consciousness ??
    'UNKNOWN';
  const ageGroup =
    snapshot?.assessment.ageGroup ?? patientContext?.ageGroup ?? 'UNKNOWN';
  const handleHomePress = (): void => {
    resetGuide();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <ScrollView>
        <View className="px-4 pb-[140px] pt-10">
          <Text className="text-center text-body font-suitBold text-black">
            구조대원 인계 요약
          </Text>

          <HandoverSummary
            assessment={assessment}
            mainLabel={mainLabel}
            consciousness={consciousness}
            ageGroup={ageGroup}
            completedTreatments={completedTreatments}
            usedSupplies={usedSupplies}
          />
          <HandoverQrCard
            isIssuingQr={isIssuingQr}
            isHandoverUnavailable={isHandoverUnavailable}
            qrSvg={qrSvg}
            handoverError={handoverError}
            onRenderError={handleQrRenderError}
          />
          <Pressable
            onPress={() => navigation.navigate('WasteGuide')}
            className="mt-4 h-14 items-center justify-center rounded-2xl border border-red bg-white"
          >
            <Text className="font-suitBold text-red">
              폐기물 배출 안내 보기
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View className="bg-background px-5 pb-5">
        <Pressable
          onPress={handleHomePress}
          className="h-14 items-center justify-center rounded-2xl bg-red"
        >
          <Text className="font-suitBold text-white">홈으로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
