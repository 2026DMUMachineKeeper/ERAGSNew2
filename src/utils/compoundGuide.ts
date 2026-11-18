import { ApiRequestError } from '@/services/apiError.service';
import type { CompoundGuideSnapshot } from '@/types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isNonempty);
const isNullableString = (value: unknown): boolean =>
  value === null || isNonempty(value);
const isAmount = (value: unknown): boolean =>
  isRecord(value) &&
  Number.isSafeInteger(value.itemId) &&
  (value.itemId as number) > 0 &&
  Number.isSafeInteger(value.quantity) &&
  (value.quantity as number) > 0;
const isUnit = (value: unknown): boolean =>
  isRecord(value) && isNonempty(value.unitId) && isAmount(value);
const isCodeLabel = (value: unknown): boolean =>
  isRecord(value) && isNonempty(value.code) && typeof value.label === 'string';
const isDisplay = (value: unknown): boolean =>
  value == null ||
  (isRecord(value) &&
    (value.blockedReason === undefined || isCodeLabel(value.blockedReason)) &&
    ['status', 'category', 'subtype', 'severity', 'disposition'].every(
      key => value[key] === undefined || typeof value[key] === 'string',
    ) &&
    ['blockedReasons', 'missingInputs', 'redFlags'].every(
      key =>
        value[key] === undefined ||
        (Array.isArray(value[key]) &&
          value[key].every(
            label =>
              isRecord(label) &&
              isNonempty(label.code) &&
              typeof label.label === 'string',
          )),
    ));

