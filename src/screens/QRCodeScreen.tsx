import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useEmergencyGuideStore } from '../store';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCode'>;

export function QRCodeScreen({ navigation }: Props) {
  const guide = useEmergencyGuideStore(state => state.guide);
  const mainLabel = useEmergencyGuideStore(state => state.mainLabel);
  const currentStepIndex = useEmergencyGuideStore(
    state => state.currentStepIndex,
  );
  const elapsedSeconds = useEmergencyGuideStore(state => state.elapsedSeconds);
  const resetGuide = useEmergencyGuideStore(state => state.resetGuide);
  const incidentType = mainLabel;
  const totalTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    '0',
  )}분 ${String(elapsedSeconds % 60).padStart(2, '0')}초`;
  const total = guide?.treatment.steps.length ?? 0;
  const completed = total > 0 ? Math.min(currentStepIndex + 1, total) : 0;
  const items =
    guide?.treatment.steps.flatMap(step =>
      step.requiredItemName
        ? [`${step.requiredItemName} x${step.requiredQuantity}`]
        : [],
    ) ?? [];
  const qrPayload = [
    `SESSION:${guide?.sessionId ?? 'UNKNOWN'}`,
    `TYPE:${guide?.assessment?.categoryCode ?? incidentType}`,
    `STEPS:${completed}/${total}`,
    `ITEMS:${items.length}`,
  ].join('|');

  const handleHomePress = (): void => {
    resetGuide();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="mt-10" />

      <ScrollView>
        <View className="px-4 pb-[140px]">
          <Text className="text-black text-body text-center">
            구조대원에게 QR 코드를 보여주세요.
          </Text>

          <View className="bg-white rounded-2xl p-6 items-center mt-3">
            <View className="w-full aspect-square bg-black rounded-xl items-center justify-center">
              <Text className="text-white">QR CODE</Text>
            </View>
            <Text className="text-placeholder text-xs mt-3 text-center">
              {qrPayload}
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mt-5">
            <Text className="text-warning text-sm mb-3">처치 요약</Text>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">사고 유형</Text>
              <Text className="text-black">{incidentType}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">총 처치 시간</Text>
              <Text className="text-black">{totalTime}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-memoLine">
              <Text className="text-black">완료 단계</Text>
              <Text className="text-success font-medium">
                {`${completed} / ${total} 완료`}
              </Text>
            </View>

            <View className="mt-3">
              <Text className="text-black mb-2">사용된 약품/물품</Text>
              <View className="flex-row flex-wrap">
                {items.length === 0 ? (
                  <Text className="text-sm text-placeholder">
                    사용된 약품/물품이 없습니다.
                  </Text>
                ) : null}
                {items.map((item, index) => (
                  <View
                    key={`${item}-${index}`}
                    className="bg-memoBg px-3 py-2 rounded-full mr-2 mb-2"
                  >
                    <Text className="text-warning text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-background px-5 pb-5">
        <Pressable
          onPress={handleHomePress}
          className="h-14 bg-red rounded-2xl items-center justify-center"
        >
          <Text className="text-white font-bold">홈으로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
