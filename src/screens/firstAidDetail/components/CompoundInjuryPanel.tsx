import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { EmergencyQuestionOption } from '@/components/EmergencyGuide';
import { fractureSkinFollowup } from '@/constants/compoundQaData';
import type {
  CompoundQuestionnaireInjury,
  QaFactAnswer,
  QuestionnaireState,
  QuestionnaireStep,
} from '@/types';
import {
  getInjuryDetailSteps,
  updateQuestionnaireAnswer,
} from '@/utils/compoundQuestionnaire';
import { pruneQaFacts, relevantQaFacts } from '@/utils/compoundQuestionFacts';

export const IntakeChoice = ({
  label,
  isSelected,
  onPress,
  testID,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
}): React.JSX.Element => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{ selected: isSelected }}
    testID={testID}
    onPress={onPress}
    className={`mb-2 rounded-lg border px-4 py-3 ${
      isSelected ? 'border-red bg-white' : 'border-memoLine bg-white'
    }`}
  >
    <Text className="text-body font-suitMedium text-black">
      {isSelected ? '✓ ' : ''}
      {label}
    </Text>
  </TouchableOpacity>
);
interface Props {
  state: QuestionnaireState;
  injuryId: string;
  onChange: React.Dispatch<React.SetStateAction<QuestionnaireState>>;
}
export const CompoundInjuryPanel = ({
  state,
  injuryId,
  onChange,
}: Props): React.JSX.Element | null => {
  const injury = state.compoundDraft.injuries.find(
    item => item.injuryId === injuryId,
  );
  if (!injury) {
    return null;
  }
  const handlePatch = (change: Partial<CompoundQuestionnaireInjury>): void => {
    onChange(current => ({
      ...current,
      compoundDraft: pruneQaFacts({
        ...current.compoundDraft,
        injuries: current.compoundDraft.injuries.map(item =>
          item.injuryId === injuryId ? { ...item, ...change } : item,
        ),
      }),
    }));
  };
  const handleDetail = (step: QuestionnaireStep, answerId: string): void =>
    onChange(current => updateQuestionnaireAnswer(current, step, answerId));
  return (
    <View>
      {getInjuryDetailSteps(state.compoundDraft, injuryId).map(step => (
        <View key={step.id} className="mb-5">
          <Text className="mb-3 text-body font-suitBold text-black">
            {step.prompt}
          </Text>
          {step.options.map(option => (
            <EmergencyQuestionOption
              key={option.id}
              label={option.label}
              isMultiple={step.isMultiple}
              isSelected={(
                injury.answers[
                  step.kind === 'detail' ? step.answerQuestionId : ''
                ] ?? []
              ).includes(option.id)}
              onPress={() => handleDetail(step, option.id)}
            />
          ))}
        </View>
      ))}
      <Text className="mb-3 text-body font-suitBold text-black">추가 확인</Text>
      <Text className="mb-4 text-caption font-suitMedium text-gray">
        확인한 내용만 선택해 주세요. 확인하지 못한 항목은 비워 두거나 ‘잘
        모르겠음’을 선택할 수 있습니다.
      </Text>
      {injury.categoryCode === 'FRACTURE_BRUISE' ? (
        <View className="mb-5">
          <Text className="mb-3 text-body font-suitBold text-black">
            {fractureSkinFollowup.question}
          </Text>
          {fractureSkinFollowup.options.map(option => (
            <IntakeChoice
              key={option.value}
              testID={`skin-${option.value}`}
              label={option.label}
              isSelected={injury.fractureSkinAnswer === option.value}
              onPress={() =>
                handlePatch({
                  fractureSkinAnswer:
                    injury.fractureSkinAnswer === option.value
                      ? null
                      : option.value,
                })
              }
            />
          ))}
        </View>
      ) : null}
      {relevantQaFacts(state.compoundDraft, injury).map(question => (
        <View key={question.id} className="mb-5">
          <Text className="mb-3 text-body font-suitBold text-black">
            {question.prompt}
          </Text>
          {(
            [
              { id: 'YES', label: '예' },
              { id: 'NO', label: '아니요' },
              { id: 'UNKNOWN', label: '잘 모르겠음' },
            ] as const
          ).map(option => (
            <IntakeChoice
              key={option.id}
              testID={`fact-${question.id}-${option.id}`}
              label={option.label}
              isSelected={injury.qaFacts?.[question.id] === option.id}
              onPress={() => {
                const qaFacts = { ...injury.qaFacts };
                if (qaFacts[question.id] === option.id) {
                  delete qaFacts[question.id];
                } else {
                  qaFacts[question.id] = option.id as QaFactAnswer;
                }
                handlePatch({ qaFacts });
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};
