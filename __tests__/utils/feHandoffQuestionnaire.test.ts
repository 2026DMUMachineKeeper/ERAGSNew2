import questions from '../../testSupport/feHandoff/qa-questions.json';
import { FE_HANDOFF_CASES, feHandoffState } from '../../testSupport/feHandoff';
import { QA_FACT_QUESTIONS } from '@/constants/compoundQaData';
import { getEmergencyQuestions } from '@/constants';
import { relevantQaFacts, pruneQaFacts } from '@/utils/compoundQuestionFacts';
import {
  canContinueQuestionnaireStep,
  updateQuestionnaireAnswer,
  setCompoundInjuryCategory,
} from '@/utils/compoundQuestionnaire';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';

it('전달 자료 67문항의 ID·문구·순서를 그대로 사용한다', () => {
  expect(QA_FACT_QUESTIONS.filter(question => questions.some(q => q.id === question.id))).toEqual(
    questions.map(({ id, prompt }) => ({ id, prompt })),
  );
});

it('위험 판단 어려움은 진행할 수 있지만 Q1 NONE이나 UNKNOWN으로 전송하지 않는다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[0].request);
  state.questionAnswers.immediateDanger = [];
  const danger = getEmergencyQuestions('bleeding')[0];
  expect(canContinueQuestionnaireStep(danger, state)).toBe(false);
  state.questionAnswers.immediateDangerUnknown = ['UNKNOWN'];
  expect(canContinueQuestionnaireStep(danger, state)).toBe(true);
  const request = toCompoundGuideRequest(
    state.questionAnswers,
    'unknown',
    state.compoundDraft,
  );
  expect(
    request.injuries.every(
      injury =>
        !injury.questionnaire.some(q => q.questionId === 'Q1_IMMEDIATE_DANGER'),
    ),
  ).toBe(true);
  expect(request.patientContext.consciousness).toBe('CONSCIOUS');
  const changed = updateQuestionnaireAnswer(state, danger, 'MASSIVE_BLEEDING');
  expect(changed.questionAnswers.immediateDangerUnknown).toEqual([]);
  expect(changed.questionAnswers.immediateDanger).toEqual(['MASSIVE_BLEEDING']);
});

it('C 질문 노출은 COMPLETE 예시의 경증 답변이나 기존 QA 응답에 제한하지 않는다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[1].request);
  const burn = state.compoundDraft.injuries.find(
    injury => injury.categoryCode === 'BURN',
  )!;
  const bleeding = state.compoundDraft.injuries.find(
    injury => injury.categoryCode === 'BLEEDING',
  )!;
  burn.answers = { burnCause: ['BURN_CHEMICAL'], burnSkinState: ['BLISTER'] };
  bleeding.answers = {
    bleedingPattern: ['BLEEDING_SPURTING'],
    woundRisk: ['WOUND_DEEP'],
  };
  burn.qaFacts = {};
  bleeding.qaFacts = {};
  const before = relevantQaFacts(state.compoundDraft, burn).map(q => q.id);
  expect(before).toEqual(
    expect.arrayContaining([
      'BURN_MEDICINES_AVAILABLE',
      'BURN_CAN_REMAIN_CLEAN',
      'THERMAL_CAUSE',
      'GUIDE_ACTIONS_ALREADY_PERFORMED',
    ]),
  );
  expect(
    relevantQaFacts(state.compoundDraft, bleeding).map(q => q.id),
  ).toContain('WOUND_CARE_STARTED');
  burn.qaFacts.BURN_COOLING_COMPLETED = 'YES';
  burn.qaFacts.BURN_MEDICINES_AVAILABLE = 'NO';
  expect(relevantQaFacts(state.compoundDraft, burn).map(q => q.id)).toEqual(
    before,
  );
  const draft = pruneQaFacts({ ...state.compoundDraft, relation: 'SAME' });
  const changedBurn = draft.injuries.find(
    injury => injury.categoryCode === 'BURN',
  )!;
  expect(changedBurn.qaFacts?.BURN_MEDICINES_AVAILABLE).toBeUndefined();
  expect(changedBurn.qaFacts?.BURN_COOLING_COMPLETED).toBe('YES');
});

