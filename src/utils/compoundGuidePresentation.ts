import type { CompoundExecutionStep, CompoundGuidePlan } from '@/types';

export const getCompoundStepPresentation = (
  plan: CompoundGuidePlan,
  execution: CompoundExecutionStep,
) => {
  // 실행 순서와 지시는 서버 계획을 따르고, 원본 단계에서는 표시 자료만 가져옵니다.
  const sources = execution.sources.flatMap(source => {
    const injuryIndex = plan.injuries.findIndex(
      injury =>
        injury.injuryId === source.injuryId &&
        injury.categoryCode === source.categoryCode,
    );
    const injury = plan.injuries[injuryIndex];
    const step = injury?.guide?.steps.find(
      item => item.stepId === source.stepId,
    );
    if (!injury || !step) {
      return [];
    }
    return [
      {
        key: `${source.injuryId}:${source.stepId}`,
        label: [
          `손상 ${injuryIndex + 1}`,
          injury.display?.category ?? injury.categoryCode,
          injury.location.description,
        ]
          .filter(Boolean)
          .join(' · '),
        step,
      },
    ];
  });
  return {
    sources,
    checkpoints: [
      ...new Set(
        sources.map(source => source.step.checkpointQuestion).filter(Boolean),
      ),
    ],
    supplies: execution.consumptionUnits.map(unit => ({
      ...unit,
      name:
        sources.find(source => source.step.requiredItemId === unit.itemId)?.step
          .requiredItemName ??
        plan.injuries
          .flatMap(injury => injury.guide?.steps ?? [])
          .find(step => step.requiredItemId === unit.itemId)
          ?.requiredItemName ??
        `물품 ${unit.itemId}`,
    })),
  };
};
