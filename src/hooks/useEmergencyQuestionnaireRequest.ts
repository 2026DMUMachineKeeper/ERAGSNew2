import React from 'react';
import { createCompoundGuide, createEmergencyGuide } from '@/services';
import type { CompoundQuestionnaireDraft, QuestionAnswers } from '@/types';
import {
  toCompoundGuideRequest,
  toEmergencyGuideQuestionnaire,
} from '@/utils/emergencyQuestionnaire';

export const useEmergencyQuestionnaireRequest = () => {
  const compoundRequestRef = React.useRef<{
    content: string;
    requestId: string;
  } | null>(null);
  const handleCreateGuide = async (
    answers: QuestionAnswers,
    signal: AbortSignal,
    compoundDraft?: CompoundQuestionnaireDraft,
  ) => {
    if ((answers.visibleSymptoms ?? []).length > 1) {
      const media = {
        images:
          compoundDraft?.injuries.flatMap(injury => injury.images ?? []) ?? [],
        audio:
          compoundDraft?.injuries.find(injury => injury.audio)?.audio ??
          undefined,
      };
      const content = JSON.stringify({
        request: toCompoundGuideRequest(answers, '', compoundDraft),
        media,
      });
      // 동일 내용의 통신 재시도는 같은 ID를 사용해 중복 세션 생성을 피합니다.
      if (compoundRequestRef.current?.content !== content) {
        compoundRequestRef.current = {
          content,
          requestId: `compound-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
        };
      }
      return createCompoundGuide(
        toCompoundGuideRequest(
          answers,
          compoundRequestRef.current.requestId,
          compoundDraft,
        ),
        signal,
        media,
      );
    }
    const formData = new FormData();
    formData.append(
      'request',
      JSON.stringify({ requestId: `manual-${Date.now()}`, language: 'ko-KR' }),
    );
    const questionnaire = JSON.stringify(
      toEmergencyGuideQuestionnaire(answers),
    );
    console.warn('[EmergencyGuide API][Questionnaire]', questionnaire);
    formData.append('questionnaire', questionnaire);
    return createEmergencyGuide(formData, signal);
  };
  return { handleCreateGuide };
};
