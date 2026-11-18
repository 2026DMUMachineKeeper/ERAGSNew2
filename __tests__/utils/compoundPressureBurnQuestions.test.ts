import request from '../../testSupport/compoundPressureBurnRequest.json';
import { qa19State } from '../../testSupport/qa19';
import documentQuestions from '../../testSupport/feHandoff/qa-questions.json';
import { QA_FACT_IDS, QA_FACT_QUESTIONS } from '@/constants/compoundQaData';
import type { CompoundGuideRequest, QaFactId } from '@/types';
import {
  getMissingCompoundQuestions,
  pruneQaFacts,
  relevantQaFacts,
} from '@/utils/compoundQuestionFacts';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';

// 첨부 백엔드 verified-example.json의 입력으로 실제 계약에서 누락된 사실을 검증합니다.
const sample = request as unknown as CompoundGuideRequest;
const pressureIds: QaFactId[] = [
  'BLEEDING_CONTROLLED_WITH_PRESSURE',
  'BLEEDING_DRESSING_ALREADY_APPLIED',
  'BLEEDING_BANDAGE_AVAILABLE',
  'CONTINUOUS_PRESSURE_HELPER_READY',
];
const burnIds: QaFactId[] = [
  'BURN_NONADHERENT_GAUZE_CONFIRMED',
  'BURN_BLISTERS_INTACT',
  'SAFE_IMMEDIATE_TRANSPORT_AVAILABLE',
];

it('추가 질문의 ID와 표시 항목은 중복되지 않는다', () => {
  expect(new Set(QA_FACT_IDS).size).toBe(QA_FACT_IDS.length);
  expect(new Set(QA_FACT_QUESTIONS.map(q => q.id)).size).toBe(
    QA_FACT_QUESTIONS.length,
  );
});

it.each([false, true])(
  '손상 순서 반전 %s: 화상은 문서에 있는 추가 질문만 표시·전송한다',
  isReversed => {
    const input: CompoundGuideRequest = {
      ...sample,
      injuries: isReversed
        ? [sample.injuries[1], sample.injuries[0]]
        : sample.injuries,
    };
    const state = qa19State(input);
    const actual = toCompoundGuideRequest(
      state.questionAnswers,
      'pressure-burn-test',
      state.compoundDraft,
    );
    for (const injury of input.injuries) {
      expect(
        actual.injuries.find(item => item.injuryId === injury.injuryId)
          ?.observations,
      ).toEqual(
        expect.arrayContaining(
          injury.observations.filter(
            value => !burnIds.some(id => value.startsWith(`QA_FACT_V1:${id}=`)),
          ),
        ),
      );
    }
    for (const injury of state.compoundDraft.injuries) {
      const ids = relevantQaFacts(state.compoundDraft, injury).map(q => q.id);
      expect(ids).toContain('SYMPTOMS_WORSENING');
      if (injury.categoryCode === 'BLEEDING') {
        expect(ids).toEqual(expect.arrayContaining(pressureIds));
      } else {
        expect(ids).toHaveLength(isReversed ? 17 : 16);
        expect(ids.every(id => documentQuestions.some(q => q.id === id))).toBe(
          true,
        );
        expect(ids).toContain('BURN_SKIN_INTACT');
        expect(ids).toContain('BURN_PROTECTIVE_CLOTH_SUITABLE');
        burnIds.forEach(id => expect(ids).not.toContain(id));
      }
    }
  },
);

