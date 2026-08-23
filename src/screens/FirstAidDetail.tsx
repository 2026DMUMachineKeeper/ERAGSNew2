import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackIcon } from '@/assets';
import { EmergencyQuestionOption } from '@/components/EmergencyGuide';
import { FIRST_AID_CATEGORIES, getEmergencyQuestions } from '@/constants';
import type { RootStackParamList } from '@/navigation/RootNavigator';

interface QuestionAnswers {
  [questionId: string]: readonly string[];
}

type FirstAidDetailProps = NativeStackScreenProps<
  RootStackParamList,
  'FirstAidDetail'
>;

export const FirstAidDetail = ({
  navigation,
  route,
}: FirstAidDetailProps): React.JSX.Element => {
  const category = FIRST_AID_CATEGORIES.find(
    item => item.id === route.params?.mainId,
  );
  const questions = React.useMemo(
    () => (category ? getEmergencyQuestions(category.id) : []),
    [category],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [questionAnswers, setQuestionAnswers] =
    React.useState<QuestionAnswers>({});

  if (!category) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-body font-suitBold text-black">
          응급 유형을 찾을 수 없습니다.
        </Text>
        <TouchableOpacity
          className="mt-5 h-12 items-center justify-center rounded-lg bg-red px-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-body font-suitBold text-white">돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswerIds = questionAnswers[currentQuestion.id] ?? [];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const handleOptionPress = (answerId: string): void => {
    setQuestionAnswers(currentAnswers => {
      if (!currentQuestion.isMultiple) {
        return { ...currentAnswers, [currentQuestion.id]: [answerId] };
      }

      const previousAnswerIds = currentAnswers[currentQuestion.id] ?? [];
      const isExclusiveAnswer = answerId === 'NONE';
      let nextAnswerIds: readonly string[];

      if (previousAnswerIds.includes(answerId)) {
        nextAnswerIds = previousAnswerIds.filter(id => id !== answerId);
      } else if (isExclusiveAnswer) {
        nextAnswerIds = [answerId];
      } else {
        nextAnswerIds = [
          ...previousAnswerIds.filter(id => id !== 'NONE'),
          answerId,
        ];
      }

      return { ...currentAnswers, [currentQuestion.id]: nextAnswerIds };
    });
  };

  const handleBackPress = (): void => {
    if (currentQuestionIndex === 0) {
      navigation.goBack();
      return;
    }

    setCurrentQuestionIndex(index => index - 1);
  };

  const handleNextPress = (): void => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(index => index + 1);
      return;
    }

    navigation.navigate('EmergencyGuide', {
      mainLabel: category.label,
      source: 'manual',
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="px-5 pt-6">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityLabel="이전 질문"
            accessibilityRole="button"
            className="h-11 w-11 items-start justify-center"
            hitSlop={10}
            onPress={handleBackPress}
          >
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

        <Text className="mt-6 text-coment font-suitBold text-red">
          {category.label} 질문
        </Text>
        <Text className="mt-2 text-title2 font-suitBold text-black">
          {currentQuestion.title}
        </Text>
        <Text className="mt-3 text-body font-suitRegular leading-6 text-textDim">
          {currentQuestion.prompt}
        </Text>
        {currentQuestion.isMultiple ? (
          <Text className="mt-2 text-coment font-suitMedium text-textDim">
            복수 선택 가능
          </Text>
        ) : null}
      </View>

      <ScrollView
        className="mt-6 flex-1 px-5"
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion.options.map(option => (
          <EmergencyQuestionOption
            key={option.id}
            label={option.label}
            isMultiple={currentQuestion.isMultiple}
            isSelected={selectedAnswerIds.includes(option.id)}
            onPress={() => handleOptionPress(option.id)}
          />
        ))}
        <View className="h-4" />
      </ScrollView>

      <View className="bg-background px-5 pb-5 pt-3">
        <TouchableOpacity
          className={`h-14 items-center justify-center rounded-lg ${
            selectedAnswerIds.length > 0 ? 'bg-red' : 'bg-disabled'
          }`}
          disabled={selectedAnswerIds.length === 0}
          onPress={handleNextPress}
        >
          <Text className="text-body font-suitBold text-white">
            {isLastQuestion ? '응급처치 가이드 시작' : '다음 질문'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FirstAidDetail;
