import React from 'react';
import { createCompoundGuide, createEmergencyGuide } from '@/services';
import type { QuestionAnswers } from '@/types';
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
  ) => {
    if ((answers.visibleSymptoms ?? []).length > 1) {
      const content = JSON.stringify(toCompoundGuideRequest(answers, ''));
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
        toCompoundGuideRequest(answers, compoundRequestRef.current.requestId),
        signal,
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