it('폐쇄 손상 의심 조건이 사라지면 C 답변을 제거한다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[2].request);
  state.compoundDraft.injuries[0].answers.injuryState = ['OPEN_FRACTURE'];
  const draft = pruneQaFacts(state.compoundDraft);
  expect(draft.injuries[0].qaFacts?.FIXATION_TOOLS_AVAILABLE).toBeUndefined();
  expect(draft.injuries[1].qaFacts?.WOUND_CARE_STARTED).toBeUndefined();
});

it('자유 관찰을 해당 손상에만 전송하고 유형 변경 시 자료를 초기화한다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[0].request);
  const injury = state.compoundDraft.injuries[0];
  injury.observationText = '  직접 확인한 관찰 문장  ';
  injury.images = [
    { uri: 'file:///test.jpg', name: 'test.jpg', type: 'image/jpeg' },
  ];
  const request = toCompoundGuideRequest(
    state.questionAnswers,
    'observations',
    state.compoundDraft,
  );
  expect(request.injuries[0].observations).toContain('직접 확인한 관찰 문장');
  expect(request.injuries[1].observations).not.toContain(
    '직접 확인한 관찰 문장',
  );
  const changed = setCompoundInjuryCategory(state, 0, 'FEVER_NEUROLOGIC');
  expect(changed.compoundDraft.injuries[0]).toMatchObject({
    observationText: '',
    images: [],
    audio: null,
  });
});

it('사진 합계 5장·음성 1개 제한을 넘는 요청을 전송 전에 막는다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[0].request);
  const photo = {
    uri: 'file:///test.jpg',
    name: 'test.jpg',
    type: 'image/jpeg',
  };
  state.compoundDraft.injuries[0].images = Array.from(
    { length: 5 },
    () => photo,
  );
  state.compoundDraft.injuries[1].images = [photo];
  expect(() =>
    toCompoundGuideRequest(
      state.questionAnswers,
      'too-many',
      state.compoundDraft,
    ),
  ).toThrow('5장');
  state.compoundDraft.injuries[1].images = [];
  for (const injury of state.compoundDraft.injuries) {
    injury.audio = {
      uri: 'file:///test.m4a',
      name: 'test.m4a',
      type: 'audio/mp4',
    };
  }
  expect(() =>
    toCompoundGuideRequest(
      state.questionAnswers,
      'two-audios',
      state.compoundDraft,
    ),
  ).toThrow('1개');
});

it('같은 팔의 출혈·골절은 같은 부위와 겹침을 함께 전달하고 독립 처치 사실을 섞지 않는다', () => {
  const state = feHandoffState(FE_HANDOFF_CASES[2].request);
  state.compoundDraft = {
    relation: 'SAME',
    injuries: state.compoundDraft.injuries.map((injury, index) => ({
      ...injury,
      location: { scope: 'LOCALIZED', description: '왼쪽 팔' },
      qaFacts:
        index === 0
          ? { SURFACES_OVERLAP: 'YES', HELPER_AVAILABLE: 'UNKNOWN' }
          : {},
    })),
  };
  const request = toCompoundGuideRequest(
    state.questionAnswers,
    'same-arm-bleeding-fracture',
    state.compoundDraft,
  );
  expect(request.injuries.map(injury => injury.categoryCode)).toEqual([
    'FRACTURE_BRUISE',
    'BLEEDING',
  ]);
  expect(request.relations[0]).toMatchObject({
    relation: 'SAME',
    confirmed: true,
  });
  for (const injury of request.injuries) {
    expect(injury.location.description).toBe('왼쪽 팔');
    expect(injury.observations).toEqual(
      expect.arrayContaining([
        'QA_FACT_V1:SURFACES_OVERLAP=YES',
        'QA_FACT_V1:HELPER_AVAILABLE=UNKNOWN',
      ]),
    );
    expect(
      injury.observations.some(value =>
        value.includes('INDEPENDENT_CARE_POSSIBLE'),
      ),
    ).toBe(false);
    expect(
      injury.observations.some(value =>
        value.includes('GUIDE_ACTIONS_ALREADY_PERFORMED'),
      ),
    ).toBe(false);
  }
  expect(
    request.injuries[0].questionnaire.some(
      q => q.questionId === 'F1_INJURY_STATE',
    ),
  ).toBe(true);
  expect(
    request.injuries[1].questionnaire.some(
      q => q.questionId === 'B1_BLEEDING_PATTERN',
    ),
  ).toBe(true);
});
