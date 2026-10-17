import {
  FIRST_AID_CATEGORIES,
  SERVER_SYMPTOM_ID_BY_CATEGORY,
  getEmergencyQuestions,
} from '@/constants';
import type {
  CompoundCategoryCode,
  QuestionAnswers,
  QuestionnaireState,
} from '@/types';
import {
  canContinueQuestionnaireStep,
  getCompoundQuestionnaireError,
  getQuestionnaireSteps,
  getInjuryDetailSteps,
  updateQuestionnaireAnswer,
  updateQuestionnaireDescription,
} from '@/utils/compoundQuestionnaire';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';

const DETAILS: Record<CompoundCategoryCode, QuestionAnswers> = {
  BLEEDING: { bleedingPattern: ['BLEEDING_OOZING'], woundRisk: ['NONE'] },
  BURN: { burnCause: ['BURN_SMALL_AREA'], burnSkinState: ['BLISTER'] },
  FRACTURE_BRUISE: {
    injuryState: ['MINOR_BRUISE'],
    distalCondition: ['NORMAL_DISTAL'],
  },
  FEVER_NEUROLOGIC: { feverSymptoms: ['TEMP_38_TO_38_9'] },
  ALLERGY_RASH: {
    allergyRisk: ['LOCAL_RASH'],
    rashAppearance: ['RASH_FLAT_SPOTS'],
  },
  AIRWAY_OBSTRUCTION: { speakOrCough: ['CAN_SPEAK_OR_COUGH'] },
};
const selection = getEmergencyQuestions('bleeding')[1];
const empty = (): QuestionnaireState => ({
  questionAnswers: {
    immediateDanger: ['NONE'],
    ageGroup: ['ADULT'],
    consciousness: ['CONSCIOUS'],
  },
  compoundDraft: { injuries: [], relation: null },
});
const steps = (state: QuestionnaireState) =>
  getQuestionnaireSteps('bleeding', state.questionAnswers, state.compoundDraft);
const select = (state: QuestionnaireState, id: string, value: string) => {
  const question = [
    ...steps(state),
    ...state.compoundDraft.injuries.flatMap(i =>
      getInjuryDetailSteps(state.compoundDraft, i.injuryId),
    ),
  ].find(step => step.id === id);
  if (!question) {
    throw new Error(`질문 없음: ${id}`);
  }
  return updateQuestionnaireAnswer(state, question, value);
};
const complete = (
  codes: readonly CompoundCategoryCode[] = ['BLEEDING', 'FRACTURE_BRUISE'],
): QuestionnaireState => {
  let state = empty();
  for (const code of codes) {
    state = updateQuestionnaireAnswer(state, selection, code);
  }
  return {
    ...state,
    compoundDraft: {
      relation: 'DIFFERENT',
      injuries: state.compoundDraft.injuries.map((injury, index) => ({
        ...injury,
        location: {
          scope: 'LOCALIZED',
          description: index === 0 ? '왼손' : '오른쪽 다리',
        },
        answers: DETAILS[injury.categoryCode],
      })),
    },
  };
};

