import { pruneQaFacts } from './compoundQuestionFacts';
import {
  FIRST_AID_CATEGORIES,
  SERVER_SYMPTOM_ID_BY_CATEGORY,
  getEmergencyQuestions,
  getNextEmergencyAnswerIds,
  type EmergencyCategoryId,
} from '@/constants';
import {
  COMPOUND_RELATION_OPTIONS,
  COMPOUND_SCOPE_OPTIONS,
} from '@/constants/compoundQuestionData';
import type {
  CompoundQuestionnaireDraft,
  CompoundRelation,
  QuestionAnswers,
  QuestionnaireState,
  QuestionnaireStep,
} from '@/types';

const COMMON_IDS = ['immediateDanger', 'visibleSymptoms', 'ageGroup'];
const DETAIL_MAX_SELECTIONS: Record<string, number> = {
  bleedingPattern: 4,
  woundRisk: 5,
  burnCause: 5,
  burnSkinState: 4,
  injuryState: 5,
  distalCondition: 3,
  allergyRisk: 5,
  rashAppearance: 4,
  feverSymptoms: 4,
  speakOrCough: 1,
};

export const getSelectedCategories = (symptoms: readonly string[]) =>
  symptoms.flatMap(code => {
    const category = FIRST_AID_CATEGORIES.find(
      item => SERVER_SYMPTOM_ID_BY_CATEGORY[item.id] === code,
    );
    return category ? [category] : [];
  });

export const isSupportedCompoundSelection = (
  symptoms: readonly string[],
): boolean =>
  symptoms.length === 2 && getSelectedCategories(symptoms).length === 2;

const createDraft = (
  symptoms: readonly string[],
): CompoundQuestionnaireDraft => ({
  injuries: isSupportedCompoundSelection(symptoms)
    ? getSelectedCategories(symptoms).map((category, index) => ({
        injuryId: `injury-${index}`,
        categoryCode: SERVER_SYMPTOM_ID_BY_CATEGORY[category.id],
        location: { scope: null, description: '' },
        answers: {},
      }))
    : [],
  relation: null,
});

export const isCompoundRelationValid = (
  draft: CompoundQuestionnaireDraft,
  relation = draft.relation,
): boolean => {
  if (draft.injuries.length !== 2 || !relation) {
    return false;
  }
  if (relation === 'UNKNOWN') {
    return true;
  }
  if (relation === 'SAME' || relation === 'DIFFERENT') {
    return draft.injuries.every(
      injury => injury.location.scope === 'LOCALIZED',
    );
  }
  return (
    draft.injuries.some(injury => injury.location.scope === 'SYSTEMIC') &&
    draft.injuries.every(
      injury => injury.location.scope && injury.location.scope !== 'UNKNOWN',
    )
  );
};

export const pruneCompoundDraft = (
  draft: CompoundQuestionnaireDraft,
): CompoundQuestionnaireDraft => {
  return pruneQaFacts({
    ...draft,
    relation: isCompoundRelationValid(draft) ? draft.relation : null,
  });
};

export const getQuestionnaireSteps = (
  categoryId: EmergencyCategoryId,
  answers: QuestionAnswers,
  draft: CompoundQuestionnaireDraft,
): readonly QuestionnaireStep[] => {
  const base = getEmergencyQuestions(categoryId);
  if (!isSupportedCompoundSelection(answers.visibleSymptoms ?? [])) {
    return base;
  }
  const steps: QuestionnaireStep[] = base.filter(question =>
    ['immediateDanger', 'visibleSymptoms'].includes(question.id),
  );
  const categories = getSelectedCategories(answers.visibleSymptoms);
  for (const [index, injury] of draft.injuries.entries()) {
    const sectionLabel = `손상 ${index + 1} · ${categories[index].label}`;
    steps.push({
      id: `${injury.injuryId}:scope`,
      kind: 'scope',
      injuryId: injury.injuryId,
      title: '손상 범위',
      prompt: '이 손상은 특정 부위에 있나요, 전신에 나타나나요?',
      isMultiple: false,
      options: COMPOUND_SCOPE_OPTIONS,
      sectionLabel,
    });
  }
  steps.push({
    id: 'compoundRelation',
    kind: 'relation',
    title: '두 손상 부위의 관계',
    prompt: '두 손상 부위는 어떤 관계인가요?',
    isMultiple: false,
    options: COMPOUND_RELATION_OPTIONS.filter(option =>
      isCompoundRelationValid(draft, option.id),
    ),
    sectionLabel: '복합 손상',
  });
  for (const [index, injury] of draft.injuries.entries()) {
    const sectionLabel = `손상 ${index + 1} · ${categories[index].label}`;
    steps.push({
      id: `${injury.injuryId}:injury`,
      kind: 'injury',
      injuryId: injury.injuryId,
      title: '손상별 상태·자료 확인',
      prompt: '이 손상의 상태와 추가 확인 내용을 입력해 주세요.',
      isMultiple: false,
      options: [],
      sectionLabel,
    });
  }
  return [...steps, ...base.filter(question => question.id === 'ageGroup')];
};

