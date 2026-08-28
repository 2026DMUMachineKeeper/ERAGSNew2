import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { FirstAidGuideIcon } from '@/assets/icons';

interface EmergencySupportSectionProps {
  onFirstAidPress: () => void;
  onReportPress: () => void;
}

const EmergencySupportSection = ({
  onFirstAidPress,
  onReportPress,
}: EmergencySupportSectionProps): React.JSX.Element => (
  <>
    <View className="mb-3 mt-5">
      <Text className="text-body font-suitSemiBold text-textDim">
        응급 상황 지원
      </Text>
      <Text className="mt-1 text-coment font-suitRegular text-textDim">
        필요한 응급 지원을 선택하세요.
      </Text>
    </View>

    <TouchableOpacity
      className="h-[86px] flex-row items-center rounded-2xl bg-red px-4"
      onPress={onReportPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-white">
        <Text className="text-coment font-suitBold text-white">SOS</Text>
      </View>
      <Text className="ml-4 flex-1 text-body font-suitBold text-white">
        긴급 신고 문자 보내기
      </Text>
      <Text className="text-title2 font-suitRegular text-white">›</Text>
    </TouchableOpacity>

    <TouchableOpacity
      accessibilityHint="사고 유형 선택 화면으로 이동합니다"
      accessibilityLabel="응급 처치 가이드"
      accessibilityRole="button"
      className="mt-3 h-[86px] flex-row items-center rounded-2xl border border-red bg-camera_bg px-4"
      onPress={onFirstAidPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-red">
        <FirstAidGuideIcon width={28} height={28} />
      </View>
      <Text className="ml-4 flex-1 text-body font-suitBold text-black">
        응급 처치 가이드
      </Text>
      <Text className="text-title2 font-suitRegular text-red">›</Text>
    </TouchableOpacity>
  </>
);

export default EmergencySupportSection;
