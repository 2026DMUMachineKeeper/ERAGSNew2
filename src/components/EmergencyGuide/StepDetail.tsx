import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import type { EmergencyGuideStep } from '../../constants/emergencyGuideData';

type Props = {
  step: EmergencyGuideStep;
  onStopPress?: () => void;
};

export function StepDetail({ step, onStopPress }: Props) {
  const [showStopModal, setShowStopModal] = React.useState(false);
  const [label, subtitle] = step.title.split(':').map(s => s.trim());

  return (
    <View className="flex-1 px-4 pt-2">
      <View className="relative min-h-[84px] justify-center items-center">
        <View className="items-center justify-center">
          <Text className="text-xl text-[#FF3B3B]">{label}</Text>
          <Text className="text-2xl font-bold text-white mt-2 text-center">
            {subtitle}
          </Text>
        </View>

        <TouchableOpacity
          className="absolute right-0 top-0 px-2.5 py-1.5 rounded-full border border-[#FF3B3B] bg-[#2A1D1D]"
          onPress={() => setShowStopModal(true)}
        >
          <Text className="text-[#FF6B6B] text-xs font-bold">
            응급처치 중단
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showStopModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStopModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[320px] rounded-2xl bg-[#181C24] border border-[#2B303A] px-5 py-5">
            <Text className="text-lg font-bold text-white text-center">
              응급처치를 중단하시겠습니까?
            </Text>
            <Text className="mt-3 text-sm text-[#A5ACB8] text-center leading-5">
              중단하면 현재 안내를 종료하고 이전 화면으로 돌아갑니다.
            </Text>

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl border border-[#2B303A] items-center justify-center"
                onPress={() => setShowStopModal(false)}
              >
                <Text className="text-white font-bold">취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-12 rounded-xl bg-[#FF3B3B] items-center justify-center"
                onPress={() => {
                  setShowStopModal(false);
                  onStopPress?.();
                }}
              >
                <Text className="text-white font-bold">중단</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="mt-4">
        <Text className="text-white text-base leading-6">
          {step.description}
        </Text>
      </View>

      <View className="mt-6 items-center">
        <View className="w-[260px] h-[200px] bg-[#E6E6E6] rounded-lg items-center justify-center">
          <Text className="text-gray-500">이미지</Text>
        </View>
      </View>

      <View className="mt-6">
        <Text className="text-white text-sm">필요한 약품</Text>
        <View className="flex-row items-center mt-3">
          <View className="bg-[#FF3B3B] px-4 py-2 rounded-full">
            <Text className="text-white">붕대</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
