import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackIcon } from '@/assets';
import { useEmergencyGuideStore } from '@/store';
import type { RootStackParamList } from '@/navigation/RootNavigator';

import { WasteGuideCard } from './wasteGuide/components/WasteGuideCard';

type Props = NativeStackScreenProps<RootStackParamList, 'WasteGuide'>;

export function WasteGuideScreen({ navigation }: Props): React.JSX.Element {
  const sessionId = useEmergencyGuideStore(state => state.guide?.sessionId);
  const items = useEmergencyGuideStore(state => state.wasteGuide);
  const errorMessage = useEmergencyGuideStore(state => state.wasteGuideError);
  const isLoading = useEmergencyGuideStore(state => state.isWasteGuideLoading);
  const resolvedErrorMessage = sessionId
    ? errorMessage
    : '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-5 pb-3 pt-6">
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          className="h-11 w-11 items-start justify-center"
          hitSlop={10}
          onPress={() => navigation.goBack()}
        >
          <BackIcon width={26} height={26} />
        </Pressable>
        <Text className="mt-2 text-title font-suitBold text-black">
          폐기물 배출 안내
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <WasteGuideCard
          items={items}
          errorMessage={resolvedErrorMessage}
          isLoading={isLoading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
