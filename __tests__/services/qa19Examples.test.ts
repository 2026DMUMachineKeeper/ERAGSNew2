import { QA19_CASES, qa19State } from '../../testSupport/qa19';
import { createCompoundGuide } from '@/services/emergencyGuide.service';
import { readCompoundGuideSession } from '@/services/compoundGuide.service';
import { toCompoundGuideRequest } from '@/utils/emergencyQuestionnaire';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import { getAuthToken } from '@/services/auth.service';

jest.mock('@/services/auth.service', () => ({
  getAuthToken: jest.fn(async () => 'token'),
  isAuthTokenExpiredError: jest.fn(() => false),
  refreshAuthTokens: jest.fn(),
}));
const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const response = (body: unknown): Response =>
  ({ status: 200, ok: true, json: async () => body } as Response);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getAuthToken).mockResolvedValue('token');
});
it.each(QA19_CASES)(
  'QA 원본 $request.requestId 입력·생성·복원 $count단계를 보존한다',
  async sample => {
    const state = qa19State(sample.request);
    const request = toCompoundGuideRequest(
      state.questionAnswers,
      sample.request.requestId,
      state.compoundDraft,
    );
    expect(request).toEqual(sample.request);
    fetchMock.mockResolvedValueOnce(response(sample.response));
    const created = await createCompoundGuide(request);
    expect(created.status).toBe(sample.response.data.status);
    expect(created.treatment.steps).toEqual([]);
    const snapshot = parseCompoundGuideSnapshot({
      ...created,
      planId: created.compound?.planId,
    });
    expect(snapshot.compound.execution).toHaveLength(sample.count);
    expect(snapshot.progress?.status).toBe('IN_PROGRESS');
    expect(snapshot.usedSupplies).toEqual([]);
    expect(snapshot.compound.inventoryConsumptionOwner).toBe('BACKEND');
    fetchMock.mockResolvedValueOnce(
      response({ success: true, data: snapshot }),
    );
    expect(await readCompoundGuideSession(snapshot.sessionId)).toEqual(
      snapshot,
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      `/api/v1/sessions/${snapshot.sessionId}`,
    );
    if (sample.count === 2) {
      expect(created.status).toBe('GUIDE_PENDING');
      expect(snapshot.compound.status).toBe('PARTIAL');
      expect(
        snapshot.compound.injuries.some(
          i => i.disposition === 'DEFERRED' && i.deferredReason,
        ),
      ).toBe(true);
    }
  },
);
