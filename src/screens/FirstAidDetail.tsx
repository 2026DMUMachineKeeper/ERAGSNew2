import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmergencyQuestionOption } from '@/components/EmergencyGuide';
import { FIRST_AID_CATEGORIES } from '@/constants';
import type { QuestionnaireState } from '@/types';
import type { RootStackParamList } from '@/navigation/RootNavigator';
import { getEmergencyGuideErrorMessage } from '@/services';
import { CompoundInjurySelection } from './firstAidDetail/components/CompoundInjurySelection';
import {
  CompoundInjuryPanel,
  IntakeChoice,
} from './firstAidDetail/components/CompoundInjuryPanel';
import { useEmergencyQuestionnaireRequest } from '@/hooks/useEmergencyQuestionnaireRequest';
import { useEmergencyGuideStore } from '@/store';
import { SERVER_SYMPTOM_ID_BY_CATEGORY } from '@/utils/emergencyQuestionnaire';
import { reportEmergencySessionLocationOnce } from '@/utils/emergencySessionLocation';
import { getMissingCompoundQuestions } from '@/utils/compoundQuestionFacts';
import {
  canContinueQuestionnaireStep,
  getCompoundQuestionnaireError,
  getQuestionnaireStepAnswers,
  getQuestionnaireSteps,
  getSelectedCategories,
  isSupportedCompoundSelection,
  setCompoundInjuryCount,
  updateQuestionnaireAnswer,
  updateQuestionnaireDescription,
} from '@/utils/compoundQuestionnaire';

import { EmergencyQuestionHeader } from './firstAidDetail/components';
import { CategoryMismatchModal } from './firstAidDetail/components/CategoryMismatchModal';

type FirstAidDetailProps = NativeStackScreenProps<
  RootStackParamList,
  'FirstAidDetail'
>;

