import type {
  AccidentClassification,
  AccidentType,
  PatientContext,
  Plan,
  QRPayload,
  TreatmentSession,
} from '../machine/types';

export interface RuntimeEventContext {
  sessionId: string;
  accidentType: AccidentType;
  planType: Plan;
}

export interface StepCompletedPayload extends RuntimeEventContext {
  stepNo: number;
  itemUsedId: number | null;
  slotId: number | null;
}

/**
 * Implemented by the ML runtime package at final app composition time.
 * This repository depends only on the contract and injects fakes in tests.
 */
export interface MlSessionPort {
  createSession(
    accident: AccidentClassification,
    patientContext: PatientContext,
    planType?: Plan,
  ): Promise<TreatmentSession>;
  switchPlan(
    session: TreatmentSession,
    nextPlan: Plan,
    note: string,
  ): Promise<TreatmentSession>;
  onStepCompleted(payload: StepCompletedPayload): Promise<void>;
  onEmergencyOverride(
    payload: RuntimeEventContext & { note?: string },
  ): Promise<QRPayload>;
  onSessionCompleted(payload: RuntimeEventContext): Promise<QRPayload>;
}