export const getInjuryDetailSteps = (
  draft: CompoundQuestionnaireDraft,
  injuryId: string,
): readonly QuestionnaireStep[] => {
  const injury = draft.injuries.find(item => item.injuryId === injuryId);
  const category = injury && getSelectedCategories([injury.categoryCode])[0];
  if (!category) {
    return [];
  }
  return getEmergencyQuestions(category.id)
    .filter(q => !COMMON_IDS.includes(q.id))
    .map(question => ({
      ...question,
      id: `${injuryId}:${question.id}`,
      kind: 'detail' as const,
      injuryId,
      answerQuestionId: question.id,
      maxSelections: DETAIL_MAX_SELECTIONS[question.id],
    }));
};

export const getQuestionnaireStepAnswers = (
  step: QuestionnaireStep,
  state: QuestionnaireState,
): readonly string[] => {
  if (!step.kind) {
    return state.questionAnswers[step.id] ?? [];
  }
  if (step.kind === 'relation') {
    return state.compoundDraft.relation ? [state.compoundDraft.relation] : [];
  }
  const injury = state.compoundDraft.injuries.find(
    item => item.injuryId === step.injuryId,
  );
  if (!injury) {
    return [];
  }
  switch (step.kind) {
    case 'injury':
      return [];
    case 'detail':
      return injury.answers[step.answerQuestionId] ?? [];
    case 'scope':
      return injury.location.scope ? [injury.location.scope] : [];
    case 'description':
      return injury.location.description.trim()
        ? [injury.location.description]
        : [];
  }
};

export const canContinueQuestionnaireStep = (
  step: QuestionnaireStep,
  state: QuestionnaireState,
): boolean => {
  if (
    step.id === 'immediateDanger' &&
    state.questionAnswers.immediateDangerUnknown?.[0] === 'UNKNOWN' &&
    !state.questionAnswers.immediateDanger?.length
  ) {
    return true;
  }
  if (step.kind === 'injury') {
    if (
      state.compoundDraft.injuries.find(item => item.injuryId === step.injuryId)
        ?.isEvidenceBusy
    ) {
      return false;
    }
    return getInjuryDetailSteps(state.compoundDraft, step.injuryId).every(
      detail => canContinueQuestionnaireStep(detail, state),
    );
  }
  if (step.kind === 'scope') {
    const injury = state.compoundDraft.injuries.find(
      item => item.injuryId === step.injuryId,
    );
    return (
      !!injury?.location.scope &&
      (injury.location.scope !== 'LOCALIZED' ||
        !!injury.location.description.trim())
    );
  }
  if (
    step.id === 'ageGroup' &&
    state.compoundDraft.injuries.length === 2 &&
    !state.questionAnswers.consciousness?.length &&
    !state.questionAnswers.immediateDanger?.includes('UNCONSCIOUS') &&
    !state.compoundDraft.injuries.some(i =>
      i.answers.speakOrCough?.includes('UNCONSCIOUS'),
    )
  ) {
    return false;
  }
  if (
    step.id === 'visibleSymptoms' &&
    state.compoundDraft.injuries.length === 2
  ) {
    return (
      isSupportedCompoundSelection(
        state.questionAnswers.visibleSymptoms ?? [],
      ) &&
      state.compoundDraft.injuries.every(
        i => i.isConfirmed !== false && i.hasSelectedCategory !== false,
      )
    );
  }
  const selected = getQuestionnaireStepAnswers(step, state);
  if (!selected.length) {
    return false;
  }
  if (step.kind === 'description') {
    return true;
  }
  if (selected.some(id => !step.options.some(option => option.id === id))) {
    return false;
  }
  if (
    new Set(selected).size !== selected.length ||
    (selected.length > 1 &&
      selected.some(id => step.exclusiveAnswerIds?.includes(id))) ||
    step.mutuallyExclusiveGroups?.some(
      group => selected.filter(id => group.includes(id)).length > 1,
    )
  ) {
    return false;
  }
  if (step.maxSelections && selected.length > step.maxSelections) {
    return false;
  }
  if (step.kind === 'detail' && step.answerQuestionId === 'feverSymptoms') {
    return (
      selected.filter(id =>
        [
          'TEMP_UNDER_38',
          'TEMP_38_TO_38_9',
          'TEMP_39_OR_HIGHER',
          'TEMP_UNKNOWN',
        ].includes(id),
      ).length === 1
    );
  }
  return true;
};

