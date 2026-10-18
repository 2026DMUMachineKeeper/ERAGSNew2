import { QA19_CASES, qa19State } from '../../testSupport/qa19';
import {
  encodedQaFacts,
  pruneQaFacts,
  relevantQaFacts,
} from '@/utils/compoundQuestionFacts';
import {
  canContinueQuestionnaireStep,
  getCompoundQuestionnaireError,
  getInjuryDetailSteps,
  getQuestionnaireSteps,
  setCompoundInjuryCategory,
  setCompoundInjuryCount,
  updateQuestionnaireAnswer,
} from '@/utils/compoundQuestionnaire';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';
import { QA_FACT_QUESTIONS } from '@/constants/compoundQaData';

it('작은 상처의 10개 QA 확인은 조건을 충족할 때만 원본 순서로 표시한다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const injury = state.compoundDraft.injuries[0];
  expect(relevantQaFacts(state.compoundDraft, injury).map(q => q.id)).toEqual([
    'PRESSURE_REQUIRED',
    'HELPER_AVAILABLE',
    'CLEAN_WATER_AVAILABLE',
    'CLEAN_CLOTH_AVAILABLE',
    'BLEEDING_STOPPED',
    'SMALL_SUPERFICIAL_WOUND',
    'WOUND_BITE',
    'WOUND_CONTAMINATION',
    'WOUND_INFECTION_SIGNS',
    'INDEPENDENT_CARE_POSSIBLE',
  ]);
  expect(QA_FACT_QUESTIONS).toHaveLength(67);
});
it('비워 둔 사실과 잘 모르겠음은 각각 미전송·UNKNOWN으로 구분한다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const injury = {
    ...state.compoundDraft.injuries[0],
    qaFacts: { PRESSURE_REQUIRED: 'UNKNOWN' as const },
  };
  const draft = {
    ...state.compoundDraft,
    injuries: [injury, state.compoundDraft.injuries[1]],
  };
  expect(encodedQaFacts(draft, injury)).toEqual([
    'QA_FACT_V1:PRESSURE_REQUIRED=UNKNOWN',
  ]);
  expect(encodedQaFacts(draft, draft.injuries[1])).not.toContain(
    'QA_FACT_V1:HELPER_AVAILABLE=YES',
  );
});
it('답변 변경으로 사라진 질문의 과거 사실을 지우고 재선택해도 복원하지 않는다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const step = getInjuryDetailSteps(
    state.compoundDraft,
    state.compoundDraft.injuries[0].injuryId,
  ).find(q => q.kind === 'detail' && q.answerQuestionId === 'bleedingPattern')!;
  const changed = updateQuestionnaireAnswer(state, step, 'BLEEDING_CONTINUOUS');
  expect(
    changed.compoundDraft.injuries[0].qaFacts?.BLEEDING_STOPPED,
  ).toBeUndefined();
  const draft = pruneQaFacts({
    ...changed.compoundDraft,
    injuries: changed.compoundDraft.injuries.map((i, index) =>
      index ? i : { ...i, answers: state.compoundDraft.injuries[0].answers },
    ),
  });
  expect(draft.injuries[0].qaFacts?.BLEEDING_STOPPED).toBeUndefined();
});
it('관계 변경 후 개별 처치 가능 답변을 재사용하지 않는다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const draft = pruneQaFacts({ ...state.compoundDraft, relation: 'SAME' });
  expect(
    draft.injuries.every(
      i => i.qaFacts?.INDEPENDENT_CARE_POSSIBLE === undefined,
    ),
  ).toBe(true);
  expect(
    relevantQaFacts(draft, draft.injuries[0]).some(
      q => q.id === 'SURFACES_OVERLAP',
    ),
  ).toBe(true);
  expect(
    relevantQaFacts(draft, draft.injuries[1]).some(
      q => q.id === 'SURFACES_OVERLAP',
    ),
  ).toBe(false);
});
it('같은 출혈 2개는 개별 확인 전 진행하지 않고 별도 답변으로 전송한다', () => {
  const complete = qa19State(QA19_CASES[1].request);
  const single = setCompoundInjuryCount(complete, 1);
  const selected = setCompoundInjuryCount(single, 2);
  const selection = getQuestionnaireSteps(
    'bleeding',
    selected.questionAnswers,
    selected.compoundDraft,
  )[1];
  expect(canContinueQuestionnaireStep(selection, selected)).toBe(false);
  expect(canContinueQuestionnaireStep(selection, complete)).toBe(true);
  const changed = {
    ...complete,
    compoundDraft: {
      ...complete.compoundDraft,
      injuries: complete.compoundDraft.injuries.map((i, index) =>
        index
          ? {
              ...i,
              answers: {
                bleedingPattern: ['BLEEDING_CONTINUOUS'],
                woundRisk: ['NONE'],
              },
            }
          : i,
      ),
    },
  };
  const request = toCompoundGuideRequest(
    changed.questionAnswers,
    'id',
    changed.compoundDraft,
  );
  expect(request.injuries[0].questionnaire[1].answerIds).toEqual([
    'BLEEDING_OOZING',
  ]);
  expect(request.injuries[1].questionnaire[1].answerIds).toEqual([
    'BLEEDING_CONTINUOUS',
  ]);
});
it('유형 변경은 해당 문진과 공통 사실을 해제한다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const changed = setCompoundInjuryCategory(state, 0, 'BURN');
  expect(changed.compoundDraft.injuries[0]).toMatchObject({
    categoryCode: 'BURN',
    answers: {},
    qaFacts: {},
    isConfirmed: false,
  });
  expect(
    changed.compoundDraft.injuries[1].qaFacts?.HELPER_AVAILABLE,
  ).toBeUndefined();
});
it('의식 확인을 생략하거나 NONE만 선택해도 의식 있음으로 추정하지 않는다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const answers = { ...state.questionAnswers, consciousness: [] };
  expect(
    getCompoundQuestionnaireError(answers, state.compoundDraft),
  ).not.toBeNull();
  const unknown = toCompoundGuideRequest(
    { ...answers, consciousness: ['UNKNOWN'] },
    'id',
    state.compoundDraft,
  );
  expect(unknown.patientContext.consciousness).toBe('UNKNOWN');
  const unconscious = toCompoundGuideRequest(
    {
      ...answers,
      consciousness: ['CONSCIOUS'],
      immediateDanger: ['UNCONSCIOUS'],
    },
    'id',
    state.compoundDraft,
  );
  expect(unconscious.patientContext.consciousness).toBe('UNCONSCIOUS');
});
