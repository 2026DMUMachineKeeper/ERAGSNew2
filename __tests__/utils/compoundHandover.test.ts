import {
  getCompoundHandoverSummary,
  hasMatchingCompoundHandover,
  isCompoundTreatmentCompleted,
} from '@/utils/compoundHandover';
import {
  completedSnapshot,
  INITIAL_COMPOUND_SNAPSHOT,
  PARTIAL_FINISHED_SNAPSHOT,
} from '../../testSupport/compoundGuide';
import type { CompoundGuideSnapshot, EmergencyGuideHandoverSnapshot } from '@/types';

const serverHandover = (snapshot: CompoundGuideSnapshot): EmergencyGuideHandoverSnapshot => ({
  version: 2,
  generatedAt: '2026-10-18T00:00:00Z',
  expiresAt: '2026-10-18T00:30:00Z',
  status: isCompoundTreatmentCompleted(snapshot) ? 'COMPLETED' : 'IN_PROGRESS',
  assessment: {
    categoryCode: 'BLEEDING', subtypeCode: 'BLEEDING_MILD', severityCode: 'LOW',
    consciousness: 'CONSCIOUS', ageGroup: 'ADULT', redFlags: [],
    call119Required: false, summary: '',
  },
  completedTreatments: snapshot.compound.execution.flatMap((step, index) =>
    snapshot.progress?.completedStepIds.includes(step.executionStepId) ? [{
      stepId: index + 1,
      stepNo: index + 1,
      instruction: `[${step.sources.map(source => `손상 ${snapshot.compound.injuries.findIndex(injury => injury.injuryId === source.injuryId) + 1} · 원본 단계 ${source.stepId}`).join(', ')}] ${step.instruction}`,
    }] : [],
  ),
  usedSupplies: getCompoundHandoverSummary(snapshot).usedSupplies,
});

it('가이드 생성 완료와 실제 전체 처치 완료, 보류된 처치를 구분한다', () => {
  expect(isCompoundTreatmentCompleted(INITIAL_COMPOUND_SNAPSHOT)).toBe(false);
  expect(isCompoundTreatmentCompleted(completedSnapshot(1))).toBe(false);
  expect(isCompoundTreatmentCompleted(completedSnapshot(2))).toBe(true);
  expect(isCompoundTreatmentCompleted(PARTIAL_FINISHED_SNAPSHOT)).toBe(false);
});

it.each([
  ['중간 중단', completedSnapshot(1)],
  ['전체 완료', completedSnapshot(2)],
  ['손상 보류', PARTIAL_FINISHED_SNAPSHOT],
] as const)('%s 인계는 서버의 정확한 출처 접두부와 처치 원문을 함께 확인한다', (_name, saved) => {
  expect(hasMatchingCompoundHandover(saved, serverHandover(saved))).toBe(true);
});

it.each(['source', 'instruction', 'ordinal', 'order', 'quantity', 'status', 'extra', 'missing'] as const)(
  '%s가 다른 인계는 출처 접두부를 지원해도 거절한다', kind => {
    const saved = completedSnapshot(2);
    const handover = serverHandover(saved);
    if (kind === 'source') handover.completedTreatments[0].instruction = handover.completedTreatments[0].instruction.replace('손상 1', '손상 2');
    if (kind === 'instruction') handover.completedTreatments[0].instruction += ' 다른 처치';
    if (kind === 'ordinal') handover.completedTreatments[0].stepId = 999;
    if (kind === 'order') handover.completedTreatments.reverse();
    if (kind === 'quantity') handover.usedSupplies[0].quantity += 1;
    if (kind === 'status') handover.status = 'IN_PROGRESS';
    if (kind === 'extra') handover.completedTreatments.push(handover.completedTreatments[0]);
    if (kind === 'missing') handover.completedTreatments.pop();
    expect(hasMatchingCompoundHandover(saved, handover)).toBe(false);
  },
);