export const updateQuestionnaireAnswer = (
  state: QuestionnaireState,
  step: QuestionnaireStep,
  answerId: string,
): QuestionnaireState => {
  if (!step.options.some(option => option.id === answerId)) {
    return state;
  }
  if (!step.kind) {
    const questionAnswers: QuestionAnswers = {
      ...state.questionAnswers,
      ...(step.id === 'immediateDanger' ? { immediateDangerUnknown: [] } : {}),
      [step.id]: getNextEmergencyAnswerIds(
        step,
        state.questionAnswers[step.id] ?? [],
        answerId,
      ),
    };
    // 유형 변경 전 손상에 귀속된 답변을 새 복합 손상에 재사용하지 않습니다.
    return {
      questionAnswers,
      compoundDraft:
        step.id === 'visibleSymptoms'
          ? createDraft(questionAnswers.visibleSymptoms)
          : state.compoundDraft,
    };
  }
  if (step.kind === 'relation') {
    return {
      ...state,
      compoundDraft: pruneCompoundDraft({
        ...state.compoundDraft,
        relation: answerId as CompoundRelation,
      }),
    };
  }
  const injuries = state.compoundDraft.injuries.map(injury => {
    if (injury.injuryId !== step.injuryId) {
      return injury;
    }
    switch (step.kind) {
      case 'detail': {
        const toggledValues = getNextEmergencyAnswerIds(
          step,
          injury.answers[step.answerQuestionId] ?? [],
          answerId,
        );
        const values =
          step.answerQuestionId === 'feverSymptoms'
            ? (answerId.startsWith('TEMP_')
                ? [
                    ...(injury.answers.feverSymptoms ?? []).filter(
                      id => !id.startsWith('TEMP_'),
                    ),
                    answerId,
                  ]
                : [...toggledValues]
              ).sort(
                (a, b) =>
                  step.options.findIndex(o => o.id === a) -
                  step.options.findIndex(o => o.id === b),
              )
            : toggledValues;
        return step.maxSelections && values.length > step.maxSelections
          ? injury
          : {
              ...injury,
              answers: { ...injury.answers, [step.answerQuestionId]: values },
            };
      }
      case 'scope':
        return injury.location.scope === answerId
          ? injury
          : {
              ...injury,
              location: {
                scope: answerId as NonNullable<typeof injury.location.scope>,
                description: '',
              },
            };
      default:
        return injury;
    }
  });
  return {
    ...state,
    compoundDraft: pruneCompoundDraft({ ...state.compoundDraft, injuries }),
  };
};

