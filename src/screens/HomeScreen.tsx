import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import {
  useIsFocused,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';

import { CameraIcon, MicIcon } from '@/assets/icons';
import type { MainTabParamList } from '@/navigation/MainTabNavigator';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideResponse, MedicineAlert } from '@/types';
import { medicineAlertsQueryOptions } from '@/query';
import { getApiErrorUserMessage } from '@/services/apiError.service';
import { isAuthSessionExpiredError } from '@/services/auth.service';
import { redirectToLoginForExpiredSession } from '@/utils/authSessionNavigation';

import {
  EmergencyInputWaitingModal,
  EmergencySupportSection,
  HomeHeader,
  PhotoSymptomInputModal,
  QuickActionCard,
} from './home/components';
import { useHomeEmergencyActions } from './home/useHomeEmergencyActions';
import { MedicineAlertsModal } from './home/components/MedicineAlertsModal';

import tailwindConfig from '../../tailwind.config';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { colors } = tailwindConfig;

export const HomeScreen = ({
  navigation,
}: HomeScreenProps): React.JSX.Element => {
  const [isAlertsOpen, setIsAlertsOpen] = React.useState(false);
  const isFocused = useIsFocused();
  const {
    data: alerts = [],
    error: alertsQueryError,
    isPending: isAlertsLoading,
    refetch: refetchAlerts,
  } = useQuery({ ...medicineAlertsQueryOptions, enabled: isFocused });
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const rootNavigation = React.useMemo(
    () => navigation.getParent<NativeStackNavigationProp<RootStackParamList>>(),
    [navigation],
  );

  React.useEffect((): void => {
    if (alertsQueryError && isAuthSessionExpiredError(alertsQueryError)) {
      redirectToLoginForExpiredSession(rootNavigation);
    }
  }, [alertsQueryError, rootNavigation]);

  const handleAlertMedicinePress = React.useCallback(
    (medicine: MedicineAlert): void => {
      setIsAlertsOpen(false);
      navigation.navigate('MedicinesTab');
      navigation.navigate('MedicineDetail', { medicineId: medicine.id });
    },
    [navigation],
  );
  const handleGuideCreated = React.useCallback(
    (source: 'image' | 'voice', guide: EmergencyGuideResponse): void => {
      startGuide({ guide, source });
      navigation.navigate('EmergencyGuide');
    },
    [navigation, startGuide],
  );
  const {
    isListening,
    isPhotoVoiceRecording,
    isPhotoVoiceStarting,
    isVisionUploading,
    isVoiceProcessing,
    photoAdditionalText,
    photoCount,
    photoInputStep,
    photoUris,
    visionStatus,
    voiceStatus,
    handleAddPhotoPress,
    handleEmergencyReportPress,
    handlePhotoInputBack,
    handlePhotoFlowCancel,
    handlePhotoPress,
    handleRemovePhoto,
    handlePhotoTextChange,
    handlePhotoTextSubmit,
    handlePhotoVoiceSubmit,
    handleStartPhotoVoice,
    handleSelectPhotoText,
    handleSelectPhotoVoice,
    handleSendPhotosOnly,
    handleVoicePress,
  } = useHomeEmergencyActions(handleGuideCreated);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <HomeHeader />

      <TouchableOpacity
        accessibilityLabel={`약품 알림${
          alerts.length > 0 ? ` ${alerts.length}개` : ''
        }`}
        accessibilityRole="button"
        className="absolute right-4 top-6 z-20 h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
        onPress={() => setIsAlertsOpen(true)}
      >
        <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
            stroke={colors.appBg}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        {alerts.length > 0 ? (
          <View className="absolute -right-1 -top-1 min-w-[18px] items-center justify-center rounded-full bg-red px-1">
            <Text className="text-[10px] font-suitBold text-white">
              {alerts.length > 99 ? '99+' : alerts.length}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

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

      <MedicineAlertsModal
        isVisible={isAlertsOpen}
        isLoading={isAlertsLoading}
        errorMessage={
          alertsQueryError && !isAuthSessionExpiredError(alertsQueryError)
            ? getApiErrorUserMessage(alertsQueryError, {
                fallbackMessage: '약품 알림을 불러오지 못했습니다.',
              })
            : null
        }
        alerts={alerts}
        onClose={() => setIsAlertsOpen(false)}
        onRetry={() => {
          refetchAlerts().catch((error: unknown) => {
            console.warn('[HomeScreen] 약품 알림 재조회 실패:', error);
          });
        }}
        onPressMedicine={handleAlertMedicinePress}
      />

      <PhotoSymptomInputModal
        additionalText={photoAdditionalText}
        isUploading={isVisionUploading}
        isVoiceRecording={isPhotoVoiceRecording}
        isVoiceStarting={isPhotoVoiceStarting}
        photoCount={photoCount}
        photoUris={photoUris}
        step={photoInputStep}
        onAddPhoto={handleAddPhotoPress}
        onBack={handlePhotoInputBack}
        onCancel={handlePhotoFlowCancel}
        onChangeAdditionalText={handlePhotoTextChange}
        onRemovePhoto={handleRemovePhoto}
        onSelectText={handleSelectPhotoText}
        onSelectVoice={handleSelectPhotoVoice}
        onStartVoice={handleStartPhotoVoice}
        onSendPhotosOnly={handleSendPhotosOnly}
        onSubmitText={handlePhotoTextSubmit}
        onSubmitVoice={handlePhotoVoiceSubmit}
      />

      <EmergencyInputWaitingModal
        isVisible={isVoiceProcessing}
        message="음성 입력을 전송하고 분석하고 있습니다."
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
