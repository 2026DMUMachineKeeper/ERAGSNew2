import request1 from './qa19/case-1-request.json';
import request2 from './qa19/case-2-request.json';
import request3 from './qa19/case-3-request.json';
import response1 from './qa19/case-1-response.json';
import response2 from './qa19/case-2-response.json';
import response3 from './qa19/case-3-response.json';
import type {
  CompoundGuideRequest,
  QaFactAnswer,
  QaFactId,
  QuestionnaireState,
} from '@/types';

export const QA19_CASES = [
  {
    request: request1 as unknown as CompoundGuideRequest,
    response: response1,
    count: 6,
  },
  {
    request: request2 as unknown as CompoundGuideRequest,
    response: response2,
    count: 4,
  },
  {
    request: request3 as unknown as CompoundGuideRequest,
    response: response3,
    count: 2,
  },
];
const SCREEN_IDS: Record<string, string> = {
  Q1_IMMEDIATE_DANGER: 'immediateDanger',
  C1_AGE_GROUP: 'ageGroup',
  B1_BLEEDING_PATTERN: 'bleedingPattern',
  B2_BLEEDING_RISKS: 'woundRisk',
  F1_INJURY_STATE: 'injuryState',
  F2_DISTAL_STATE: 'distalCondition',
  U1_BURN_LOCATION_CAUSE: 'burnCause',
  U2_BURN_SKIN_STATE: 'burnSkinState',
};
export const qa19State = (
  request: CompoundGuideRequest,
): QuestionnaireState => ({
  questionAnswers: {
    immediateDanger: request.injuries[0].questionnaire.find(
      q => q.questionId === 'Q1_IMMEDIATE_DANGER',
    )!.answerIds,
    ageGroup: [request.patientContext.ageGroup],
    consciousness: [request.patientContext.consciousness],
    visibleSymptoms: request.injuries.map(i => i.categoryCode),
  },
  compoundDraft: {
    relation: request.relations[0].relation,
    injuries: request.injuries.map((injury, index) => ({
      injuryId: injury.injuryId,
      categoryCode: injury.categoryCode,
      isConfirmed: true,
      location: {
        ...injury.location,
        description: injury.location.description ?? '',
      },
      answers: Object.fromEntries(
        injury.questionnaire
          .filter(
            q =>
              !['Q1_IMMEDIATE_DANGER', 'C1_AGE_GROUP'].includes(q.questionId),
          )
          .map(q => [SCREEN_IDS[q.questionId], q.answerIds]),
      ),
      qaFacts: Object.fromEntries(
        injury.observations.flatMap(value => {
          const match = /^QA_FACT_V1:([A-Z_]+)=(YES|NO|UNKNOWN)$/.exec(value);
          // 두 손상에 공통인 답변은 화면에서 한 번만 선택합니다.
          return !match || (index === 1 && match[1] === 'HELPER_AVAILABLE')
            ? []
            : [[match[1] as QaFactId, match[2] as QaFactAnswer]];
        }),
      ),
    })),
  },
});