describe('단일·복합 문진 분기와 요청 연결', () => {
  it('국소 출혈+골절의 상세와 추가 확인은 손상별 화면으로 묶는다', () => {
    const state = complete();
    expect(steps(state).map(step => step.id)).toEqual([
      'immediateDanger',
      'visibleSymptoms',
      'injury-0:scope',
      'injury-1:scope',
      'compoundRelation',
      'injury-0:injury',
      'injury-1:injury',
      'ageGroup',
    ]);
    const previousDraft = {
      ...state.compoundDraft,
      injuries: state.compoundDraft.injuries.map(injury => ({
        ...injury,
        skinAnswer: 'OPEN_WOUND',
        facts: { PRESSURE_REQUIRED: 'YES' },
      })),
    };
    const request = toCompoundGuideRequest(
      state.questionAnswers,
      'id',
      previousDraft,
    );
    expect(request.injuries.map(injury => injury.observations)).toEqual([
      [],
      [],
    ]);
  });
  const codes = FIRST_AID_CATEGORIES.map(
    category => SERVER_SYMPTOM_ID_BY_CATEGORY[category.id],
  );
  const pairs = codes.flatMap((code, index) =>
    codes.slice(index + 1).map(other => [code, other] as const),
  );

  it.each(pairs)(
    '%s + %s는 각 유형의 상세 문진과 서버 답변을 분리한다',
    (first, second) => {
      const state = complete([first, second]);
      expect(
        getCompoundQuestionnaireError(
          state.questionAnswers,
          state.compoundDraft,
        ),
      ).toBeNull();
      const request = toCompoundGuideRequest(
        state.questionAnswers,
        'request',
        state.compoundDraft,
      );
      for (const [index, code] of [first, second].entries()) {
        const detailSteps = getInjuryDetailSteps(
          state.compoundDraft,
          `injury-${index}`,
        );
        expect(
          detailSteps.map(step =>
            step.kind === 'detail' ? step.answerQuestionId : '',
          ),
        ).toEqual(Object.keys(DETAILS[code]));
        expect(request.injuries[index].categoryCode).toBe(code);
        expect(
          request.injuries[index].questionnaire.some(
            q => q.questionId === 'Q2_VISIBLE_SYMPTOMS',
          ),
        ).toBe(false);
        expect(request.injuries[index].questionnaire).toHaveLength(
          detailSteps.length + 2,
        );
        expect(
          request.injuries[index].questionnaire.length,
        ).toBeLessThanOrEqual(5);
        expect(request.injuries[index].observations).toEqual([]);
      }
      expect(request.relations[0]).toMatchObject({
        relation: 'DIFFERENT',
        confirmed: true,
      });
    },
  );

  it('단일 선택은 기존 질문 목록과 전송 경로를 유지한다', () => {
    const state = updateQuestionnaireAnswer(empty(), selection, 'BLEEDING');
    expect(steps(state)).toEqual(getEmergencyQuestions('bleeding'));
    expect(state.compoundDraft.injuries).toEqual([]);
  });

  it('특정 부위 설명은 공백으로 진행할 수 없고 손상별 입력을 분리한다', () => {
    let state = complete();
    const description = steps(state).find(
      step => step.id === 'injury-0:scope',
    )!;
    state = updateQuestionnaireDescription(state, description, '   ');
    expect(canContinueQuestionnaireStep(description, state)).toBe(false);
    expect(() =>
      toCompoundGuideRequest(state.questionAnswers, 'id', state.compoundDraft),
    ).toThrow();
    state = updateQuestionnaireDescription(state, description, '  왼쪽 손목  ');
    expect(canContinueQuestionnaireStep(description, state)).toBe(true);
    const request = toCompoundGuideRequest(
      state.questionAnswers,
      'id',
      state.compoundDraft,
    );
    expect(request.injuries.map(injury => injury.location.description)).toEqual(
      ['왼쪽 손목', '오른쪽 다리'],
    );
  });

  it('범위를 바꾸면 맞지 않는 관계와 부위 설명을 지우고 전신 관계만 허용한다', () => {
    let state = select(complete(), 'injury-1:scope', 'SYSTEMIC');
    expect(state.compoundDraft.relation).toBeNull();
    expect(state.compoundDraft.injuries[1].location.description).toBe('');
    const relation = steps(state).find(step => step.kind === 'relation')!;
    expect(relation.options.map(option => option.id)).toEqual([
      'NOT_APPLICABLE',
      'UNKNOWN',
    ]);
    expect(select(state, relation.id, 'DIFFERENT')).toBe(state);
    expect(canContinueQuestionnaireStep(relation, state)).toBe(false);
    state = select(state, relation.id, 'NOT_APPLICABLE');
    expect(
      toCompoundGuideRequest(state.questionAnswers, 'id', state.compoundDraft)
        .relations[0],
    ).toMatchObject({ relation: 'NOT_APPLICABLE', confirmed: true });
  });

  it('같은 범위를 다시 누르면 입력한 부위 설명을 보존한다', () => {
    const state = select(complete(), 'injury-0:scope', 'LOCALIZED');
    expect(state.compoundDraft.injuries[0].location.description).toBe('왼손');
  });

  it('미확인 범위·관계는 실제 미확인 값으로 보내고 정상으로 바꾸지 않는다', () => {
    let state = select(complete(), 'injury-0:scope', 'UNKNOWN');
    state = select(state, 'compoundRelation', 'UNKNOWN');
    const request = toCompoundGuideRequest(
      state.questionAnswers,
      'id',
      state.compoundDraft,
    );
    expect(request.injuries[0].location).toEqual({
      scope: 'UNKNOWN',
      description: null,
    });
    expect(request.relations[0]).toMatchObject({
      relation: 'UNKNOWN',
      confirmed: false,
    });
  });

  it('복합에서 증상 선택을 바꾸면 이전 손상의 답변·관찰·관계를 새 손상에 복사하지 않는다', () => {
    let state = complete();
    state = updateQuestionnaireAnswer(state, selection, 'FRACTURE_BRUISE');
    expect(steps(state)).toEqual(getEmergencyQuestions('bleeding'));
    state = updateQuestionnaireAnswer(state, selection, 'BURN');
    expect(state.compoundDraft.relation).toBeNull();
    expect(state.compoundDraft.injuries[1]).toMatchObject({
      categoryCode: 'BURN',
      answers: {},
      location: { scope: null, description: '' },
    });
  });

  it('발열은 체온 구간을 고르기 전 다음으로 진행하지 않고 동반 증상은 보존한다', () => {
    let state = complete(['BLEEDING', 'FEVER_NEUROLOGIC']);
    state = {
      ...state,
      compoundDraft: {
        ...state.compoundDraft,
        injuries: state.compoundDraft.injuries.map((i, index) =>
          index === 1 ? { ...i, answers: {} } : i,
        ),
      },
    };
    state = select(state, 'injury-1:feverSymptoms', 'SEIZURE');
    const question = getInjuryDetailSteps(state.compoundDraft, 'injury-1').find(
      step => step.id === 'injury-1:feverSymptoms',
    )!;
    expect(canContinueQuestionnaireStep(question, state)).toBe(false);
    state = select(state, question.id, 'TEMP_UNKNOWN');
    expect(canContinueQuestionnaireStep(question, state)).toBe(true);
    expect(state.compoundDraft.injuries[1].answers.feverSymptoms).toEqual([
      'TEMP_UNKNOWN',
      'SEIZURE',
    ]);
  });
});
