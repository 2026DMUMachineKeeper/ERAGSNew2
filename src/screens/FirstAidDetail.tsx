import React from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { QuestionAnswers } from '@/types';
import { EmergencyQuestionOption } from '@/components/EmergencyGuide';
import {
  FIRST_AID_CATEGORIES,
  getNextEmergencyAnswerIds,
  getEmergencyQuestions,
} from '@/constants';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { createEmergencyGuide, getEmergencyGuideErrorMessage } from '@/services';
import { useEmergencyGuideStore } from '@/store';
import {
  SERVER_SYMPTOM_ID_BY_CATEGORY,
  toEmergencyGuideQuestionnaire,
} from '@/utils/emergencyQuestionnaire';

import { EmergencyQuestionHeader } from './firstAidDetail/components';

type FirstAidDetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

export const FirstAidDetail = ({ navigation, route }: FirstAidDetailProps): React.JSX.Element => {
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const category = FIRST_AID_CATEGORIES.find(item => item.id === route.params?.mainId);
  const questions = React.useMemo(
    () => (category ? getEmergencyQuestions(category.id) : []),
    [category],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [questionAnswers, setQuestionAnswers] = React.useState<QuestionAnswers>(
    (): QuestionAnswers => {
      if (!category) {
        return {};
      }

      return {
        visibleSymptoms: [SERVER_SYMPTOM_ID_BY_CATEGORY[category.id]],
      };
    },
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!category) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-5">
        <Text className="text-body font-suitBold text-black">응급 유형을 찾을 수 없습니다.</Text>
        <TouchableOpacity
          className="mt-5 h-12 items-center justify-center rounded-lg bg-red px-6"
          onPress={() => navigation.goBack()}>
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
      const previousAnswerIds = currentAnswers[currentQuestion.id] ?? [];

      if (
        currentQuestion.id === 'visibleSymptoms' &&
        answerId === SERVER_SYMPTOM_ID_BY_CATEGORY[category.id] &&
        previousAnswerIds.includes(answerId)
      ) {
        return currentAnswers;
      }

      const nextAnswerIds = getNextEmergencyAnswerIds(currentQuestion, previousAnswerIds, answerId);

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

  const handleNextPress = async (): Promise<void> => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(index => index + 1);
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append(
        'request',
        JSON.stringify({
          requestId: `manual-${Date.now()}`,
          language: 'ko-KR',
        }),
      );
      formData.append(
        'questionnaire',
        JSON.stringify(toEmergencyGuideQuestionnaire(questionAnswers)),
      );

      startGuide({
        guide: await createEmergencyGuide(formData),
        mainLabel: category.label,
        source: 'manual',
      });
      navigation.replace('EmergencyGuide');
    } catch (error) {
      Alert.alert('응급 가이드 생성 실패', getEmergencyGuideErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <EmergencyQuestionHeader
        categoryLabel={category.label}
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        onBack={handleBackPress}
      />

      <ScrollView className="mt-6 flex-1 px-5" showsVerticalScrollIndicator={false}>
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
          accessibilityLabel={isLastQuestion ? '응급처치 가이드 시작' : '다음 질문'}
          accessibilityRole="button"
          className={`h-14 items-center justify-center rounded-lg ${
            selectedAnswerIds.length > 0 && !isSubmitting ? 'bg-red' : 'bg-disabled'
          }`}
          disabled={selectedAnswerIds.length === 0 || isSubmitting}
          onPress={handleNextPress}>
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-body font-suitBold text-white">
              {isLastQuestion ? '응급처치 가이드 시작' : '다음 질문'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default FirstAidDetail;
