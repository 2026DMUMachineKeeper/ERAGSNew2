import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { getEmergencyQuestions } from '@/constants';

import { BackIcon } from '@/assets';

interface EmergencyQuestionHeaderProps {
  categoryLabel: string;
  questions: ReturnType<typeof getEmergencyQuestions>;
  currentQuestionIndex: number;
  onBack: () => void;
}
export const EmergencyQuestionHeader = ({
  categoryLabel,
  questions,
  currentQuestionIndex,
  onBack,
}: EmergencyQuestionHeaderProps): React.JSX.Element => {
  const currentQuestion = questions[currentQuestionIndex];
  return (
    <View className="px-5 pt-6">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          accessibilityLabel="이전 질문"
          accessibilityRole="button"
          className="h-11 w-11 items-start justify-center"
          hitSlop={10}
          onPress={onBack}>
          <BackIcon width={26} height={26} />
        </TouchableOpacity>
        <Text className="text-coment font-suitBold text-red">
          {currentQuestionIndex + 1} / {questions.length}
        </Text>
      </View>

      <View className="mt-3 flex-row gap-1">
        {questions.map((question, index) => (
          <View
            key={question.id}
            className={`h-2 flex-1 rounded-full ${
              index <= currentQuestionIndex ? 'bg-red' : 'bg-memoLine'
            }`}
          />
        ))}
      </View>

      <Text className="mt-6 text-coment font-suitBold text-red">{categoryLabel} 질문</Text>
      <Text className="mt-2 text-title2 font-suitBold text-black">{currentQuestion.title}</Text>
      <Text className="mt-3 text-body font-suitRegular leading-6 text-textDim">
        {currentQuestion.prompt}
      </Text>
      {currentQuestion.isMultiple ? (
        <Text className="mt-2 text-coment font-suitMedium text-textDim">복수 선택 가능</Text>
      ) : null}
    </View>
  );
};
export default EmergencyQuestionHeader;
