import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackIcon } from '@/assets';
import { EmergencyQuestionOption } from '@/components/EmergencyGuide';
import {
  FIRST_AID_CATEGORIES,
  getNextEmergencyAnswerIds,
  getEmergencyQuestions,
} from '@/constants';
import type { EmergencyCategoryId } from '@/constants';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { createEmergencyGuide } from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type { EmergencyGuideQuestionnaireAnswer } from '@/types';

interface QuestionAnswers {
  [questionId: string]: readonly string[];
}

const SERVER_QUESTION_ID_BY_SCREEN_ID: Record<string, string> = {
  immediateDanger: 'Q1_IMMEDIATE_DANGER',
  visibleSymptoms: 'Q2_VISIBLE_SYMPTOMS',
  bleedingPattern: 'B1_BLEEDING_PATTERN',
  woundRisk: 'B2_BLEEDING_RISKS',
  burnCause: 'U1_BURN_LOCATION_CAUSE',
  burnSkinState: 'U2_BURN_SKIN_STATE',
  injuryState: 'F1_INJURY_STATE',
  distalCondition: 'F2_DISTAL_STATE',
  speakOrCough: 'A1_SPEAK_COUGH',
  allergyRisk: 'R1_ALLERGY_RISK',
  feverSymptoms: 'T1_FEVER_NEUROLOGIC',
  ageGroup: 'C1_AGE_GROUP',
};

const SCREEN_QUESTION_IDS_IN_ORDER = [
  'immediateDanger',
  'visibleSymptoms',
  'bleedingPattern',
  'woundRisk',
  'burnCause',
  'burnSkinState',
  'injuryState',
  'distalCondition',
  'speakOrCough',
  'allergyRisk',
  'feverSymptoms',
  'ageGroup',
] as const;

const SERVER_SYMPTOM_ID_BY_CATEGORY: Record<EmergencyCategoryId, string> = {
  bleeding: 'BLEEDING',
  burn: 'BURN',
  fractureBruise: 'FRACTURE_BRUISE',
  fever: 'FEVER_NEUROLOGIC',
  skinRash: 'ALLERGY_RASH',
  airwayObstruction: 'AIRWAY_OBSTRUCTION',
};

export const toEmergencyGuideQuestionnaire = (
  questionAnswers: QuestionAnswers,
): EmergencyGuideQuestionnaireAnswer[] =>
  SCREEN_QUESTION_IDS_IN_ORDER.flatMap(questionId => {
    const answerIds = questionAnswers[questionId] ?? [];
    const serverQuestionId = SERVER_QUESTION_ID_BY_SCREEN_ID[questionId];

    return serverQuestionId && answerIds.length > 0
      ? [{ questionId: serverQuestionId, answerIds }]
      : [];
  });

type FirstAidDetailProps = NativeStackScreenProps<
  RootStackParamList,
  'FirstAidDetail'
>;

export const FirstAidDetail = ({
  navigation,
  route,
}: FirstAidDetailProps): React.JSX.Element => {
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const category = FIRST_AID_CATEGORIES.find(
    item => item.id === route.params?.mainId,
  );
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
      const previousAnswerIds = currentAnswers[currentQuestion.id] ?? [];

      if (
        currentQuestion.id === 'visibleSymptoms' &&
        answerId === SERVER_SYMPTOM_ID_BY_CATEGORY[category.id] &&
        previousAnswerIds.includes(answerId)
      ) {
        return currentAnswers;
      }

      const nextAnswerIds = getNextEmergencyAnswerIds(
        currentQuestion,
        previousAnswerIds,
        answerId,
      );

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
      console.error('[FirstAidDetail] 응급 가이드 생성 실패:', error);
      Alert.alert(
        '응급 가이드 생성 실패',
        error instanceof Error
          ? error.message
          : '응급 가이드를 불러오지 못했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
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
          accessibilityLabel={
            isLastQuestion ? '응급처치 가이드 시작' : '다음 질문'
          }
          accessibilityRole="button"
          className={`h-14 items-center justify-center rounded-lg ${
            selectedAnswerIds.length > 0 && !isSubmitting
              ? 'bg-red'
              : 'bg-disabled'
          }`}
          disabled={selectedAnswerIds.length === 0 || isSubmitting}
          onPress={handleNextPress}
        >
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
