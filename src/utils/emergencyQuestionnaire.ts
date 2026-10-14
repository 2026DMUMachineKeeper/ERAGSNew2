import type {
  QuestionAnswers,
  EmergencyGuideQuestionnaireAnswer,
  CompoundCategoryCode,
  CompoundGuideRequest,
} from '@/types';
import { getEmergencyQuestions, type EmergencyCategoryId } from '@/constants';

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
  rashAppearance: 'R2_RASH_APPEARANCE',
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
  'rashAppearance',
  'feverSymptoms',
  'ageGroup',
] as const;

export const SERVER_SYMPTOM_ID_BY_CATEGORY: Record<
  EmergencyCategoryId,
  CompoundCategoryCode
> = {
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

export const toCompoundGuideRequest = (
  answers: QuestionAnswers,
  requestId: string,
): CompoundGuideRequest => {
  const symptoms = answers.visibleSymptoms ?? [];
  const entries = Object.entries(SERVER_SYMPTOM_ID_BY_CATEGORY) as [
    EmergencyCategoryId,
    CompoundCategoryCode,
  ][];
  const categories = symptoms.map(code =>
    entries.find(([, value]) => value === code),
  );
  if (
    symptoms.length !== 2 ||
    new Set(symptoms).size !== 2 ||
    categories.some(category => !category)
  ) {
    throw new Error('복합 요청은 확인된 증상 2개만 지원합니다.');
  }
  const injuries = categories.flatMap((entry, index) => {
    if (!entry) {
      return [];
    }
    const [categoryId, categoryCode] = entry;
    const injuryAnswers: QuestionAnswers = {
      immediateDanger: answers.immediateDanger ?? [],
      visibleSymptoms: [categoryCode],
      ageGroup: answers.ageGroup ?? [],
    };
    for (const question of getEmergencyQuestions(categoryId)) {
      if (
        !['immediateDanger', 'visibleSymptoms', 'ageGroup'].includes(
          question.id,
        ) &&
        answers[question.id]?.length
      ) {
        injuryAnswers[question.id] = answers[question.id];
      }
    }
    return [
      {
        injuryId: `injury-${index}`,
        categoryCode,
        confirmed: true as const,
        // 기존 문진에는 부위 입력이 없으므로 유형으로 부위를 추정하지 않습니다.
        location: { scope: 'UNKNOWN' as const, description: null },
        observations: [],
        questionnaire: toEmergencyGuideQuestionnaire(injuryAnswers),
      },
    ];
  });
  const ageGroup = answers.ageGroup?.[0];
  return {
    schemaVersion: '2',
    requestId,
    language: 'ko-KR',
    patientContext: {
      consciousness: answers.immediateDanger?.includes('UNCONSCIOUS')
        ? 'UNCONSCIOUS'
        : 'UNKNOWN',
      ageGroup:
        ageGroup === 'CHILD' || ageGroup === 'ADULT' || ageGroup === 'ELDERLY'
          ? ageGroup
          : 'UNKNOWN',
    },
    injuries: [injuries[0], injuries[1]],
    relations: [
      {
        injuryIds: [injuries[0].injuryId, injuries[1].injuryId],
        relation: 'UNKNOWN',
        confirmed: false,
      },
    ],
  };
};
