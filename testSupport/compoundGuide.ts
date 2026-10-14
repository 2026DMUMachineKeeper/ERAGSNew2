import responses from '../__tests__/fixtures/compoundGuideResponses.json';
import type { CompoundGuideSnapshot, EmergencyGuideResponse } from '@/types';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';

// QA 전달 자료의 합성 응답을 사용하며 운영 정책이나 실제 처치 내용으로 사용하지 않습니다.
export const COMPOUND_CREATION =
  responses.complete as unknown as EmergencyGuideResponse;
export const INITIAL_COMPOUND_SNAPSHOT = parseCompoundGuideSnapshot({
  ...responses.complete,
  planId: responses.complete.compound.planId,
});
export const HELD_COMPOUND_SNAPSHOT = parseCompoundGuideSnapshot({
  ...responses.held,
  planId: responses.held.compound.planId,
});

export const completedSnapshot = (count: number): CompoundGuideSnapshot => {
  const initial = INITIAL_COMPOUND_SNAPSHOT;
  const steps = initial.compound.execution;
  return {
    ...initial,
    progress: {
      revision: count,
      status: count === steps.length ? 'COMPLETED' : 'IN_PROGRESS',
      completedStepIds: steps.slice(0, count).map(step => step.executionStepId),
      currentStepId: steps[count]?.executionStepId ?? null,
      blockedReason: null,
      injuries: initial.compound.injuries.map((injury, index) => ({
        injuryId: injury.injuryId,
        status:
          index < count
            ? 'COMPLETED'
            : index === count
            ? 'IN_PROGRESS'
            : 'WAITING',
        deferredReason: null,
      })),
    },
    usedSupplies: steps.slice(0, count).flatMap(step => step.consumptionUnits),
  };
};

export const blockedSnapshot = (): CompoundGuideSnapshot => {
  const saved = completedSnapshot(1);
  return {
    ...saved,
    progress: {
      ...saved.progress!,
      revision: 2,
      status: 'BLOCKED',
      blockedReason: 'INSUFFICIENT_STOCK',
      injuries: saved.progress!.injuries.map(injury =>
        injury.status === 'IN_PROGRESS'
          ? { ...injury, status: 'BLOCKED' }
          : injury,
      ),
    },
  };
};

export const PARTIAL_COMPOUND_SNAPSHOT: CompoundGuideSnapshot = {
  ...INITIAL_COMPOUND_SNAPSHOT,
  compound: {
    ...INITIAL_COMPOUND_SNAPSHOT.compound,
    status: 'PARTIAL',
    injuries: INITIAL_COMPOUND_SNAPSHOT.compound.injuries.map((injury, index) =>
      index === 1
        ? {
            ...injury,
            disposition: 'DEFERRED',
            deferredReason: 'TEST_DEFERRED',
            guide: null,
          }
        : injury,
    ),
    execution: INITIAL_COMPOUND_SNAPSHOT.compound.execution.slice(0, 1),
    allocations: [{ itemId: 2, quantity: 1 }],
  },
  progress: {
    ...INITIAL_COMPOUND_SNAPSHOT.progress!,
    injuries: INITIAL_COMPOUND_SNAPSHOT.progress!.injuries.map(
      (injury, index) =>
        index === 1
          ? { ...injury, status: 'DEFERRED', deferredReason: 'TEST_DEFERRED' }
          : injury,
    ),
  },
};

export const PARTIAL_FINISHED_SNAPSHOT: CompoundGuideSnapshot = {
  ...PARTIAL_COMPOUND_SNAPSHOT,
  progress: {
    ...PARTIAL_COMPOUND_SNAPSHOT.progress!,
    revision: 1,
    status: 'BLOCKED',
    currentStepId: null,
    blockedReason: 'DEFERRED_INJURIES_REMAIN',
    completedStepIds: PARTIAL_COMPOUND_SNAPSHOT.compound.execution.map(
      step => step.executionStepId,
    ),
    injuries: PARTIAL_COMPOUND_SNAPSHOT.progress!.injuries.map(
      (injury, index) =>
        index === 0 ? { ...injury, status: 'COMPLETED' } : injury,
    ),
  },
  usedSupplies: PARTIAL_COMPOUND_SNAPSHOT.compound.execution.flatMap(
    step => step.consumptionUnits,
  ),
};
