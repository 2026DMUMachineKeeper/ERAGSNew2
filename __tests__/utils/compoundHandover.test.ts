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
import type { EmergencyGuideHandoverSnapshot } from '@/types';

it('가이드 생성 완료와 실제 전체 처치 완료, 보류된 처치를 구분한다', () => {
  expect(isCompoundTreatmentCompleted(INITIAL_COMPOUND_SNAPSHOT)).toBe(false);
  expect(isCompoundTreatmentCompleted(completedSnapshot(1))).toBe(false);
  expect(isCompoundTreatmentCompleted(completedSnapshot(2))).toBe(true);
  expect(isCompoundTreatmentCompleted(PARTIAL_FINISHED_SNAPSHOT)).toBe(false);
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
