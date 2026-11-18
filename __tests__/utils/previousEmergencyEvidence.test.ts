import { QA19_CASES, qa19State } from '../../testSupport/qa19';
import {
  assignPreviousEvidence,
  getPreviousEmergencyEvidence,
  getPreviousEvidenceInjuryId,
} from '@/utils/previousEmergencyEvidence';
import { setCompoundInjuryCategory } from '@/utils/compoundQuestionnaire';

const media = {
  images: [
    { uri: 'file:///source.jpg', name: 'source.jpg', type: 'image/jpeg' },
  ],
  audio: { uri: 'file:///source.m4a', name: 'source.m4a', type: 'audio/mp4' },
  text: '처음 입력한 관찰',
};

it.each(getPreviousEmergencyEvidence(media))(
  '$kind: 손상 변경과 재선택으로 원본을 복제하지 않는다',
  evidence => {
    const state = qa19State(QA19_CASES[0].request);
    const [first, second] = state.compoundDraft.injuries;
    expect(
      getPreviousEvidenceInjuryId(state.compoundDraft, evidence),
    ).toBeUndefined();
    let draft = assignPreviousEvidence(
      state.compoundDraft,
      evidence,
      first.injuryId,
    );
    draft = assignPreviousEvidence(draft, evidence, first.injuryId);
    draft = assignPreviousEvidence(draft, evidence, second.injuryId);
    expect(getPreviousEvidenceInjuryId(draft, evidence)).toBe(second.injuryId);
    expect(draft.injuries[0].images ?? []).toHaveLength(0);
    expect(draft.injuries[0].audio ?? null).toBeNull();
    expect(draft.injuries[0].observationText ?? '').toBe('');
    if (evidence.kind === 'image')
      expect(draft.injuries[1].images).toEqual([media.images[0]]);
    if (evidence.kind === 'audio')
      expect(draft.injuries[1].audio).toEqual(media.audio);
    if (evidence.kind === 'text')
      expect(draft.injuries[1].observationText).toBe(media.text);
    expect(assignPreviousEvidence(draft, evidence, 'unknown-injury')).toBe(
      draft,
    );
  },
);

it('손상 유형을 바꾸어 기존 첨부가 지워져도 원본은 남아 다시 연결할 수 있다', () => {
  const state = qa19State(QA19_CASES[0].request);
  const evidence = getPreviousEmergencyEvidence(media)[0];
  const injuryId = state.compoundDraft.injuries[0].injuryId;
  const attached = {
    ...state,
    compoundDraft: assignPreviousEvidence(
      state.compoundDraft,
      evidence,
      injuryId,
    ),
  };
  const changed = setCompoundInjuryCategory(attached, 0, 'BURN');
  expect(
    getPreviousEvidenceInjuryId(changed.compoundDraft, evidence),
  ).toBeUndefined();
  expect(
    assignPreviousEvidence(changed.compoundDraft, evidence, injuryId)
      .injuries[0].images,
  ).toEqual(media.images);
});
