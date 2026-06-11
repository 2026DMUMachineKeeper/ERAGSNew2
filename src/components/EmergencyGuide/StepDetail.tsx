import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import type { EmergencyGuideRuntimeStep } from '../../constants/emergencyGuideData';

type StepDetailStep = Partial<EmergencyGuideRuntimeStep> & {
  description?: string;
};

type Props = {
  step?: StepDetailStep | null;
  isChecked: boolean;
  showCheckpoint: boolean;
  onToggle: (checked: boolean) => void;
  onStopPress?: () => void;
};

const supplyNameById: Record<number, string> = {
  1: '붕대',
};

const getInstructionFromTitle = (title: string) =>
  title.replace(/^\d+\s*단계:\s*/, '').trim();

export function StepDetail({
  step,
  isChecked,
  showCheckpoint,
  onToggle,
  onStopPress,
}: Props) {
  const [showStopModal, setShowStopModal] = React.useState(false);
  const title = typeof step?.title === 'string' ? step.title : '';
  const stepNo =
    typeof step?.stepNo === 'number'
      ? step.stepNo
      : Number(title.match(/\d+/)?.[0] ?? 1);
  const instruction =
    step?.instruction?.trim() ||
    getInstructionFromTitle(title) ||
    '응급처치 안내';
  const checkpointQuestion =
    step?.checkpointQuestion?.trim() ||
    step?.description?.trim() ||
    '현재 단계를 확인하고 다음 안내를 진행하세요.';
  const requiredSupply =
    typeof step?.requiredItemId === 'number'
      ? supplyNameById[step.requiredItemId] ?? '필요 약품'
      : null;

  return (
    <View className="flex-1 px-4 pt-2">
      <View className="relative min-h-[84px] justify-center items-center">
        <View className="items-center justify-center">
          <Text className="text-xl text-red">{stepNo}단계</Text>
          <Text className="text-2xl font-bold text-white mt-2 text-center">
            {instruction}
          </Text>
        </View>

        <TouchableOpacity
          className="absolute right-0 top-0 px-2.5 py-1.5 rounded-full border border-red bg-dangerSurface"
          onPress={() => setShowStopModal(true)}
        >
          <Text className="text-dangerText text-xs font-bold">
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
          <View className="w-full max-w-[320px] rounded-2xl bg-surfaceAlt border border-borderSubtle px-5 py-5">
            <View className="mb-4">
              <Text className="text-lg font-bold text-white text-center">
                응급처치를 중단하시겠습니까?
              </Text>
              <Text className="mt-3 text-sm text-textMuted text-center leading-5">
                중단하면 현재 안내를 종료하고 구조대원 인계 페이지로 이동합니다.
              </Text>
            </View>

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl border border-borderSubtle items-center justify-center"
                onPress={() => setShowStopModal(false)}
              >
                <Text className="text-white font-bold">취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-12 rounded-xl bg-red items-center justify-center"
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

      <View className="mt-6">
        <Text className="text-white text-base leading-6">
          {checkpointQuestion}
        </Text>
      </View>

      {showCheckpoint ? (
        <TouchableOpacity
          className="flex-row items-center mt-4"
          onPress={() => onToggle(!isChecked)}
        >
          <View
            className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
              isChecked ? 'bg-success border-success' : 'border-gray'
            }`}
          >
            {isChecked ? (
              <Text className="text-dangerText text-xs font-bold">✓</Text>
            ) : null}
          </View>
          <Text className="text-white">확인했습니다</Text>
        </TouchableOpacity>
      ) : null}

      <View className="mt-6 items-center">
        <View className="w-[260px] h-[200px] bg-offWhite rounded-lg items-center justify-center">
          <Text className="text-gray">이미지</Text>
        </View>
      </View>

      {requiredSupply ? (
        <View className="mt-6">
          <Text className="text-white text-sm">필요한 약품</Text>
          <View className="flex-row items-center mt-3">
            <View className="bg-red px-4 py-2 rounded-full">
              <Text className="text-white">{requiredSupply}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
