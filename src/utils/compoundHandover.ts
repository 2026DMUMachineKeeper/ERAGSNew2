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

export const getCompoundHandoverSummary = (snapshot: CompoundGuideSnapshot) => {
  const completedTreatments = snapshot.compound.execution
    .filter(step =>
      snapshot.progress?.completedStepIds.includes(step.executionStepId),
    )
    .map((step, index) => ({
      stepId: step.executionStepId,
      stepNo: index + 1,
      instruction: step.instruction,
    }));
  const names = new Map<number, string>();
  snapshot.compound.injuries.forEach(injury => {
    injury.guide?.steps.forEach(step => {
      if (step.requiredItemId !== null && step.requiredItemName?.trim()) {
        names.set(step.requiredItemId, step.requiredItemName.trim());
      }
    });
  });
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
): boolean => {
  const summary = getCompoundHandoverSummary(snapshot);
  // 같은 종류의 손상도 별개 기록이므로 단일 stepId로 중복 제거하지 않습니다.
  const expectedInstructions = summary.completedTreatments.map(
    step => step.instruction,
  );
  const actualInstructions = handover.completedTreatments.map(
    step => step.instruction,
  );
  const supplies = (items: readonly { name: string; quantity: number }[]) => {
    const totals = new Map<string, number>();
    items.forEach(item =>
      totals.set(item.name, (totals.get(item.name) ?? 0) + item.quantity),
    );
    return Array.from(totals).sort(([a], [b]) => a.localeCompare(b));
  };
  return (
    handover.status === 'COMPLETED' &&
    JSON.stringify(expectedInstructions) ===
      JSON.stringify(actualInstructions) &&
    JSON.stringify(supplies(summary.usedSupplies)) ===
      JSON.stringify(supplies(handover.usedSupplies))
  );
};
