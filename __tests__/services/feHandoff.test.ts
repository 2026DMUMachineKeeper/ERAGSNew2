import { FE_HANDOFF_CASES, feHandoffState } from '../../testSupport/feHandoff';
import { createCompoundGuide } from '@/services/emergencyGuide.service';
import { readCompoundGuideSession } from '@/services/compoundGuide.service';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import { relevantQaFacts } from '@/utils/compoundQuestionFacts';
import { isCompoundTreatmentCompleted } from '@/utils/compoundHandover';
import type { CompoundGuideRequest } from '@/types';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async () => 'token'),
  isAuthTokenExpiredError: jest.fn(() => false),
  refreshAuthTokens: jest.fn(),
}));
const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const response = (body: unknown): Response =>
  ({
    status: 200,
    ok: true,
    json: async () => body,
  } as Response);
const normalize = (request: CompoundGuideRequest) => ({
  ...request,
  injuries: request.injuries.map(injury => ({
    ...injury,
    observations: [...injury.observations].sort(),
  })),
});
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it.each(FE_HANDOFF_CASES)(
  '전달 자료 $request.requestId: 실제 입력·COMPLETE $count단계·GET 복원을 보존한다',
  async sample => {
    const state = feHandoffState(sample.request);
    const request = toCompoundGuideRequest(
      state.questionAnswers,
      sample.request.requestId,
      state.compoundDraft,
    );
    expect(normalize(request)).toEqual(normalize(sample.request));
    for (const injury of state.compoundDraft.injuries) {
      const ids = relevantQaFacts(state.compoundDraft, injury).map(
        question => question.id,
      );
      expect(
        Object.keys(injury.qaFacts ?? {}).every(id =>
          ids.includes(id as (typeof ids)[number]),
        ),
      ).toBe(true);
    }
    fetchMock.mockResolvedValueOnce(response(sample.response));
    const created = await createCompoundGuide(request);
    expect(created.status).toBe('COMPLETE');
    expect(created.treatment.steps).toEqual([]);
    const snapshot = parseCompoundGuideSnapshot({
      ...created,
      planId: created.compound?.planId,
    });
    expect(snapshot.compound.execution).toHaveLength(sample.count);
    expect(snapshot.progress?.status).toBe('IN_PROGRESS');
    expect(snapshot.usedSupplies).toEqual([]);
    expect(isCompoundTreatmentCompleted(snapshot)).toBe(false);
    fetchMock.mockResolvedValueOnce(
      response({ success: true, data: snapshot }),
    );
    expect(await readCompoundGuideSession(snapshot.sessionId)).toEqual(
      snapshot,
    );
  },
);

it('사진 삭제 후 최종 업로드 순서로 손상을 바인딩하고 음성 대상을 보존한다', async () => {
  const sample = FE_HANDOFF_CASES[0];
  const state = feHandoffState(sample.request);
  const [first, second] = state.compoundDraft.injuries;
  const photo1 = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };
  const photo2 = { uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' };
  const audio = { uri: 'file:///a.m4a', name: 'a.m4a', type: 'audio/mp4' };
  first.images = [photo1];
  second.images = [photo2];
  second.audio = audio;
  const before = toCompoundGuideRequest(
    state.questionAnswers,
    sample.request.requestId,
    state.compoundDraft,
  );
  expect(before.evidenceBindings?.images).toEqual([
    { imageIndex: 0, injuryId: first.injuryId },
    { imageIndex: 1, injuryId: second.injuryId },
  ]);
  first.images = [];
  const request = toCompoundGuideRequest(
    state.questionAnswers,
    sample.request.requestId,
    state.compoundDraft,
  );
  expect(request.evidenceBindings).toEqual({
    images: [{ imageIndex: 0, injuryId: second.injuryId }],
    audio: second.injuryId,
  });
  fetchMock.mockResolvedValueOnce(response(sample.response));
  const append = jest.spyOn(FormData.prototype, 'append');
  await createCompoundGuide(request, undefined, { images: [photo2], audio });
  const entries = append.mock.calls;
  expect(entries.map(([key]) => key)).toEqual(['request', 'images', 'audio']);
  expect(JSON.parse(entries[0][1] as string)).toEqual(request);
  expect(entries[1][1]).toEqual(photo2);
  expect(entries[2][1]).toEqual(audio);
  await expect(createCompoundGuide(request)).rejects.toThrow('대상 손상');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