it('공통 단계는 모든 손상 출처를 대조하고 같은 원문의 다른 손상으로 바꾸지 않는다', () => {
  const saved = completedSnapshot(2);
  const first = saved.compound.execution[0];
  const shared: CompoundGuideSnapshot = {
    ...saved,
    compound: {
      ...saved.compound,
      execution: [{ ...first, sources: [...first.sources, ...saved.compound.execution[1].sources] }],
    },
    progress: { ...saved.progress!, completedStepIds: [first.executionStepId] },
    usedSupplies: first.consumptionUnits,
  };
  const handover = serverHandover(shared);
  expect(hasMatchingCompoundHandover(shared, handover)).toBe(true);
  handover.completedTreatments[0].instruction = handover.completedTreatments[0].instruction.replace(/, 손상 2 · 원본 단계 \d+/, '');
  expect(hasMatchingCompoundHandover(shared, handover)).toBe(false);
});

it('이름이 없는 사용 물품은 ID로 확인한 이름을 대조하고 종류나 사용량 차이를 허용하지 않는다', () => {
  const saved = completedSnapshot(2);
  const itemId = saved.usedSupplies[0].itemId;
  const names = new Map([[itemId, '검증 거즈']]);
  const handover = serverHandover(saved);
  handover.usedSupplies = getCompoundHandoverSummary(saved, names).usedSupplies;
  expect(hasMatchingCompoundHandover(saved, handover)).toBe(false);
  expect(hasMatchingCompoundHandover(saved, handover, names)).toBe(true);
  handover.usedSupplies[0].name = '다른 물품';
  expect(hasMatchingCompoundHandover(saved, handover, names)).toBe(false);
});

it('인계 물품은 전체 allocations나 완료 단계의 예상 사용량이 아닌 실제 사용 기록만 집계한다', () => {
  const saved = completedSnapshot(2);
  const unit = saved.usedSupplies[0];
  const summary = getCompoundHandoverSummary({
    ...saved,
    usedSupplies: [
      { ...unit, quantity: 2 },
      { ...unit, unitId: 'second-unit', quantity: 3 },
    ],
    compound: {
      ...saved.compound,
      allocations: [{ itemId: unit.itemId, quantity: 100 }],
    },
  });
  expect(summary.usedSupplies).toHaveLength(1);
  expect(summary.usedSupplies[0].quantity).toBe(5);
});

it('같은 손상·동일 source 단계도 별개의 복합 실행 기록으로 유지하며 누락된 인계 응답을 거절한다', () => {
  const saved = completedSnapshot(2);
  const first = saved.compound.execution[0];
  const second = {
    ...first,
    executionStepId: saved.compound.execution[1].executionStepId,
  };
  const duplicate = {
    ...saved,
    compound: { ...saved.compound, execution: [first, second] },
  };
  const summary = getCompoundHandoverSummary(duplicate);
  expect(summary.completedTreatments).toHaveLength(2);
  expect(summary.completedTreatments[0].stepId).not.toBe(
    summary.completedTreatments[1].stepId,
  );
  const handover: EmergencyGuideHandoverSnapshot = {
    version: 2,
    generatedAt: '2026-10-18T00:00:00Z',
    expiresAt: '2026-10-18T00:30:00Z',
    status: 'COMPLETED',
    assessment: {
      categoryCode: 'BLEEDING',
      subtypeCode: 'BLEEDING_MILD',
      severityCode: 'LOW',
      consciousness: 'CONSCIOUS',
      ageGroup: 'ADULT',
      redFlags: [],
      call119Required: false,
      summary: '',
    },
    completedTreatments: summary.completedTreatments.map((step, index) => ({
      ...step,
      stepId: index + 1,
    })),
    usedSupplies: summary.usedSupplies,
  };
  expect(hasMatchingCompoundHandover(duplicate, handover)).toBe(true);
  expect(
    hasMatchingCompoundHandover(duplicate, {
      ...handover,
      completedTreatments: handover.completedTreatments.slice(0, 1),
    }),
  ).toBe(false);
  expect(
    hasMatchingCompoundHandover(duplicate, { ...handover, usedSupplies: [] }),
  ).toBe(false);
});
