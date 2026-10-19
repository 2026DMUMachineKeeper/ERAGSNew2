import requests from '../../testSupport/compoundCRequests.json';
import { QA19_CASES, qa19State } from '../../testSupport/qa19';
import type {
  CompoundGuideRequest,
  CompoundQuestionnaireInjury,
} from '@/types';
import {
  getMissingCompoundQuestions,
  pruneQaFacts,
  relevantQaFacts,
} from '@/utils/compoundQuestionFacts';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';
import { setCompoundInjuryCategory } from '@/utils/compoundQuestionnaire';

const samples = Object.entries(requests).map(([name, request]) => ({
  name,
  request: request as unknown as CompoundGuideRequest,
}));
const stateFor = (request: CompoundGuideRequest) => {
  const state = qa19State(request);
  state.compoundDraft = {
    ...state.compoundDraft,
    injuries: state.compoundDraft.injuries.map(injury => ({
      ...injury,
      fractureSkinAnswer:
        injury.categoryCode === 'FRACTURE_BRUISE' ? 'INTACT' : null,
    })),
  };
  return state;
};

it.each(samples)(
  '$name: 첨부 C 사례의 손상별 사실을 누락 없이 전송한다',
  ({ request }) => {
    const state = stateFor(request);
    const actual = toCompoundGuideRequest(
      state.questionAnswers,
      'c-questions-check',
      state.compoundDraft,
    );
    for (const injury of request.injuries) {
      expect(
        actual.injuries.find(item => item.injuryId === injury.injuryId)
          ?.observations,
      ).toEqual(expect.arrayContaining(injury.observations));
    }
  },
);

it.each(samples)(
  '$name: 질문은 손상별로 다르고 보조자만 공유한다',
  ({ name, request }) => {
    const state = stateFor(request);
    const ids = state.compoundDraft.injuries.map(injury =>
      relevantQaFacts(state.compoundDraft, injury).map(q => q.id),
    );
    expect(ids[0]).toContain(
      name === 'burn' ? 'BURN_COOLING_STARTED' : 'FIXATION_TOOLS_AVAILABLE',
    );
    expect(ids[0]).not.toContain('WOUND_CARE_STARTED');
    expect(ids[1]).toContain('WOUND_CARE_STARTED');
    expect(ids[1]).not.toContain('BURN_COOLING_STARTED');
    expect(ids[1]).not.toContain('FIXATION_TOOLS_AVAILABLE');
    expect(ids[0]).toContain('HELPER_AVAILABLE');
    expect(ids[1]).not.toContain('HELPER_AVAILABLE');
  },
);

it('미선택은 누락으로 표시하고 UNKNOWN과 반대 답변은 원래 값으로 전송한다', () => {
  const state = stateFor(samples[0].request);
  const injury = state.compoundDraft.injuries[0];
  delete injury.qaFacts?.FLOWING_COOL_WATER_READY;
  injury.qaFacts = {
    ...injury.qaFacts,
    BURN_MEDICINES_AVAILABLE: 'UNKNOWN',
    BURN_COOLING_STARTED: 'YES',
  };
  const missing = getMissingCompoundQuestions(state.compoundDraft);
  expect(
    missing.find(item => item.injuryId === injury.injuryId)?.prompts,
  ).toContainEqual(expect.stringContaining('시원한 흐르는 물'));
  expect(missing.flatMap(item => item.prompts)).not.toContainEqual(
    expect.stringContaining('화상연고를 포함해'),
  );
  const actual = toCompoundGuideRequest(
    state.questionAnswers,
    'unknown-check',
    state.compoundDraft,
  ).injuries[0].observations;
  expect(actual).toContain('QA_FACT_V1:BURN_MEDICINES_AVAILABLE=UNKNOWN');
  expect(actual).toContain('QA_FACT_V1:BURN_COOLING_STARTED=YES');
  expect(actual.some(value => value.includes('FLOWING_COOL_WATER_READY'))).toBe(
    false,
  );
});

it('관계·유형 변경으로 적용되지 않는 C 답변을 지우고 화상 피부 상태만으로 C 질문을 숨기지 않는다', () => {
  const state = stateFor(samples[0].request);
  const same = pruneQaFacts({ ...state.compoundDraft, relation: 'SAME' });
  expect(same.injuries[0].qaFacts?.BURN_MEDICINES_AVAILABLE).toBeUndefined();
  const blister = pruneQaFacts({
    ...state.compoundDraft,
    injuries: state.compoundDraft.injuries.map((injury, index) =>
      index
        ? injury
        : {
            ...injury,
            answers: { ...injury.answers, burnSkinState: ['BLISTER'] },
          },
    ),
  });
  expect(blister.injuries[0].qaFacts?.BURN_COOLING_STARTED).toBe('NO');
  const changed = setCompoundInjuryCategory(state, 0, 'ALLERGY_RASH');
  expect(changed.compoundDraft.injuries[0].qaFacts).toEqual({});
  expect(
    changed.compoundDraft.injuries[1].qaFacts?.WOUND_CARE_STARTED,
  ).toBeUndefined();
});