export const updateQuestionnaireDescription = (
  state: QuestionnaireState,
  step: QuestionnaireStep,
  description: string,
): QuestionnaireState => {
  if (step.kind !== 'description' && step.kind !== 'scope') {
    return state;
  }
  return {
    ...state,
    compoundDraft: {
      ...state.compoundDraft,
      injuries: state.compoundDraft.injuries.map(injury =>
        injury.injuryId === step.injuryId
          ? { ...injury, location: { ...injury.location, description } }
          : injury,
      ),
    },
  };
};

export const getCompoundQuestionnaireError = (
  answers: QuestionAnswers,
  draft: CompoundQuestionnaireDraft,
): string | null => {
  const categories = getSelectedCategories(answers.visibleSymptoms ?? []);
  if (
    !isSupportedCompoundSelection(answers.visibleSymptoms ?? []) ||
    draft.injuries.length !== 2 ||
    draft.injuries.some(
      i => i.isConfirmed === false || i.hasSelectedCategory === false,
    ) ||
    new Set(draft.injuries.map(injury => injury.injuryId)).size !== 2 ||
    draft.injuries.some(
      (injury, index) =>
        injury.categoryCode !==
        SERVER_SYMPTOM_ID_BY_CATEGORY[categories[index].id],
    )
  ) {
    return '선택한 두 손상의 문진을 다시 확인해 주세요.';
  }
  const state = { questionAnswers: answers, compoundDraft: draft };
  const missing = getQuestionnaireSteps(categories[0].id, answers, draft).find(
    step => !canContinueQuestionnaireStep(step, state),
  );
  if (missing) {
    return `${missing.sectionLabel ?? '공통'} · ${missing.prompt}`;
  }
  return isCompoundRelationValid(draft)
    ? null
    : '두 손상 범위에 맞는 관계를 확인해 주세요.';
};

export const setCompoundInjuryCategory = (
  state: QuestionnaireState,
  index: number,
  code: import('@/types').CompoundCategoryCode,
): QuestionnaireState => {
  if (!getSelectedCategories([code]).length) {
    return state;
  }
  const symptoms = [...(state.questionAnswers.visibleSymptoms ?? [])];
  if (symptoms.length !== 2 || !state.compoundDraft.injuries[index]) {
    return state;
  }
  if (
    symptoms[index] === code &&
    state.compoundDraft.injuries[index].hasSelectedCategory !== false
  ) {
    return state;
  }
  symptoms[index] = code;
  const injuries = state.compoundDraft.injuries.map((injury, i) => {
    if (i === index) {
      return {
        ...injury,
        categoryCode: code,
        hasSelectedCategory: true,
        answers: {},
        qaFacts: {},
        fractureSkinAnswer: null,
        observationText: '',
        images: [],
        audio: null,
        isEvidenceBusy: false,
        isConfirmed: false,
      };
    }
    const qaFacts = { ...injury.qaFacts };
    delete qaFacts.SURFACES_OVERLAP;
    delete qaFacts.HELPER_AVAILABLE;
    delete qaFacts.INDEPENDENT_CARE_POSSIBLE;
    return { ...injury, qaFacts };
  });
  return {
    questionAnswers: { ...state.questionAnswers, visibleSymptoms: symptoms },
    compoundDraft: pruneCompoundDraft({
      ...state.compoundDraft,
      injuries,
    }),
  };
};
export const setCompoundInjuryCount = (
  state: QuestionnaireState,
  count: 1 | 2,
  initialCategory?: import('@/types').CompoundCategoryCode,
): QuestionnaireState => {
  const first =
    state.questionAnswers.visibleSymptoms?.[0] ??
    (count === 2 ? initialCategory : undefined);
  if (!first || !getSelectedCategories([first]).length) {
    return state;
  }
  if ((count === 2) === (state.compoundDraft.injuries.length === 2)) {
    return state;
  }
  const symptoms = count === 2 ? [first, first] : [first];
  return {
    questionAnswers: { ...state.questionAnswers, visibleSymptoms: symptoms },
    compoundDraft:
      count === 2
        ? {
            ...createDraft(symptoms),
            injuries: createDraft(symptoms).injuries.map(i => ({
              ...i,
              isConfirmed: false,
            })),
          }
        : { injuries: [], relation: null },
  };
};
