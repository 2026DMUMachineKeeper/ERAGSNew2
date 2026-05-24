import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { EmergencyCompleteActionButton } from '../components/EmergencyComplete/EmergencyCompleteActionButton';
import { EmergencyCompleteHeaderCard } from '../components/EmergencyComplete/EmergencyCompleteHeaderCard';
import { EmergencyCompleteStageCard } from '../components/EmergencyComplete/EmergencyCompleteStageCard';
import { EmergencyCompleteSuppliesCard } from '../components/EmergencyComplete/EmergencyCompleteSuppliesCard';
import {
  EmergencyCompleteSummaryCard,
  type EmergencyCompleteSummaryRow,
} from '../components/EmergencyComplete/EmergencyCompleteSummaryCard';

type Props = NativeStackScreenProps<RootStackParamList, 'EmergencyComplete'>;

const summaryRows: EmergencyCompleteSummaryRow[] = [
  { label: '사고 유형', value: '출혈 / 상처' },
  { label: '처치 계획', value: 'Plan A 완료', valueColor: '#2ECC71' },
  { label: '완료 단계', value: '4 / 4 단계' },
];

const supplies = [
  { name: '멸균붕대', qty: 'x1' },
  { name: '의료용 테이프', qty: 'x1' },
  { name: '소독솜', qty: 'x2' },
  { name: '일회용 장갑', qty: 'x1' },
];

export function EmergencyCompleteScreen({ navigation, route }: Props) {
  const mainLabel = route.params?.mainLabel ?? '구조대 인수인계';
  const elapsedLabel = route.params?.elapsedLabel ?? '07:05';
  const totalSteps = route.params?.totalSteps ?? 4;
  const completedSteps = route.params?.completedSteps ?? totalSteps;

  return (
    <SafeAreaView className="flex-1 bg-[#0F1116]">
      <View className="flex-1 px-4 pt-4 pb-5">
        <View className="mt-6">
          <EmergencyCompleteHeaderCard
            mainLabel={mainLabel}
            elapsedLabel={elapsedLabel}
          />
        </View>

        <View className="mt-4">
          <EmergencyCompleteSummaryCard rows={summaryRows} />
        </View>

        <View className="mt-4">
          <EmergencyCompleteSuppliesCard items={supplies} />
        </View>

        <View className="mt-4">
          <EmergencyCompleteStageCard
            completedSteps={completedSteps}
            totalSteps={totalSteps}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        <EmergencyCompleteActionButton
          title="완료"
          onPress={() => navigation.navigate('Home')}
        />
      </View>
    </SafeAreaView>
  );
}
