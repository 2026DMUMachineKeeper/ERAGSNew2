import React from 'react';
import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import type { EmergencyGuideAssessment } from '@/types';

interface Props {
  assessment: Pick<
    EmergencyGuideAssessment,
    'call119Required' | 'redFlags'
  > | null;
  variant?: 'step' | 'status';
}

export const EmergencyCallNotice = ({
  assessment,
  variant = 'step',
}: Props): React.JSX.Element => {
  const handleCall119 = (): void => {
    Linking.openURL('tel:119').catch(() =>
      Alert.alert('전화 연결 안내', '전화 앱에서 119로 직접 전화해 주세요.'),
    );
  };
  const callButton = assessment?.call119Required ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="119 전화"
      onPress={handleCall119}
      className={
        variant === 'status'
          ? 'mt-3 min-h-[48px] items-center justify-center rounded-xl bg-red px-4 py-3'
          : 'mb-3 h-12 items-center justify-center rounded-lg bg-red'
      }
    >
      <Text className="text-body font-suitBold text-white">
        {variant === 'status' ? '119 전화하기' : '119 전화'}
      </Text>
    </TouchableOpacity>
  ) : null;

  return (
    <>
      {variant === 'status' && assessment?.call119Required ? (
        <View
          accessibilityRole="alert"
          className="mb-4 rounded-2xl border border-red bg-white p-4"
        >
          <Text className="text-body font-suitBold text-red">
            119 신고가 필요합니다.
          </Text>
          <Text className="mt-2 text-body font-suitRegular leading-6 text-gray">
            처치 안내 확인과 별개로 119에 연락해 주세요.
          </Text>
          {callButton}
        </View>
      ) : (
        callButton
      )}
      {assessment && assessment.redFlags.length > 0 ? (
        <Text
          accessibilityRole="alert"
          className="mb-3 text-body font-suitBold text-red"
        >
          주의가 필요한 상황입니다.
        </Text>
      ) : null}
    </>
  );
};
