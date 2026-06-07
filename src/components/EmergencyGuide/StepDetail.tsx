import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import type { TreatmentStep } from '../../erags-sm1/machine/types';

type Props = {
  step: TreatmentStep;
  isChecked: boolean;
  showCheckpoint: boolean;
  onToggle: (checked: boolean) => void;
  onStopPress?: () => void;
};

export function StepDetail({ step, isChecked, showCheckpoint, onToggle, onStopPress }: Props) {
  const [showStopModal, setShowStopModal] = React.useState(false);

  return (
    <View className="flex-1 px-4 pt-2">
      <View className="relative min-h-[84px] justify-center items-center">
        <View className="items-center justify-center">
          <Text className="text-xl text-[#FF3B3B]">{step.stepNo}단계</Text>
          <Text className="text-2xl font-bold text-white mt-2 text-center">
            {step.instruction}
          </Text>
        </View>

        <TouchableOpacity
          className="absolute right-0 top-0 px-2.5 py-1.5 rounded-full border border-[#FF3B3B] bg-[#2A1D1D]"
          onPress={() => setShowStopModal(true)}
        >
          <Text className="text-[#FF6B6B] text-xs font-bold">응급처치 중단</Text>
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

      {showCheckpoint && (
        <View className="mt-6 p-4 bg-[#1E2530] rounded-xl border border-[#2B303A]">
          <Text className="text-white text-base">{step.checkpointQuestion}</Text>
          <TouchableOpacity
            className="flex-row items-center mt-3"
            onPress={() => onToggle(!isChecked)}
          >
            <View
              className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
                isChecked ? 'bg-[#2ECC71] border-[#2ECC71]' : 'border-[#555]'
              }`}
            >
              {isChecked && (
                <Text className="text-white text-xs font-bold">✓</Text>
              )}
            </View>
            <Text className="text-white">확인했습니다</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
