export interface ApiError {
  code: string;
  message: string;
  details: string[];
}

export interface EmergencyGuideQuestionnaireAnswer {
  questionId: string;
  answerIds: readonly string[];
}

export interface EmergencyGuideMediaFile {
  uri: string;
  name: string;
  type: string;
}

export interface EmergencyGuidePatientContext {
  consciousness: 'CONSCIOUS' | 'UNCONSCIOUS' | 'UNKNOWN';
  ageGroup: 'CHILD' | 'ADULT' | 'ELDERLY' | 'UNKNOWN';
}

export interface EmergencyGuideAssessment {
  assessmentId: string;
  categoryCode: string;
  subtypeCode: string;
  severityCode: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
  confidence: number | null;
  redFlags: string[];
  call119Required: boolean;
  summary: string;
  reasons: string[];
  missingInputs: string[];
  decisionSource: 'ML_EVIDENCE' | 'SM_LEGACY';
  modelVersion: string | null;
}

export interface EmergencyGuideTreatmentStep {
  stepId: number | null;
  stepNo: number;
  instruction: string;
  checkpointQuestion: string;
  requiredItemId: number | null;
  requiredItemName: string | null;
  requiredQuantity: number;
  requiredSlotId: number | null;
  imageResource: string | null;
  imageUrl: string | null;
}

export interface EmergencyGuideTreatment {
  routeCode: 'A' | 'B' | 'C' | null;
  modelVersion: string | null;
  steps: EmergencyGuideTreatmentStep[];
}

export interface EmergencyGuideEvidence {
  voice: unknown | null;
  image: unknown | null;
  questionnaire: unknown | null;
}

export interface EmergencyGuideResponse {
  sessionId: string | null;
  requestId: string | null;
  generatedAt: string;
  status: 'COMPLETE' | 'ASSESSMENT_ONLY' | 'GUIDE_PENDING';
  patientContext: EmergencyGuidePatientContext | null;
  evidence: EmergencyGuideEvidence | null;
  assessment: EmergencyGuideAssessment | null;
  treatment: EmergencyGuideTreatment;
  error: ApiError | null;
}
