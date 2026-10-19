import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import {
  isFractureSkinAnswerRequired,
  pruneQaFacts,
  relevantQaFacts,
} from '@/utils/compoundQuestionFacts';
import { useCompoundInjuryEvidence } from '@/hooks/useCompoundInjuryEvidence';

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
  const [expandedInjuryId, setExpandedInjuryId] = React.useState<string | null>(
    null,
  );
  const injury = state.compoundDraft.injuries.find(
    item => item.injuryId === injuryId,
  );
  const { isBusy, isRecording, handleAddPhoto, handleAudio } =
    useCompoundInjuryEvidence(injury, state, onChange);
  if (!injury) {
    return null;
  }
  const isBurn = injury.categoryCode === 'BURN';
  const isAdditionalExpanded = !isBurn || expandedInjuryId === injuryId;
  const questions = relevantQaFacts(state.compoundDraft, injury);
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
      <Text className="mb-3 text-body font-suitBold text-black">
        {isBurn ? '추가 확인 · 선택' : '추가 확인 · 필수'}
      </Text>
      <Text className="mb-4 text-caption font-suitMedium text-gray">
        {isBurn
          ? '화상 기본 질문은 위의 2개입니다. 아래 추가 확인은 선택 사항이며, 답변이 부족하면 안내가 보류될 수 있습니다.'
          : '각 질문에 답해야 다음으로 이동할 수 있습니다. 확인한 내용대로 선택하고, 확인하기 어려운 항목은 모름을 선택해 주세요. 답변에 따라 안내가 보류될 수 있습니다.'}
      </Text>
      {isBurn && questions.length > 0 ? (
        <TouchableOpacity
          testID="burn-additional-toggle"
          accessibilityRole="button"
          accessibilityLabel="화상 추가 확인 펼치기 또는 접기"
          accessibilityState={{ expanded: isAdditionalExpanded }}
          onPress={() =>
            setExpandedInjuryId(isAdditionalExpanded ? null : injuryId)
          }
          className="mb-4 min-h-12 justify-center rounded-lg border border-memoLine px-4 py-3"
        >
          <Text className="text-body font-suitMedium text-black">
            {isAdditionalExpanded
              ? '추가 확인 접기'
              : `추가 확인 ${questions.length}개 보기 · 선택`}
          </Text>
        </TouchableOpacity>
      ) : null}
      {injury.categoryCode === 'FRACTURE_BRUISE' ? (
        <View className="mb-5">
          {isFractureSkinAnswerRequired(injury) ? (
            <Text className="mb-2 text-coment font-suitBold text-red">
              필수 확인 · 확인할 수 없다면 모름을 선택해 주세요.
            </Text>
          ) : null}
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
      {(isAdditionalExpanded ? questions : []).map(question => (
        <View key={question.id} className="mb-5">
          <Text className="mb-3 text-body font-suitBold text-black">
            {question.prompt}
          </Text>
          {(
            [
              { id: 'YES', label: '예' },
              { id: 'NO', label: '아니요' },
              { id: 'UNKNOWN', label: '확인 어려움' },
            ] as const
          ).map(option => (
            <IntakeChoice
              key={option.id}
              testID={`fact-${question.id}-${option.id}`}
              label={option.label}
              isSelected={injury.qaFacts?.[question.id] === option.id}
              onPress={() => {
                const qaFacts = { ...injury.qaFacts };
                qaFacts[question.id] = option.id as QaFactAnswer;
                handlePatch({ qaFacts });
              }}
            />
          ))}
        </View>
      ))}
      <Text className="mb-3 text-body font-suitBold text-black">
        관찰 내용·사진·음성 (선택)
      </Text>
      <Text className="mb-3 text-caption font-suitMedium text-gray">
        이 손상의 자료만 첨부해 주세요. 사진은 두 손상 합계 5장, 음성은 1개까지
        가능합니다.
      </Text>
      <TextInput
        accessibilityLabel="이 손상의 추가 관찰 내용"
        multiline
        value={injury.observationText ?? ''}
        onChangeText={observationText => handlePatch({ observationText })}
        placeholder="직접 확인한 내용을 적어 주세요."
        className="mb-4 min-h-20 rounded-lg border border-memoLine bg-white px-4 py-3 text-body font-suitMedium text-black"
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="이 손상 사진 촬영"
        disabled={isBusy}
        onPress={handleAddPhoto}
        className="mb-3 rounded-lg border border-memoLine bg-white px-4 py-3"
      >
        <Text className="text-body font-suitMedium text-black">사진 촬영</Text>
      </TouchableOpacity>
      {injury.images?.map((image, index) => (
        <TouchableOpacity
          key={`${image.uri}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`이 손상 사진 ${index + 1} 삭제`}
          disabled={isBusy}
          onPress={() =>
            handlePatch({
              images: injury.images?.filter((_, i) => i !== index),
            })
          }
          className="mb-2 rounded-lg border border-memoLine bg-white px-4 py-3"
        >
          <Text className="text-body font-suitMedium text-black">
            사진 {index + 1} · 삭제
          </Text>
        </TouchableOpacity>
      ))}
      {injury.audio ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="이 손상 음성 삭제"
          disabled={isBusy}
          onPress={() => handlePatch({ audio: null })}
          className="mb-3 rounded-lg border border-memoLine bg-white px-4 py-3"
        >
          <Text className="text-body font-suitMedium text-black">
            녹음 첨부됨 · 삭제
          </Text>
        </TouchableOpacity>
      ) : state.compoundDraft.injuries.some(item => item.audio) ? (
        <Text className="mb-3 text-caption font-suitMedium text-gray">
          다른 손상에 음성이 첨부되어 있습니다.
        </Text>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            isRecording ? '이 손상 녹음 완료' : '이 손상 음성 녹음'
          }
          disabled={isBusy && !isRecording}
          onPress={handleAudio}
          className="mb-3 rounded-lg border border-memoLine bg-white px-4 py-3"
        >
          <Text className="text-body font-suitMedium text-black">
            {isRecording ? '녹음 완료' : '음성 녹음'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