it('다른 손상의 상세 답변을 기다리지 않고 현재 손상의 C 질문을 표시한다', () => {
  const state = stateFor(samples[0].request);
  const incomplete = {
    ...state.compoundDraft,
    injuries: state.compoundDraft.injuries.map((injury, index) =>
      index ? { ...injury, answers: {} } : injury,
    ),
  };
  const pruned = pruneQaFacts(incomplete);
  expect(pruned.injuries[0].qaFacts?.BURN_MEDICINES_AVAILABLE).toBe('NO');
  expect(
    relevantQaFacts(incomplete, incomplete.injuries[0]).map(
      question => question.id,
    ),
  ).toContain('BURN_MEDICINES_AVAILABLE');
  delete pruned.injuries[0].qaFacts?.BURN_MEDICINES_AVAILABLE;
  const restored = {
    ...pruned,
    injuries: pruned.injuries.map((injury, index) =>
      index ? state.compoundDraft.injuries[1] : injury,
    ),
  };
  expect(
    getMissingCompoundQuestions(restored).find(item => item.injuryIndex === 0)
      ?.prompts,
  ).toContainEqual(expect.stringContaining('화상연고를 포함해'));
});

it.each(samples)(
  '$name: COMPLETE 예시의 C 확인 항목과 조건에 맞는 일반 질문을 함께 표시한다',
  ({ request }) => {
    const state = stateFor(request);
    const first = state.compoundDraft.injuries[0];
    const expected = request.injuries[0].observations.flatMap(value => {
      const match = /^QA_FACT_V1:([A-Z_]+)=/.exec(value);
      return match ? [match[1]] : [];
    });
    const questions = relevantQaFacts(state.compoundDraft, first);
    expect(questions.map(question => question.id)).toEqual(
      expect.arrayContaining(expected),
    );
    expect(questions.map(question => question.id)).toContain(
      first.categoryCode === 'BURN'
        ? 'BURN_CAN_REMAIN_CLEAN'
        : 'SEVERE_SWELLING',
    );
    if (first.categoryCode === 'FRACTURE_BRUISE')
      expect(questions[0].id).toBe('SPLINT_AVAILABLE');
  },
);

it('C 자료에 없는 질문이라도 이미 확인한 관찰은 표시와 전송에서 지우지 않는다', () => {
  const state = stateFor(samples[1].request);
  const first = state.compoundDraft.injuries[0];
  first.qaFacts = {
    ...first.qaFacts,
    SEVERE_SWELLING: 'YES',
    SAFE_IMMEDIATE_TRANSPORT_AVAILABLE: 'UNKNOWN',
  };
  const draft = pruneQaFacts(state.compoundDraft);
  expect(
    relevantQaFacts(draft, draft.injuries[0]).map(question => question.id),
  ).toContain('SEVERE_SWELLING');
  const actual = toCompoundGuideRequest(
    state.questionAnswers,
    'preserve-observations',
    draft,
  );
  expect(actual.injuries[0].observations).toContain(
    'QA_FACT_V1:SEVERE_SWELLING=YES',
  );
  expect(actual.injuries[0].observations).toContain(
    'QA_FACT_V1:SAFE_IMMEDIATE_TRANSPORT_AVAILABLE=UNKNOWN',
  );
});

it('부목 응답과 관계없이 조건에 맞는 골절 자원 질문을 표시한다', () => {
  const state = stateFor(samples[1].request);
  const first = state.compoundDraft.injuries[0];
  first.qaFacts = { ...first.qaFacts, SPLINT_AVAILABLE: 'NO' };
  expect(
    relevantQaFacts(state.compoundDraft, first).map(question => question.id),
  ).toContain('SPLINT_TRAINED_HELPER');
});

it('여섯 유형의 기본 추가 질문은 각 손상의 상태에 맞게 분기한다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const variants: Array<{
    categoryCode: CompoundQuestionnaireInjury['categoryCode'];
    answers: CompoundQuestionnaireInjury['answers'];
    expected: string;
    absent: string;
  }> = [
    {
      categoryCode: 'BLEEDING',
      answers: { bleedingPattern: ['BLEEDING_OOZING'], woundRisk: ['NONE'] },
      expected: 'PRESSURE_REQUIRED',
      absent: 'THERMAL_CAUSE',
    },
    {
      categoryCode: 'BURN',
      answers: {
        burnCause: ['BURN_SMALL_AREA'],
        burnSkinState: ['RED_PAINFUL'],
      },
      expected: 'THERMAL_CAUSE',
      absent: 'PRESSURE_REQUIRED',
    },
    {
      categoryCode: 'FRACTURE_BRUISE',
      answers: {
        injuryState: ['MINOR_BRUISE'],
        distalCondition: ['NORMAL_DISTAL'],
      },
      expected: 'BRUISE_SKIN_INTACT',
      absent: 'BURN_COOLING_STARTED',
    },
    {
      categoryCode: 'AIRWAY_OBSTRUCTION',
      answers: { speakOrCough: ['CAN_SPEAK_OR_COUGH'] },
      expected: 'EFFECTIVE_COUGH_PRESENT',
      absent: 'PRESSURE_REQUIRED',
    },
    {
      categoryCode: 'ALLERGY_RASH',
      answers: {
        allergyRisk: ['LOCAL_RASH'],
        rashAppearance: ['RASH_FLAT_SPOTS'],
      },
      expected: 'KNOWN_CONTACT_EXPOSURE',
      absent: 'THERMAL_CAUSE',
    },
    {
      categoryCode: 'FEVER_NEUROLOGIC',
      answers: { feverSymptoms: ['TEMP_38_TO_38_9'] },
      expected: 'CAN_SWALLOW',
      absent: 'BRUISE_SKIN_INTACT',
    },
  ];
  for (const variant of variants) {
    const injury = {
      ...state.compoundDraft.injuries[0],
      categoryCode: variant.categoryCode,
      answers: variant.answers,
    };
    const draft = {
      ...state.compoundDraft,
      injuries: [injury, state.compoundDraft.injuries[1]],
    };
    const ids = relevantQaFacts(draft, injury).map(q => q.id);
    expect(ids).toContain(variant.expected);
    expect(ids).not.toContain(variant.absent);
  }
});
