import type {
  QA_FACT_IDS,
  fractureSkinFollowup,
} from '@/constants/compoundQaData';
import type {
  CompoundCategoryCode,
  CompoundGuideInjuryInput,
  CompoundGuideRequest,
} from './emergencyGuide.types';
import type { QuestionAnswers } from './emergencyQuestionnaire.types';
import type { EmergencyQuestion } from '@/constants/emergencyQuestionData';
export type CompoundLocationScope =
  CompoundGuideInjuryInput['location']['scope'];
export type CompoundRelation = CompoundGuideRequest['relations'][0]['relation'];
export type QaFactId = (typeof QA_FACT_IDS)[number];
export type QaFactAnswer = 'YES' | 'NO' | 'UNKNOWN';
export interface CompoundQuestionnaireInjury {
  injuryId: string;
  categoryCode: CompoundCategoryCode;
  location: { scope: CompoundLocationScope | null; description: string };
  answers: QuestionAnswers;
  qaFacts?: Partial<Record<QaFactId, QaFactAnswer>>;
  fractureSkinAnswer?:
    | (typeof fractureSkinFollowup.options)[number]['value']
    | null;
  isConfirmed?: boolean;
}
export interface CompoundQuestionnaireDraft {
  injuries: readonly CompoundQuestionnaireInjury[];
  relation: CompoundRelation | null;
}

interface QuestionStepPresentation extends EmergencyQuestion {
  sectionLabel?: string;
  maxSelections?: number;
}

export type QuestionnaireStep = QuestionStepPresentation &
  (
    | { kind?: undefined }
    | { kind: 'detail'; injuryId: string; answerQuestionId: string }
    | { kind: 'scope' | 'description' | 'injury'; injuryId: string }
    | { kind: 'relation' }
  );

export interface QuestionnaireState {
  questionAnswers: QuestionAnswers;
  compoundDraft: CompoundQuestionnaireDraft;
}
