import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  isVisible: boolean;
  categoryLabel: string;
  onReselectCategory: () => void;
  onEditSymptoms: () => void;
  onContinue: () => void;
};

export function CategoryMismatchModal({
  isVisible,
  categoryLabel,
  onReselectCategory,
  onEditSymptoms,
  onContinue,
}: Props): React.JSX.Element {
  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onEditSymptoms}>
      <SafeAreaView
        edges={['top', 'bottom']}
        className="flex-1 items-center justify-center bg-black/50 px-6"
      >
        <View accessibilityViewIsModal className="w-full max-w-[400px] rounded-3xl bg-white p-6">
          <Text accessibilityRole="header" className="text-title2 font-suitBold text-black">
            선택한 증상을 확인해 주세요
          </Text>
          <Text className="mt-3 text-body font-suitRegular leading-6 text-gray">
            {categoryLabel} 유형을 선택하셨지만 현재 증상에는 해당 유형이 없어요. 어떻게 할까요?
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="사고 유형 다시 선택"
            className="mt-6 h-12 items-center justify-center rounded-xl bg-red"
            onPress={onReselectCategory}
          >
            <Text className="text-body font-suitBold text-white">사고 유형 다시 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="증상 수정"
            className="mt-3 h-12 items-center justify-center rounded-xl bg-background"
            onPress={onEditSymptoms}
          >
            <Text className="text-body font-suitBold text-black">증상 수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="그대로 진행"
            className="mt-2 h-12 items-center justify-center"
            onPress={onContinue}
          >
            <Text className="text-body font-suitMedium text-gray">그대로 진행</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
