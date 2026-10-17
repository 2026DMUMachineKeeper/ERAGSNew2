import React from 'react';
import { Text, View } from 'react-native';
import {
  FIRST_AID_CATEGORIES,
  SERVER_SYMPTOM_ID_BY_CATEGORY,
} from '@/constants';
import type { CompoundCategoryCode, QuestionnaireState } from '@/types';
import {
  setCompoundInjuryCategory,
  setCompoundInjuryCount,
} from '@/utils/compoundQuestionnaire';
import { IntakeChoice } from './CompoundInjuryPanel';
interface Props {
  state: QuestionnaireState;
  initialCategory: CompoundCategoryCode;
  onChange: React.Dispatch<React.SetStateAction<QuestionnaireState>>;
}
export const CompoundInjurySelection = ({
  state,
  initialCategory,
  onChange,
}: Props): React.JSX.Element => {
  const { compoundDraft } = state;
  const isCompound = compoundDraft.injuries.length === 2;
  return (
    <View className="mb-5">
      <Text className="mb-3 text-body font-suitBold text-black">손상 수</Text>
      {([1, 2] as const).map(count => (
        <IntakeChoice
          key={count}
          testID={`injury-count-${count}`}
          label={`손상 ${count}개`}
          isSelected={count === (isCompound ? 2 : 1)}
          onPress={() =>
            onChange(current =>
              setCompoundInjuryCount(current, count, initialCategory),
            )
          }
        />
      ))}
      {isCompound
        ? compoundDraft.injuries.map((injury, index) => (
            <View key={injury.injuryId} className="mt-4">
              <Text className="mb-2 text-body font-suitBold text-black">
                손상 {index + 1}
              </Text>
              {FIRST_AID_CATEGORIES.map(item => (
                <IntakeChoice
                  key={item.id}
                  testID={`category-${index}-${
                    SERVER_SYMPTOM_ID_BY_CATEGORY[item.id]
                  }`}
                  label={item.label}
                  isSelected={
                    injury.categoryCode ===
                    SERVER_SYMPTOM_ID_BY_CATEGORY[item.id]
                  }
                  onPress={() =>
                    onChange(current =>
                      setCompoundInjuryCategory(
                        current,
                        index,
                        SERVER_SYMPTOM_ID_BY_CATEGORY[item.id],
                      ),
                    )
                  }
                />
              ))}
              <IntakeChoice
                label="이 손상 유형을 직접 확인했습니다"
                testID={`confirm-injury-${index}`}
                isSelected={injury.isConfirmed !== false}
                onPress={() =>
                  onChange(current => ({
                    ...current,
                    compoundDraft: {
                      ...current.compoundDraft,
                      injuries: current.compoundDraft.injuries.map((item, i) =>
                        i === index
                          ? { ...item, isConfirmed: item.isConfirmed === false }
                          : item,
                      ),
                    },
                  }))
                }
              />
            </View>
          ))
        : null}
    </View>
  );
};