it('추가 질문의 미응답·모름·아니요를 추정 없이 구분한다', () => {
  const state = qa19State(sample);
  const [bleeding, burn] = state.compoundDraft.injuries;
  delete bleeding.qaFacts?.BLEEDING_CONTROLLED_WITH_PRESSURE;
  bleeding.qaFacts = {
    ...bleeding.qaFacts,
    CONTINUOUS_PRESSURE_HELPER_READY: 'NO',
  };
  burn.qaFacts = { ...burn.qaFacts, BURN_SKIN_INTACT: 'UNKNOWN' };
  const missing = getMissingCompoundQuestions(state.compoundDraft);
  expect(
    missing.find(i => i.injuryId === bleeding.injuryId)?.prompts,
  ).toContain(
    QA_FACT_QUESTIONS.find(q => q.id === 'BLEEDING_CONTROLLED_WITH_PRESSURE')
      ?.prompt,
  );
  expect(
    missing.find(i => i.injuryId === burn.injuryId)?.prompts,
  ).not.toContain(
    QA_FACT_QUESTIONS.find(q => q.id === 'BURN_SKIN_INTACT')?.prompt,
  );
  const actual = toCompoundGuideRequest(
    state.questionAnswers,
    'unanswered',
    state.compoundDraft,
  );
  expect(actual.injuries[0].observations).not.toContainEqual(
    expect.stringContaining('BLEEDING_CONTROLLED_WITH_PRESSURE='),
  );
  expect(actual.injuries[0].observations).toContain(
    'QA_FACT_V1:CONTINUOUS_PRESSURE_HELPER_READY=NO',
  );
  expect(actual.injuries[1].observations).toContain(
    'QA_FACT_V1:BURN_SKIN_INTACT=UNKNOWN',
  );
});

it.each(['skin', 'relation', 'scope', 'category'] as const)(
  '%s 변경으로 조합이 사라지면 전용 답변을 지우고 재사용하지 않는다',
  change => {
    const state = qa19State(sample);
    const original = state.compoundDraft;
    const changed = qa19State(sample).compoundDraft;
    if (change === 'skin')
      changed.injuries[1].answers.burnSkinState = ['RED_PAINFUL'];
    if (change === 'relation') changed.relation = 'SAME';
    if (change === 'scope') changed.injuries[1].location.scope = 'SYSTEMIC';
    if (change === 'category')
      changed.injuries[1].categoryCode = 'ALLERGY_RASH';
    const pruned = pruneQaFacts(changed);
    for (const injury of pruned.injuries) {
      for (const id of [...pressureIds, ...burnIds]) {
        expect(injury.qaFacts?.[id]).toBeUndefined();
      }
    }
    const restored = pruneQaFacts({
      ...original,
      injuries: original.injuries.map((injury, index) => ({
        ...injury,
        qaFacts: pruned.injuries[index].qaFacts,
      })),
    });
    expect(
      restored.injuries[0].qaFacts?.BLEEDING_CONTROLLED_WITH_PRESSURE,
    ).toBeUndefined();
    if (change === 'skin') {
      expect(
        relevantQaFacts(changed, changed.injuries[1]).map(q => q.id),
      ).toEqual(
        expect.arrayContaining([
          'BURN_SKIN_INTACT',
          'BURN_PROTECTIVE_CLOTH_SUITABLE',
        ]),
      );
    }
  },
);

it('나중에 물집을 선택하면 앞선 출혈의 추가 질문도 누락 목록에 표시한다', () => {
  const state = qa19State(sample);
  state.compoundDraft.injuries.forEach(injury => {
    injury.qaFacts = {};
  });
  state.compoundDraft.injuries[1].answers.burnSkinState = [];
  expect(
    relevantQaFacts(state.compoundDraft, state.compoundDraft.injuries[0]).map(
      q => q.id,
    ),
  ).not.toContain('BLEEDING_CONTROLLED_WITH_PRESSURE');
  state.compoundDraft.injuries[1].answers.burnSkinState = ['BLISTER'];
  const draft = pruneQaFacts(state.compoundDraft);
  expect(draft.injuries[0].qaFacts).toEqual({});
  expect(getMissingCompoundQuestions(draft)[0].prompts).toContain(
    QA_FACT_QUESTIONS.find(q => q.id === 'BLEEDING_CONTROLLED_WITH_PRESSURE')
      ?.prompt,
  );
});

it('위험한 출혈 답변도 그대로 전송하고 조합 적합성을 앱에서 추정하지 않는다', () => {
  const state = qa19State(sample);
  state.compoundDraft.injuries[0].answers.bleedingPattern = [
    'BLEEDING_SPURTING',
  ];
  const actual = toCompoundGuideRequest(
    state.questionAnswers,
    'danger-answer',
    state.compoundDraft,
  );
  expect(actual.injuries[0].questionnaire).toContainEqual({
    questionId: 'B1_BLEEDING_PATTERN',
    answerIds: ['BLEEDING_SPURTING'],
  });
  expect(actual.injuries[0].observations).toContain(
    'QA_FACT_V1:BLEEDING_CONTROLLED_WITH_PRESSURE=YES',
  );
});