const hasValidSnapshot = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== '2' ||
    !isNonempty(value.sessionId) ||
    !isNullableString(value.planId) ||
    !isRecord(value.compound) ||
    !Array.isArray(value.usedSupplies) ||
    !value.usedSupplies.every(isUnit)
  ) {
    return false;
  }
  const plan = value.compound;
  if (
    plan.schemaVersion !== '2' ||
    plan.sessionId !== value.sessionId ||
    plan.planId !== value.planId ||
    !isNonempty(plan.requestId) ||
    plan.authority !== 'BACKEND' ||
    plan.inventoryConsumptionOwner !== 'BACKEND' ||
    !isNullableString(plan.inventorySnapshotId) ||
    !isStrings(plan.blockedReasons) ||
    !isStrings(plan.redFlags) ||
    typeof plan.call119Required !== 'boolean' ||
    !isDisplay(plan.display) ||
    !Array.isArray(plan.injuries) ||
    plan.injuries.length !== 2 ||
    !Array.isArray(plan.execution) ||
    !Array.isArray(plan.excludedSteps) ||
    !Array.isArray(plan.allocations) ||
    !plan.allocations.every(isAmount) ||
    !isRecord(plan.patientContext) ||
    !isStrings(plan.patientContext.redFlags) ||
    typeof plan.patientContext.call119Required !== 'boolean' ||
    !['CONSCIOUS', 'UNCONSCIOUS', 'UNKNOWN'].includes(
      String(plan.patientContext.consciousness),
    ) ||
    !['CHILD', 'ADULT', 'ELDERLY', 'UNKNOWN'].includes(
      String(plan.patientContext.ageGroup),
    )
  ) {
    return false;
  }
  for (const injury of plan.injuries) {
    if (
      !isRecord(injury) ||
      !isNonempty(injury.injuryId) ||
      ![
        'BLEEDING',
        'BURN',
        'FRACTURE_BRUISE',
        'FEVER_NEUROLOGIC',
        'ALLERGY_RASH',
        'AIRWAY_OBSTRUCTION',
      ].includes(String(injury.categoryCode)) ||
      !['ACTIVE', 'DEFERRED', 'HELD'].includes(String(injury.disposition)) ||
      !isNullableString(injury.deferredReason) ||
      !isDisplay(injury.display) ||
      !isRecord(injury.location) ||
      !isNullableString(injury.location.description) ||
      !['LOCALIZED', 'SYSTEMIC', 'UNKNOWN'].includes(
        String(injury.location.scope),
      ) ||
      (injury.location.scope === 'LOCALIZED' &&
        !isNonempty(injury.location.description)) ||
      !isRecord(injury.assessment) ||
      !isNullableString(injury.assessment.subtypeCode) ||
      !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'].includes(
        String(injury.assessment.severityCode),
      ) ||
      typeof injury.assessment.call119Required !== 'boolean' ||
      !isStrings(injury.assessment.missingInputs) ||
      !isStrings(injury.assessment.redFlags) ||
      !isStrings(injury.assessment.reasons) ||
      !isDisplay(injury.assessment.display)
    ) {
      return false;
    }
    if (
      injury.guide !== null &&
      (!isRecord(injury.guide) ||
        typeof injury.guide.call119Required !== 'boolean' ||
        !isStrings(injury.guide.redFlags) ||
        !Array.isArray(injury.guide.steps) ||
        !injury.guide.steps.every(
          step =>
            isRecord(step) &&
            Number.isSafeInteger(step.stepId) &&
            (step.stepId as number) > 0 &&
            isNonempty(step.instruction) &&
            (step.requiredItemName == null ||
              isNonempty(step.requiredItemName)),
        ))
    ) {
      return false;
    }
  }
  const snapshot = value as unknown as CompoundGuideSnapshot;
  const { compound, progress, usedSupplies } = snapshot;
  const ids = compound.injuries.map(injury => injury.injuryId);
  if (
    new Set(ids).size !== 2 ||
    !Array.isArray(plan.relations) ||
    plan.relations.length !== 1
  ) {
    return false;
  }
  const relation = plan.relations[0];
  if (
    !isRecord(relation) ||
    !isStrings(relation.injuryIds) ||
    relation.injuryIds.length !== 2 ||
    new Set(relation.injuryIds).size !== 2 ||
    relation.injuryIds.some(id => !ids.includes(id)) ||
    !['SAME', 'DIFFERENT', 'NOT_APPLICABLE', 'UNKNOWN'].includes(
      String(relation.relation),
    ) ||
    typeof relation.confirmed !== 'boolean' ||
    (relation.relation !== 'UNKNOWN' && !relation.confirmed) ||
    (['SAME', 'DIFFERENT'].includes(String(relation.relation)) &&
      compound.injuries.some(
        injury => injury.location.scope !== 'LOCALIZED',
      )) ||
    (relation.relation === 'NOT_APPLICABLE' &&
      (!compound.injuries.some(
        injury => injury.location.scope === 'SYSTEMIC',
      ) ||
        compound.injuries.some(injury => injury.location.scope === 'UNKNOWN')))
  ) {
    return false;
  }
  const flags = [
    ...compound.patientContext.redFlags,
    ...compound.injuries.flatMap(injury => [
      ...injury.assessment.redFlags,
      ...(injury.guide?.redFlags ?? []),
    ]),
  ];
  if (compound.patientContext.consciousness === 'UNCONSCIOUS') {
    flags.push('ALTERED_CONSCIOUSNESS');
  }
  const shouldCall119 =
    compound.patientContext.call119Required ||
    compound.patientContext.consciousness === 'UNCONSCIOUS' ||
    compound.injuries.some(
      injury =>
        injury.assessment.call119Required ||
        injury.assessment.severityCode === 'CRITICAL' ||
        injury.guide?.call119Required,
    );
  if (
    flags.some(flag => !compound.redFlags.includes(flag)) ||
    (shouldCall119 && !compound.call119Required)
  ) {
    return false;
  }
  if (
    compound.status === 'ASSESSMENT_ONLY' ||
    compound.status === 'GUIDE_PENDING'
  ) {
    return (
      compound.planId === null &&
      compound.policy === null &&
      compound.execution.length === 0 &&
      compound.allocations.length === 0 &&
      compound.blockedReasons.length > 0 &&
      compound.injuries.every(injury => injury.disposition === 'HELD') &&
      progress === null &&
      usedSupplies.length === 0
    );
  }
  if (
    !['COMPLETE', 'PARTIAL'].includes(compound.status) ||
    !isNonempty(compound.planId) ||
    !isNonempty(compound.inventorySnapshotId) ||
    relation.relation === 'UNKNOWN' ||
    !isRecord(compound.policy) ||
    !['policyId', 'version', 'dbVersion', 'variantId'].every(key =>
      isNonempty(plan.policy && (plan.policy as Record<string, unknown>)[key]),
    ) ||
    !compound.execution.length ||
    (compound.status === 'PARTIAL') !==
      compound.injuries.some(injury => injury.disposition === 'DEFERRED') ||
    compound.injuries.some(
      injury =>
        injury.disposition === 'HELD' ||
        (injury.disposition === 'ACTIVE' &&
          (!injury.guide ||
            !injury.assessment.subtypeCode ||
            injury.assessment.severityCode === 'UNKNOWN')),
    )
  ) {
    return false;
  }
  for (const step of plan.execution) {
    if (
      !isRecord(step) ||
      !isNonempty(step.executionStepId) ||
      !isNonempty(step.instruction) ||
      !Array.isArray(step.sources) ||
      !step.sources.length ||
      !Array.isArray(step.consumptionUnits) ||
      !step.consumptionUnits.every(isUnit) ||
      !step.sources.every(
        source =>
          isRecord(source) &&
          compound.injuries.some(
            injury =>
              injury.injuryId === source.injuryId &&
              injury.categoryCode === source.categoryCode &&
              injury.disposition === 'ACTIVE' &&
              injury.guide?.steps.some(
                original => original.stepId === source.stepId,
              ),
          ),
      )
    ) {
      return false;
    }
  }
  const stepIds = compound.execution.map(step => step.executionStepId);
  const units = compound.execution.flatMap(step => step.consumptionUnits);
  const sources = compound.execution.flatMap(step => step.sources);
  const sourceKey = (source: { injuryId: string; stepId: number }): string =>
    JSON.stringify([source.injuryId, source.stepId]);
  const covered = sources.map(sourceKey);
  if (
    compound.excludedSteps.some(
      source =>
        !isRecord(source) ||
        !isNonempty(source.reason) ||
        !compound.injuries.some(
          injury =>
            injury.injuryId === source.injuryId &&
            injury.disposition === 'ACTIVE' &&
            injury.guide?.steps.some(step => step.stepId === source.stepId),
        ),
    )
  ) {
    return false;
  }
  covered.push(...compound.excludedSteps.map(sourceKey));
  const totals = new Map<number, number>();
  units.forEach(unit =>
    totals.set(unit.itemId, (totals.get(unit.itemId) ?? 0) + unit.quantity),
  );
  if (
    new Set(covered).size !== covered.length ||
    compound.injuries.some(
      injury =>
        injury.disposition === 'ACTIVE' &&
        injury.guide?.steps.some(
          step =>
            !covered.includes(
              sourceKey({ injuryId: injury.injuryId, stepId: step.stepId }),
            ),
        ),
    ) ||
    totals.size !== compound.allocations.length ||
    new Set(compound.allocations.map(item => item.itemId)).size !==
      totals.size ||
    compound.allocations.some(item => totals.get(item.itemId) !== item.quantity)
  ) {
    return false;
  }
  if (
    new Set(stepIds).size !== stepIds.length ||
    new Set(units.map(unit => unit.unitId)).size !== units.length ||
    !isRecord(progress) ||
    !Number.isSafeInteger(progress.revision) ||
    progress.revision < 0 ||
    !isStrings(progress.completedStepIds) ||
    progress.completedStepIds.length > stepIds.length ||
    progress.revision < progress.completedStepIds.length ||
    !isNullableString(progress.blockedReason) ||
    !isDisplay(progress.display) ||
    !Array.isArray(progress.injuries) ||
    progress.injuries.length !== 2 ||
    new Set(progress.injuries.map(injury => injury.injuryId)).size !== 2 ||
    progress.completedStepIds.some((id, index) => id !== stepIds[index])
  ) {
    return false;
  }
  const next = compound.execution[progress.completedStepIds.length];
  const hasDeferredInjuries = compound.injuries.some(
    injury => injury.disposition === 'DEFERRED',
  );
  const expectedStatus = next
    ? progress.blockedReason
      ? 'BLOCKED'
      : 'IN_PROGRESS'
    : hasDeferredInjuries
    ? 'BLOCKED'
    : 'COMPLETED';
  if (
    progress.currentStepId !== (next?.executionStepId ?? null) ||
    progress.status !== expectedStatus ||
    (!next &&
      progress.blockedReason !==
        (hasDeferredInjuries ? 'DEFERRED_INJURIES_REMAIN' : null)) ||
    (next &&
      progress.blockedReason &&
      progress.revision <= progress.completedStepIds.length)
  ) {
    return false;
  }
  const completed = new Set(progress.completedStepIds);
  for (const injury of compound.injuries) {
    const actions = compound.execution.filter(step =>
      step.sources.some(source => source.injuryId === injury.injuryId),
    );
    const isCurrent = next?.sources.some(
      source => source.injuryId === injury.injuryId,
    );
    const expected =
      injury.disposition === 'DEFERRED'
        ? 'DEFERRED'
        : actions.length > 0 &&
          actions.every(step => completed.has(step.executionStepId))
        ? 'COMPLETED'
        : isCurrent && progress.blockedReason
        ? 'BLOCKED'
        : isCurrent || actions.some(step => completed.has(step.executionStepId))
        ? 'IN_PROGRESS'
        : 'WAITING';
    if (
      !progress.injuries.some(
        saved =>
          saved.injuryId === injury.injuryId &&
          saved.status === expected &&
          saved.deferredReason === injury.deferredReason &&
          isDisplay(saved.display),
      )
    ) {
      return false;
    }
  }
  const used = compound.execution
    .slice(0, completed.size)
    .flatMap(step => step.consumptionUnits);
  return (
    used.length === usedSupplies.length &&
    new Set(usedSupplies.map(unit => unit.unitId)).size === used.length &&
    used.every(unit =>
      usedSupplies.some(
        saved =>
          saved.unitId === unit.unitId &&
          saved.itemId === unit.itemId &&
          saved.quantity === unit.quantity,
      ),
    )
  );
};

export const parseCompoundGuideSnapshot = (
  value: unknown,
): CompoundGuideSnapshot => {
  let isValid = false;
  try {
    isValid = hasValidSnapshot(value);
  } catch {
    // 서버 응답의 누락·타입 오류가 화면에서 임의의 처치 단계로 이어지지 않도록 차단합니다.
  }
  if (!isValid) {
    throw new ApiRequestError(
      {
        code: 'INVALID_RESPONSE',
        message:
          '복합 가이드의 손상·실행 단계·진행 정보를 확인하지 못했습니다.',
        details: [],
      },
      200,
    );
  }
  return value as CompoundGuideSnapshot;
};