export const FirstAidDetail = ({
  navigation,
  route,
}: FirstAidDetailProps): React.JSX.Element => {
  const { handleCreateGuide } = useEmergencyQuestionnaireRequest();
  const startGuide = useEmergencyGuideStore(state => state.startGuide);
  const isFocused = useIsFocused();
  const category =
    FIRST_AID_CATEGORIES.find(item => item.id === route.params?.mainId) ??
    (route.params?.isCompoundIntake ? FIRST_AID_CATEGORIES[0] : undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [questionnaire, setQuestionnaire] = React.useState<QuestionnaireState>(
    () => {
      const initial: QuestionnaireState = {
        questionAnswers: {},
        compoundDraft: { injuries: [], relation: null },
      };
      // 복합 확인 요청에는 원래 음성을 복제하지 않고 손상별 답변을 새로 받습니다.
      if (!route.params?.isCompoundIntake || !category) return initial;
      const compound = setCompoundInjuryCount(
        initial,
        2,
        SERVER_SYMPTOM_ID_BY_CATEGORY[category.id],
      );
      return {
        ...compound,
        compoundDraft: {
          ...compound.compoundDraft,
          injuries: compound.compoundDraft.injuries.map(injury => ({
            ...injury,
            hasSelectedCategory: false,
          })),
        },
      };
    },
  );
  const { questionAnswers, compoundDraft } = questionnaire;
  const questions = React.useMemo(
    () =>
      category
        ? getQuestionnaireSteps(category.id, questionAnswers, compoundDraft)
        : [],
    [category, questionAnswers, compoundDraft],
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isMismatchModalVisible, setIsMismatchModalVisible] =
    React.useState(false);
  const [confirmedMismatchKey, setConfirmedMismatchKey] = React.useState<
    string | null
  >(null);
  const activeSubmissionRef = React.useRef<AbortController | null>(null);
  const isFocusedRef = React.useRef(isFocused);
  const isMountedRef = React.useRef(true);
  const isSubmittingRef = React.useRef(false);
  const questionScrollRef = React.useRef<ScrollView>(null);

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

  React.useEffect((): (() => void) => {
    isMountedRef.current = true;

    return (): void => {
      isMountedRef.current = false;
      cancelActiveSubmission();
    };
  }, [cancelActiveSubmission]);

  React.useEffect(
    (): (() => void) =>
      navigation.addListener('beforeRemove', cancelActiveSubmission),
    [cancelActiveSubmission, navigation],
  );

  const activeQuestionIndex = Math.min(
    currentQuestionIndex,
    questions.length - 1,
  );
  const currentQuestion = questions[activeQuestionIndex];

  React.useLayoutEffect(() => {
    questionScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentQuestion?.id]);

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

  const selectedAnswerIds = getQuestionnaireStepAnswers(
    currentQuestion,
    questionnaire,
  );
  const canContinue = canContinueQuestionnaireStep(
    currentQuestion,
    questionnaire,
  );
  const isCompound = isSupportedCompoundSelection(
    questionAnswers.visibleSymptoms ?? [],
  );
  const mismatchKey = `${category.id}:${[
    ...(questionAnswers.visibleSymptoms ?? []),
  ]
    .sort()
    .join(',')}`;
  const isLastQuestion = activeQuestionIndex === questions.length - 1;
  const missingQuestions =
    isCompound && isLastQuestion
      ? getMissingCompoundQuestions(compoundDraft)
      : [];
  const hasImmediateDanger = (questionAnswers.immediateDanger ?? []).some(
    answerId => answerId !== 'NONE',
  );
  const handleOptionPress = (answerId: string): void => {
    if (currentQuestion.id === 'visibleSymptoms') {
      setConfirmedMismatchKey(null);
    }
    setQuestionnaire(current =>
      updateQuestionnaireAnswer(current, currentQuestion, answerId),
    );
  };

  const handleBackPress = (): void => {
    cancelActiveSubmission();

    if (activeQuestionIndex === 0) {
      navigation.goBack();
      return;
    }

    setCurrentQuestionIndex(activeQuestionIndex - 1);
  };

  const handleNextPress = async (): Promise<void> => {
    if (!canContinue || isSubmittingRef.current) {
      return;
    }

    const symptoms = questionAnswers.visibleSymptoms ?? [];
    if (
      currentQuestion.id === 'visibleSymptoms' &&
      symptoms.length > 1 &&
      !isCompound
    ) {
      Alert.alert(
        '복합 선택 확인',
        '복합 요청은 확인된 증상 2개만 지원합니다. 증상 선택을 수정해 주세요.',
      );
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
                  Alert.alert(
                    '전화 연결 안내',
                    '전화 앱에서 119로 직접 전화해 주세요.',
                  );
                });
              },
            },
            {
              text: '문진 계속',
              onPress: () => setCurrentQuestionIndex(index => index + 1),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      if (
        currentQuestion.id === 'visibleSymptoms' &&
        !isCompound &&
        !selectedAnswerIds.includes(
          SERVER_SYMPTOM_ID_BY_CATEGORY[category.id],
        ) &&
        !hasImmediateDanger &&
        confirmedMismatchKey !== mismatchKey
      ) {
        setIsMismatchModalVisible(true);
        return;
      }

      setCurrentQuestionIndex(activeQuestionIndex + 1);
      return;
    }

    if (isCompound) {
      const error = getCompoundQuestionnaireError(
        questionAnswers,
        compoundDraft,
      );
      if (error) {
        Alert.alert('복합 문진 확인', error);
        const missingIndex = questions.findIndex(
          question => !canContinueQuestionnaireStep(question, questionnaire),
        );
        if (missingIndex >= 0) {
          setCurrentQuestionIndex(missingIndex);
        }
        return;
      }
    }
    const requestController = new AbortController();
    activeSubmissionRef.current = requestController;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const guide = await handleCreateGuide(
        questionAnswers,
        requestController.signal,
        isCompound ? compoundDraft : undefined,
      );
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
        mainLabel: isCompound
          ? getSelectedCategories(symptoms)
              .map(item => item.label)
              .join(' · ')
          : category.label,
        source: 'manual',
      });
      // 관제용 위치 보고는 가이드 흐름과 독립적으로 백그라운드에서 한 번만 보냅니다.
      reportEmergencySessionLocationOnce(guide.sessionId);
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

      Alert.alert(
        '응급 가이드 생성 실패',
        getEmergencyGuideErrorMessage(error),
      );
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
        categoryLabel={
          currentQuestion.sectionLabel ??
          (isCompound ? '복합 손상' : category.label)
        }
        questions={questions}
        currentQuestionIndex={activeQuestionIndex}
        onBack={handleBackPress}
      />

      <ScrollView
        ref={questionScrollRef}
        className="mt-6 flex-1 px-5"
        showsVerticalScrollIndicator={false}
      >
        {currentQuestion.kind === 'description' ||
        (currentQuestion.kind === 'scope' &&
          compoundDraft.injuries.find(
            i => i.injuryId === currentQuestion.injuryId,
          )?.location.scope === 'LOCALIZED') ? (
          <TextInput
            accessibilityLabel="손상 부위 설명"
            className="min-h-14 rounded-xl border border-memoLine bg-white px-4 py-3 text-body font-suitMedium text-black"
            placeholder="예: 왼손 손바닥"
            placeholderTextColor="#666666"
            value={
              compoundDraft.injuries.find(
                injury => injury.injuryId === currentQuestion.injuryId,
              )?.location.description ?? ''
            }
            onChangeText={description =>
              setQuestionnaire(current =>
                updateQuestionnaireDescription(
                  current,
                  currentQuestion,
                  description,
                ),
              )
            }
          />
        ) : null}
        {currentQuestion.id === 'visibleSymptoms' ? (
          <CompoundInjurySelection
            state={questionnaire}
            initialCategory={SERVER_SYMPTOM_ID_BY_CATEGORY[category.id]}
            canChangeInjuryCount={!route.params?.isCompoundIntake}
            onChange={setQuestionnaire}
          />
        ) : null}
        {currentQuestion.kind === 'injury' ? (
          <CompoundInjuryPanel
            state={questionnaire}
            injuryId={currentQuestion.injuryId}
            onChange={setQuestionnaire}
          />
        ) : null}
        {(currentQuestion.id === 'visibleSymptoms' && isCompound
          ? []
          : currentQuestion.options
        ).map(option => (
          <EmergencyQuestionOption
            key={option.id}
            label={option.label}
            isMultiple={currentQuestion.isMultiple}
            isSelected={selectedAnswerIds.includes(option.id)}
            onPress={() => handleOptionPress(option.id)}
          />
        ))}
        {currentQuestion.id === 'immediateDanger' ? (
          <IntakeChoice
            label="판단하기 어려움"
            testID="immediate-danger-unknown"
            isSelected={
              questionAnswers.immediateDangerUnknown?.[0] === 'UNKNOWN'
            }
            onPress={() =>
              setQuestionnaire(current => ({
                ...current,
                questionAnswers: {
                  ...current.questionAnswers,
                  immediateDanger: [],
                  immediateDangerUnknown:
                    current.questionAnswers.immediateDangerUnknown?.[0] ===
                    'UNKNOWN'
                      ? []
                      : ['UNKNOWN'],
                },
              }))
            }
          />
        ) : null}
        {currentQuestion.id === 'ageGroup' && isCompound ? (
          <View className="mt-5">
            <Text className="mb-3 text-body font-suitBold text-black">
              환자 의식 상태
            </Text>
            {(
              [
                { id: 'CONSCIOUS', label: '의식 있음' },
                { id: 'UNCONSCIOUS', label: '의식 없음' },
                { id: 'UNKNOWN', label: '판단하기 어려움' },
              ] as const
            ).map(option => (
              <IntakeChoice
                key={option.id}
                testID={`consciousness-${option.id}`}
                label={option.label}
                isSelected={questionAnswers.consciousness?.[0] === option.id}
                onPress={() =>
                  setQuestionnaire(current => ({
                    ...current,
                    questionAnswers: {
                      ...current.questionAnswers,
                      consciousness: [option.id],
                    },
                  }))
                }
              />
            ))}
          </View>
        ) : null}
        {missingQuestions.length ? (
          <View className="mb-5 rounded-xl border border-memoLine bg-white px-4 py-4">
            <Text className="text-body font-suitBold text-black">
              빠뜨린 추가 질문 확인
            </Text>
            <Text className="mt-2 text-body font-suitRegular text-gray">
              답하지 않은 질문이 있으면 안내가 보류될 수 있습니다. 확인하지 못한
              내용은 ‘잘 모르겠음’으로 남겨 주세요.
            </Text>
            {missingQuestions.map(missing => (
              <View key={missing.injuryId} className="mt-4">
                <Text className="text-body font-suitBold text-black">
                  손상 {missing.injuryIndex + 1} ·{' '}
                  {
                    getSelectedCategories([
                      compoundDraft.injuries[missing.injuryIndex].categoryCode,
                    ])[0]?.label
                  }
                </Text>
                {missing.prompts.map(prompt => (
                  <Text
                    key={prompt}
                    className="mt-2 text-body font-suitRegular text-gray"
                  >
                    {prompt}
                  </Text>
                ))}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`손상 ${
                    missing.injuryIndex + 1
                  } 추가 질문 확인`}
                  disabled={isSubmitting}
                  className="mt-3 min-h-12 items-center justify-center rounded-lg border border-red px-3 py-3"
                  onPress={() => {
                    const index = questions.findIndex(
                      question =>
                        question.kind === 'injury' &&
                        question.injuryId === missing.injuryId,
                    );
                    if (index >= 0) setCurrentQuestionIndex(index);
                  }}
                >
                  <Text className="text-body font-suitBold text-red">
                    해당 질문 확인
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
        <View className="h-4" />
      </ScrollView>

      <View className="bg-background px-5 pb-5 pt-3">
        <TouchableOpacity
          accessibilityLabel={
            isLastQuestion ? '응급처치 가이드 시작' : '다음 질문'
          }
          accessibilityRole="button"
          className={`h-14 items-center justify-center rounded-lg ${
            canContinue && !isSubmitting ? 'bg-red' : 'bg-disabled'
          }`}
          disabled={!canContinue || isSubmitting}
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
