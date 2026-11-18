import React from 'react';
import { Image, Text, View } from 'react-native';
import type { EmergencyGuidePhotoRequest, QuestionnaireState } from '@/types';
import { getSelectedCategories } from '@/utils/compoundQuestionnaire';
import {
  assignPreviousEvidence,
  getPreviousEmergencyEvidence,
  getPreviousEvidenceInjuryId,
} from '@/utils/previousEmergencyEvidence';
import { IntakeChoice } from './CompoundInjuryPanel';

interface Props {
  media: EmergencyGuidePhotoRequest;
  state: QuestionnaireState;
  isCompound: boolean;
  onChange: React.Dispatch<React.SetStateAction<QuestionnaireState>>;
}

export const PreviousEvidencePanel = ({
  media,
  state,
  isCompound,
  onChange,
}: Props): React.JSX.Element => (
  <View className="mb-5 rounded-xl border border-memoLine bg-white p-4">
    <Text className="mb-2 text-body font-suitBold text-black">
      처음 보낸 자료
    </Text>
    <Text className="mb-3 text-caption font-suitMedium text-gray">
      {isCompound
        ? '추가 답변과 함께 보냅니다. 각 자료가 해당하는 손상을 선택해 주세요.'
        : '처음 보낸 사진·음성·설명을 추가 답변과 함께 다시 보냅니다.'}
    </Text>
    {getPreviousEmergencyEvidence(media).map((evidence, index) => (
      <View key={evidence.id} className="mb-3">
        {evidence.kind === 'image' ? (
          <Image
            source={{ uri: evidence.file.uri }}
            accessibilityLabel={`처음 보낸 사진 ${index + 1}`}
            className="mb-2 h-32 w-full rounded-lg"
            resizeMode="contain"
          />
        ) : null}
        <Text className="mb-2 text-body font-suitMedium text-black">
          {evidence.kind === 'text'
            ? evidence.text
            : evidence.kind === 'image'
            ? `사진 ${index + 1}`
            : '처음 녹음한 음성'}
        </Text>
        {isCompound
          ? state.compoundDraft.injuries.map((injury, injuryIndex) => (
              <IntakeChoice
                key={injury.injuryId}
                testID={`previous-${evidence.id}-${injury.injuryId}`}
                label={`손상 ${injuryIndex + 1} · ${
                  getSelectedCategories([injury.categoryCode])[0]?.label ??
                  '유형 선택 필요'
                }`}
                isSelected={
                  getPreviousEvidenceInjuryId(state.compoundDraft, evidence) ===
                  injury.injuryId
                }
                onPress={() =>
                  onChange(current => ({
                    ...current,
                    compoundDraft: assignPreviousEvidence(
                      current.compoundDraft,
                      evidence,
                      injury.injuryId,
                    ),
                  }))
                }
              />
            ))
          : null}
      </View>
    ))}
  </View>
);
