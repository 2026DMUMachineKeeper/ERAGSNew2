export type Plan = 'A' | 'B' | 'C';
export type PlanType = Plan;
export type AccidentType = 'BLEEDING' | 'BURN' | 'FRACTURE' | 'CPR';
export type InputType = 'IMAGE' | 'VOICE' | 'MANUAL';
export type BleedingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Consciousness = 'CONSCIOUS' | 'UNCONSCIOUS' | 'UNKNOWN';
export type AgeGroup = 'CHILD' | 'ADULT' | 'ELDERLY';

export interface TreatmentStep {
  stepNo: number;
  instruction: string;
  checkpointQuestion: string;
  requiredItemId: number | null;
  requiredSlotId: number | null;
  imageResource: string;
}

export interface AccidentClassification {
  type: AccidentType;
  confidence: number;
  rawInputType: InputType;
}

export interface PatientContext {
  bleedingLevel: BleedingLevel;
  consciousness: Consciousness;
  ageGroup: AgeGroup;
}

export interface TreatmentSession {
  sessionId: string;
  accidentType: AccidentType;
  plan: Plan;
  steps: TreatmentStep[];
  patientContext: PatientContext;
  startedAt: number;
}

export interface QRPayload {
  qrSvg: string;
  summaryText: string;
  rawCompressed: string;
}

export type SessionErrorCode =
  | 'SERVER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'INSUFFICIENT_QUANTITY'
  | 'PLAN_STEPS_UNAVAILABLE'
  | 'LOG_SAVE_FAILED'
  | 'MODEL_LOAD_FAILED';

export class SessionError extends Error {
  constructor(public readonly code: SessionErrorCode, message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface TreatmentContext {
  session: TreatmentSession | null;
  steps: TreatmentStep[];
  currentIndex: number;
  plan: Plan | null;
  isChecked: boolean;
  pendingAccident: AccidentClassification | null;
  patientContext: PatientContext | null;
  pendingPlan: Plan | null;
  pendingPlanNote: string | null;
  inventoryConsumedForStep: boolean;
  lastError: SessionError | null;
  qrPayload: QRPayload | null;
  emergencyNote: string | null;
}

export type TreatmentEvent =
  | {
      type: 'START';
      accident: AccidentClassification;
      patientContext: PatientContext;
    }
  | {
      type: 'VOICE_INPUT';
      text: string;
    }
  | { type: 'RETRY' }
  | { type: 'NEXT' }
  | { type: 'TOGGLE'; checked: boolean }
  | { type: 'CONFIRM' }
  | { type: 'SAVED' }
  | { type: 'RETRY_SAVE' }
  | { type: 'MANUAL_OVERRIDE'; nextPlan: Plan; note?: string }
  | { type: 'EMERGENCY'; note?: string };
