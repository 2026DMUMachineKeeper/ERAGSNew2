import type {
  CompoundGuideSnapshot,
  EmergencyGuideHandoverSnapshot,
} from '@/types';

export const isCompoundTreatmentCompleted = (
  snapshot: CompoundGuideSnapshot | null | undefined,
): boolean =>
  !!snapshot &&
  snapshot.compound.status === 'COMPLETE' &&
  snapshot.progress?.status === 'COMPLETED' &&
  snapshot.progress.currentStepId === null &&
  snapshot.compound.execution.length > 0 &&
  snapshot.compound.execution.every(step =>
    snapshot.progress?.completedStepIds.includes(step.executionStepId),
  ) &&
  snapshot.compound.injuries.every(injury => injury.disposition === 'ACTIVE');

export const getCompoundHandoverSupplyNames = (
  snapshot: CompoundGuideSnapshot,
): Map<number, string> => {
  const names = new Map<number, string>();
  snapshot.compound.injuries.forEach(injury => {
    injury.guide?.steps.forEach(step => {
      if (step.requiredItemId !== null && step.requiredItemName?.trim()) {
        names.set(step.requiredItemId, step.requiredItemName.trim());
      }
    });
  });
  return names;
};

export const getCompoundHandoverSummary = (
  snapshot: CompoundGuideSnapshot,
  names: ReadonlyMap<number, string> = getCompoundHandoverSupplyNames(snapshot),
) => {
  const completedTreatments = snapshot.compound.execution
    .filter(step =>
      snapshot.progress?.completedStepIds.includes(step.executionStepId),
    )
    .map((step, index) => ({
      stepId: step.executionStepId,
      stepNo: index + 1,
      instruction: step.instruction,
    }));
  const quantities = new Map<string, number>();
  // allocations는 계획 수량이므로 인계에는 서버가 기록한 실제 사용량만 합산합니다.
  snapshot.usedSupplies.forEach(unit => {
    const name = names.get(unit.itemId) ?? `물품 #${unit.itemId}`;
    quantities.set(name, (quantities.get(name) ?? 0) + unit.quantity);
  });
  return {
    completedTreatments,
    usedSupplies: Array.from(quantities, ([name, quantity]) => ({
      name,
      quantity,
    })),
  };
};

export const hasMatchingCompoundHandover = (
  snapshot: CompoundGuideSnapshot,
  handover: EmergencyGuideHandoverSnapshot,
  names?: ReadonlyMap<number, string>,
): boolean => {
  const summary = getCompoundHandoverSummary(snapshot, names);
  // 서버의 숫자 ID는 전체 실행 배열의 표시 순번이며 원본 단계 ID와 다릅니다.
  const completedSteps = snapshot.compound.execution
    .map((step, index) => ({ step, ordinal: index + 1 }))
    .filter(({ step }) =>
      snapshot.progress?.completedStepIds.includes(step.executionStepId),
    );
  const hasMatchingTreatments =
    completedSteps.length === handover.completedTreatments.length &&
    completedSteps.every(({ step, ordinal }, index) => {
      const actual = handover.completedTreatments[index];
      const sources = step.sources
        .map(source => {
          const injuryIndex = snapshot.compound.injuries.findIndex(
            injury => injury.injuryId === source.injuryId,
          );
          return `손상 ${injuryIndex + 1} · 원본 단계 ${source.stepId}`;
        })
        .join(', ');
      // 출처를 임의로 잘라내면 다른 손상의 동일 문장도 통과하므로 예상 출처까지 비교합니다.
      return (
        actual.stepId === ordinal && actual.stepNo === ordinal &&
        (actual.instruction === step.instruction ||
          actual.instruction === `[${sources}] ${step.instruction}`)
      );
    });
  const supplies = (items: readonly { name: string; quantity: number }[]) => {
    const totals = new Map<string, number>();
    items.forEach(item => {
      const name = item.name.trim();
      totals.set(name, (totals.get(name) ?? 0) + item.quantity);
    });
    return Array.from(totals).sort(([a], [b]) => a.localeCompare(b));
  };
  return (
    handover.status ===
      (isCompoundTreatmentCompleted(snapshot) ? 'COMPLETED' : 'IN_PROGRESS') &&
    hasMatchingTreatments &&
    JSON.stringify(supplies(summary.usedSupplies)) ===
      JSON.stringify(supplies(handover.usedSupplies))
  );
};
