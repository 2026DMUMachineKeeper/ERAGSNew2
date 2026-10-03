import React from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
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
import { CategoryMismatchModal } from './firstAidDetail/components/CategoryMismatchModal';

type FirstAidDetailProps = NativeStackScreenProps<RootStackParamList, 'FirstAidDetail'>;

export const FirstAidDetail = ({ navigation, route }: FirstAidDetailProps): React.JSX.Element => {
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const isFocused = useIsFocused();
  const category = FIRST_AID_CATEGORIES.find(item => item.id === route.params?.mainId);
  const questions = React.useMemo(
    () => (category ? getEmergencyQuestions(category.id) : []),
    [category],
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [questionAnswers, setQuestionAnswers] = React.useState<QuestionAnswers>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMismatchModalVisible, setIsMismatchModalVisible] = React.useState(false);
  const [confirmedMismatchKey, setConfirmedMismatchKey] = React.useState<string | null>(null);
  const activeSubmissionRef = React.useRef<AbortController | null>(null);
  const isFocusedRef = React.useRef(isFocused);
  const isMountedRef = React.useRef(true);
  const isSubmittingRef = React.useRef(false);

  const cancelActiveSubmission = React.useCallback((): void => {
    const controller = activeSubmissionRef.current;

    if (!controller) {
      return;
    }

    activeSubmissionRef.current = null;
    controller.abort();
    isSubmittingRef.current = false;

    if (isMountedRef.current) {
      setIsSubmitting(false);
    }
  }, []);

  React.useEffect((): void => {
    isFocusedRef.current = isFocused;

    if (!isFocused) {
      cancelActiveSubmission();
    }
  }, [cancelActiveSubmission, isFocused]);

  React.useEffect(
    (): (() => void) => {
      isMountedRef.current = true;

      return (): void => {
        isMountedRef.current = false;
        cancelActiveSubmission();
      };
    },
    [cancelActiveSubmission],
  );

  React.useEffect(
    (): (() => void) =>
      navigation.addListener('beforeRemove', cancelActiveSubmission),
    [cancelActiveSubmission, navigation],
  );

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
  const mismatchKey = `${category.id}:${[...(questionAnswers.visibleSymptoms ?? [])].sort().join(',')}`;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasImmediateDanger = (questionAnswers.immediateDanger ?? []).some(
    answerId => answerId !== 'NONE',
  );
  const handleOptionPress = (answerId: string): void => {
    if (currentQuestion.id === 'visibleSymptoms') {
      setConfirmedMismatchKey(null);
    }
    setQuestionAnswers(currentAnswers => {
      const previousAnswerIds = currentAnswers[currentQuestion.id] ?? [];

      const nextAnswerIds = getNextEmergencyAnswerIds(currentQuestion, previousAnswerIds, answerId);

      return { ...currentAnswers, [currentQuestion.id]: nextAnswerIds };
    });
  };

  const handleBackPress = (): void => {
    cancelActiveSubmission();

    if (currentQuestionIndex === 0) {
      navigation.goBack();
      return;
    }

    setCurrentQuestionIndex(index => index - 1);
  };

  const handleNextPress = async (): Promise<void> => {
    if (selectedAnswerIds.length === 0 || isSubmittingRef.current) {
      return;
    }

    if (!isLastQuestion) {
      if (currentQuestion.id === 'immediateDanger' && hasImmediateDanger) {
        Alert.alert(
          '119 신고가 필요해요',
          '즉시 위험 신호가 선택되었습니다. 119에 신고하고 안내를 따라 주세요.',
          [
            {
              text: '119 전화',
              onPress: (): void => {
                Linking.openURL('tel:119').catch(() => {
                  Alert.alert('전화 연결 안내', '전화 앱에서 119로 직접 전화해 주세요.');
                });
              },
            },
            { text: '문진 계속', onPress: () => setCurrentQuestionIndex(index => index + 1) },
          ],
          { cancelable: false },
        );
        return;
      }

      if (
        currentQuestion.id === 'visibleSymptoms' &&
        !selectedAnswerIds.includes(SERVER_SYMPTOM_ID_BY_CATEGORY[category.id]) &&
        !hasImmediateDanger &&
        confirmedMismatchKey !== mismatchKey
      ) {
        setIsMismatchModalVisible(true);
        return;
      }

      setCurrentQuestionIndex(index => index + 1);
      return;
    }

    const requestController = new AbortController();
    activeSubmissionRef.current = requestController;
    isSubmittingRef.current = true;
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
      const questionnaire = JSON.stringify(
        toEmergencyGuideQuestionnaire(questionAnswers),
      );
      console.warn('[EmergencyGuide API][Questionnaire]', questionnaire);
      formData.append('questionnaire', questionnaire);

      const guide = await createEmergencyGuide(formData, requestController.signal);
      if (
        activeSubmissionRef.current !== requestController ||
        requestController.signal.aborted ||
        !isMountedRef.current ||
        !isFocusedRef.current
      ) {
        return;
      }

      startGuide({
        guide,
        mainLabel: category.label,
        source: 'manual',
      });
      navigation.replace('EmergencyGuide');
    } catch (error) {
      if (
        activeSubmissionRef.current !== requestController ||
        requestController.signal.aborted ||
        !isMountedRef.current ||
        !isFocusedRef.current
      ) {
        return;
      }

      Alert.alert('응급 가이드 생성 실패', getEmergencyGuideErrorMessage(error));
    } finally {
      if (activeSubmissionRef.current !== requestController) {
        return;
      }

      activeSubmissionRef.current = null;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <CategoryMismatchModal
        isVisible={isMismatchModalVisible}
        categoryLabel={category.label}
        onReselectCategory={() => {
          setIsMismatchModalVisible(false);
          navigation.popTo('FirstAid');
        }}
        onEditSymptoms={() => setIsMismatchModalVisible(false)}
        onContinue={() => {
          setConfirmedMismatchKey(mismatchKey);
          setIsMismatchModalVisible(false);
          setCurrentQuestionIndex(index => index + 1);
        }}
      />
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
