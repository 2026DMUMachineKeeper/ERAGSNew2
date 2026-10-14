import type {
  CompoundCategoryCode,
  CompoundGuideInjuryInput,
  CompoundGuideRequest,
  CompoundGuideResult,
  EmergencyGuidePatientContext,
  EmergencyGuideTreatmentStep,
} from './emergencyGuide.types';

export interface CompoundSupplyAmount {
  itemId: number;
  quantity: number;
}

export interface CompoundConsumptionUnit extends CompoundSupplyAmount {
  unitId: string;
}

export interface CompoundExecutionStep {
  executionStepId: string;
  instruction: string;
  sources: readonly {
    injuryId: string;
    categoryCode: CompoundCategoryCode;
    stepId: number;
  }[];
  consumptionUnits: readonly CompoundConsumptionUnit[];
}

export interface CompoundGuidePlan extends CompoundGuideResult {
  schemaVersion: '2';
  sessionId: string;
  requestId: string;
  planId: string | null;
  authority: 'BACKEND';
  inventoryConsumptionOwner: 'BACKEND';
  inventorySnapshotId: string | null;
  patientContext: EmergencyGuidePatientContext & {
    redFlags: readonly string[];
    call119Required: boolean;
  };
  relations: CompoundGuideRequest['relations'];
  redFlags: readonly string[];
  policy: {
    policyId: string;
    version: string;
    dbVersion: string;
    variantId: string;
  } | null;
  injuries: readonly (CompoundGuideResult['injuries'][number] & {
    categoryCode: CompoundCategoryCode;
    location: CompoundGuideInjuryInput['location'];
    disposition: 'ACTIVE' | 'DEFERRED' | 'HELD';
    assessment: NonNullable<
      CompoundGuideResult['injuries'][number]['assessment']
    > & {
      redFlags: readonly string[];
      reasons: readonly string[];
    };
    guide: {
      call119Required: boolean;
      redFlags: readonly string[];
      steps: readonly (Omit<
        EmergencyGuideTreatmentStep,
        'requiredItemName' | 'imageUrl'
      > & {
        requiredItemName?: string | null;
        imageUrl?: string | null;
      })[];
    } | null;
  })[];
  execution: readonly CompoundExecutionStep[];
  excludedSteps: readonly {
    injuryId: string;
    stepId: number;
    reason: string;
  }[];
  allocations: readonly CompoundSupplyAmount[];
}

export interface CompoundGuideProgress {
  revision: number;
  status: 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
  currentStepId: string | null;
  completedStepIds: readonly string[];
  blockedReason: string | null;
  display?: {
    status?: string;
    blockedReason?: { code: string; label: string };
  };
  injuries: readonly {
    injuryId: string;
    status: 'WAITING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'DEFERRED';
    deferredReason: string | null;
    display?: { status?: string };
  }[];
}

export interface CompoundGuideSnapshot {
  schemaVersion: '2';
  sessionId: string;
  planId: string | null;
  compound: CompoundGuidePlan;
  progress: CompoundGuideProgress | null;
  usedSupplies: readonly CompoundConsumptionUnit[];
}

export interface CompoundCompletionCommand {
  planId: string;
  executionStepId: string;
  expectedRevision: number;
  idempotencyKey: string;
}

export interface CompoundCompletionAttempt {
  sessionId: string;
  command: CompoundCompletionCommand;
}

export interface CompoundCompletionReceipt {
  outcome: 'COMPLETED' | 'DUPLICATE' | 'BLOCKED';
  snapshot: CompoundGuideSnapshot;
}
