import request1 from './feHandoff/example-1-request.json';
import request2 from './feHandoff/example-2-request.json';
import request3 from './feHandoff/example-3-request.json';
import response1 from './feHandoff/example-1-response.json';
import response2 from './feHandoff/example-2-response.json';
import response3 from './feHandoff/example-3-response.json';
import { qa19State } from './qa19';
import { fractureSkinFollowup } from '@/constants/compoundQaData';
import type { CompoundGuideRequest, QuestionnaireState } from '@/types';

export const FE_HANDOFF_CASES = [
  { request: request1, response: response1, count: 4 },
  { request: request2, response: response2, count: 4 },
  { request: request3, response: response3, count: 5 },
].map(sample => ({
  ...sample,
  request: sample.request as unknown as CompoundGuideRequest,
}));

export const feHandoffState = (
  request: CompoundGuideRequest,
): QuestionnaireState => {
  const state = qa19State(request);
  return {
    ...state,
    compoundDraft: {
      ...state.compoundDraft,
      injuries: state.compoundDraft.injuries.map((injury, index) => ({
        ...injury,
        fractureSkinAnswer:
          fractureSkinFollowup.options.find(option =>
            request.injuries[index].observations.includes(option.observation),
          )?.value ?? null,
      })),
    },
  };
};
