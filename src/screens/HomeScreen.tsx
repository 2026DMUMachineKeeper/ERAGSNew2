import React from 'react';
import { Text, View } from 'react-native';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CameraIcon, MicIcon } from '@/assets/icons';
import type { MainTabParamList } from '@/navigation/MainTabNavigator';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse } from '@/types';

import {
  EmergencySupportSection,
  HomeHeader,
  QuickActionCard,
} from './home/components';
import { useHomeEmergencyActions } from './home/useHomeEmergencyActions';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const HomeScreen = ({
  navigation,
}: HomeScreenProps): React.JSX.Element => {
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const handleGuideCreated = React.useCallback(
    (source: 'image' | 'voice', guide: EmergencyGuideResponse): void => {
      startGuide({ guide, source });
      navigation.navigate('EmergencyGuide');
    },
    [navigation, startGuide],
  );
  const {
    isListening,
    isVisionUploading,
    isVoiceProcessing,
    visionStatus,
    voiceStatus,
    handleEmergencyReportPress,
    handlePhotoPress,
    handleVoicePress,
  } = useHomeEmergencyActions(handleGuideCreated);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <HomeHeader />

      <View className="mt-5 px-4">
        <Text className="mb-3 text-body font-suitSemiBold text-textDim">
          빠른 상황 전달
        </Text>
        <View className="w-full flex-row">
          <View className="mr-1.5 flex-1">
            <QuickActionCard
              description={
                voiceStatus ?? '다친 부분을 음성으로\n설명해 주세요.'
              }
              icon={<MicIcon height={40} width={40} />}
              isLoading={isVoiceProcessing}
              title={isListening ? '입력 종료 및 전송' : '음성으로 설명'}
              onPress={handleVoicePress}
            />
          </View>
          <View className="ml-1.5 flex-1">
            <QuickActionCard
              description={visionStatus ?? '다친 부분을 촬영해\n주세요.'}
              icon={<CameraIcon height={40} width={40} />}
              isLoading={isVisionUploading}
              title="사진 촬영"
              onPress={handlePhotoPress}
            />
          </View>
        </View>

        <EmergencySupportSection
          onFirstAidPress={() => navigation.navigate('FirstAid')}
          onReportPress={handleEmergencyReportPress}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
