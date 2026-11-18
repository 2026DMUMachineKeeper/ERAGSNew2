import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { EmergencyGuideAssessment } from '../../../types/emergencyGuide.types';
import { EmergencyCallNotice } from './EmergencyCallNotice';

type Props = {
  assessment: EmergencyGuideAssessment | null;
  onClose: () => void;
  onNewRequest: () => void;
  onConfirmCompound?: () => void;
  onContinueQuestions?: () => void;
};

export function AssessmentOnlyModal({
  assessment,
  onClose,
  onNewRequest,
  onConfirmCompound,
  onContinueQuestions,
}: Props): React.JSX.Element {
  const handleContinueQuestions = onConfirmCompound ?? onContinueQuestions;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView
        edges={['top', 'bottom']}
        className="flex-1 items-center justify-center bg-black/50 px-6 py-6"
      >
        <View
          accessibilityViewIsModal
          className="w-full max-w-[400px] max-h-full rounded-3xl bg-white p-6"
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <EmergencyCallNotice assessment={assessment} variant="status" />
            <View className="mb-4 self-start rounded-full bg-background px-3 py-2">
              <Text className="text-coment font-suitBold text-gray">추가 확인 필요</Text>
            </View>
            <Text accessibilityRole="header" className="text-title2 font-suitBold text-black">
              {handleContinueQuestions
                ? '추가 정보 입력'
                : '증상 정보가 더 필요해요'}
            </Text>
            <Text className="mt-3 text-body font-suitRegular leading-6 text-gray">
              {handleContinueQuestions
                ? '처치 안내에 필요한 정보가 부족합니다. 이어지는 질문에 답해 주세요.'
                : '현재 정보만으로는 처치 안내를 제공하기 어렵습니다. 증상 정보를 보완해 새 문진을 시작해 주세요.'}
            </Text>
            <View className="mt-5 rounded-2xl bg-background p-4">
              <Text className="text-body font-suitBold text-black">판단 요약</Text>
              <Text className="mt-2 text-body font-suitRegular leading-6 text-gray">
                {assessment?.summary || '판단 요약이 없습니다.'}
              </Text>
              <Text
                className={`mt-3 text-body font-suitBold ${
                  assessment?.call119Required ? 'text-red' : 'text-textDim'
                }`}
              >
                {assessment
                  ? `119 신고 ${assessment.call119Required ? '필요' : '불필요'}`
                  : '119 신고 필요 여부를 확인할 수 없습니다.'}
              </Text>
            </View>
            {assessment && assessment.missingInputs.length > 0 ? (
              <View className="mt-5 rounded-2xl bg-background p-4">
                <Text accessibilityRole="header" className="text-body font-suitBold text-black">
                  추가로 필요한 정보
                </Text>
                {assessment.missingInputs.map((input, index) => (
                  <View key={`${input}-${index}`} className="mt-2 flex-row">
                    <Text accessible={false} className="mr-2 text-body font-suitRegular leading-6 text-gray">
                      {'\u2022'}
                    </Text>
                    <Text className="flex-1 text-body font-suitRegular leading-6 text-gray">
                      {input === 'MULTIPLE_CATEGORIES_REQUIRE_COMPOUND'
                        ? '처치 안내를 위해 손상 정보를 추가로 확인해야 합니다.'
                        : input}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <TouchableOpacity
            accessibilityLabel={
              handleContinueQuestions ? '추가 정보 입력' : '새 문진 시작'
            }
            accessibilityRole="button"
            className="mt-6 h-12 items-center justify-center rounded-xl bg-red"
            onPress={handleContinueQuestions ?? onNewRequest}
          >
            <Text className="text-body font-suitBold text-white">
              {handleContinueQuestions ? '추가 정보 입력' : '새 문진 시작'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="닫기"
            accessibilityRole="button"
            className="mt-2 h-12 items-center justify-center"
            onPress={onClose}
          >
            <Text className="text-body font-suitMedium text-gray">닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
