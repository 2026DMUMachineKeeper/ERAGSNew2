import type { QuestionAnswers, EmergencyGuideQuestionnaireAnswer } from '@/types';
import type { EmergencyCategoryId } from '@/constants';

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

export const SERVER_SYMPTOM_ID_BY_CATEGORY: Record<EmergencyCategoryId, string> = {
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
