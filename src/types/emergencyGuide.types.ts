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
  // 바이트 단위 파일 크기입니다. 알 수 없으면 생략하며, 알 때만 전송 전 용량을 검사합니다.
  size?: number;
}

export interface EmergencyGuidePhotoRequest {
  images: readonly EmergencyGuideMediaFile[];
  text?: string;
  audio?: EmergencyGuideMediaFile;
}

export interface EmergencyGuidePatientContext {
  consciousness: 'CONSCIOUS' | 'UNCONSCIOUS' | 'UNKNOWN';
  ageGroup: 'CHILD' | 'ADULT' | 'ELDERLY' | 'UNKNOWN';
}

export type CompoundCategoryCode =
  | 'BLEEDING'
  | 'BURN'
  | 'FRACTURE_BRUISE'
  | 'FEVER_NEUROLOGIC'
  | 'ALLERGY_RASH'
  | 'AIRWAY_OBSTRUCTION';

export interface CompoundGuideRequest {
  schemaVersion: '2';
  requestId: string;
  language: 'ko-KR';
  patientContext: EmergencyGuidePatientContext;
  injuries: readonly [CompoundGuideInjuryInput, CompoundGuideInjuryInput];
  relations: readonly [
    {
      injuryIds: readonly [string, string];
      relation: 'SAME' | 'DIFFERENT' | 'NOT_APPLICABLE' | 'UNKNOWN';
      confirmed: boolean;
    },
  ];
}

export interface CompoundGuideInjuryInput {
  injuryId: string;
  categoryCode: CompoundCategoryCode;
  confirmed: true;
  location: {
    scope: 'LOCALIZED' | 'SYSTEMIC' | 'UNKNOWN';
    description: string | null;
  };
  observations: readonly string[];
  questionnaire: readonly EmergencyGuideQuestionnaireAnswer[];
}

export interface CompoundGuideResult {
  schemaVersion?: '2';
  planId?: string | null;
  status: 'ASSESSMENT_ONLY' | 'GUIDE_PENDING' | 'COMPLETE' | 'PARTIAL';
  blockedReasons: readonly string[];
  call119Required: boolean;
  display?: {
    status?: string;
    blockedReasons?: readonly { code: string; label: string }[];
    redFlags?: readonly { code: string; label: string }[];
  };
  injuries: readonly {
    injuryId: string;
    categoryCode: string;
    deferredReason: string | null;
    display?: { category?: string; disposition?: string };
    assessment: {
      subtypeCode: string | null;
      severityCode: string;
      call119Required: boolean;
      missingInputs: readonly string[];
      display?: {
        category?: string;
        subtype?: string;
        severity?: string;
        missingInputs?: readonly { code: string; label: string }[];
      };
    } | null;
  }[];
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
  stepId: number;
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

// 파일별 분석 결과입니다. 일부 파일이 실패해도 응답은 200이며, 실패 항목은 status가 FAILED로 내려옵니다.
export type EmergencyGuideEvidenceStatus = 'SUCCEEDED' | 'FAILED';

export interface EmergencyGuideEvidenceError {
  code: string;
  message: string;
}

export interface EmergencyGuideEvidenceImage {
  // 전송한 images 배열 순서대로 image-0, image-1 … 형태로 매핑됩니다.
  imageId: string;
  status: EmergencyGuideEvidenceStatus;
  visibleBlood?: boolean;
  visibleBloodScore?: number;
  identifiedCondition?: string;
  error?: EmergencyGuideEvidenceError;
}

export interface EmergencyGuideEvidenceVoice {
  status: EmergencyGuideEvidenceStatus;
  error?: EmergencyGuideEvidenceError;
  [key: string]: unknown;
}

export interface EmergencyGuideEvidence {
  voice: EmergencyGuideEvidenceVoice | null;
  images: EmergencyGuideEvidenceImage[] | null;
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
  compound?: CompoundGuideResult | null;
  schemaVersion?: '2';
  progress?: import('./compoundGuide.types').CompoundGuideProgress | null;
  usedSupplies?: readonly import('./compoundGuide.types').CompoundConsumptionUnit[];
}

// 소유 앱이 세션당 한 번 보고하는 GPS 수집 결과입니다.
// AVAILABLE 외의 상태는 좌표를 null로 보냅니다.
export type EmergencySessionLocationStatus =
  | 'AVAILABLE'
  | 'DENIED'
  | 'UNAVAILABLE';

export interface EmergencySessionLocationReport {
  status: EmergencySessionLocationStatus;
  observedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

export type EmergencyGuideHandoverStatus = 'COMPLETED' | 'IN_PROGRESS';

export interface CreateEmergencyGuideHandoverRequest {
  status: EmergencyGuideHandoverStatus;
  completedStepIds: number[];
}

export interface EmergencyGuideHandoverAssessment {
  categoryCode: string;
  subtypeCode: string;
  severityCode: EmergencyGuideAssessment['severityCode'];
  consciousness: EmergencyGuidePatientContext['consciousness'];
  ageGroup: EmergencyGuidePatientContext['ageGroup'];
  redFlags: string[];
  call119Required: boolean;
  summary: string;
}

export interface EmergencyGuideHandoverCompletedTreatment {
  stepId: number;
  stepNo: number;
  instruction: string;
}

export interface EmergencyGuideHandoverUsedSupply {
  name: string;
  quantity: number;
}

export interface EmergencyGuideHandoverSnapshot {
  version: 2;
  generatedAt: string;
  expiresAt: string;
  status: EmergencyGuideHandoverStatus;
  assessment: EmergencyGuideHandoverAssessment;
  completedTreatments: EmergencyGuideHandoverCompletedTreatment[];
  usedSupplies: EmergencyGuideHandoverUsedSupply[];
}

export interface CreateEmergencyGuideHandoverResponse {
  publicHandoverUrl: string;
  snapshot: EmergencyGuideHandoverSnapshot;
}

export type EmergencyWasteGuideDangerLevel = 'HIGH' | 'LOW';

export interface EmergencyWasteGuideItem {
  itemName: string;
  wasteCategory: string;
  disposalMethod: string;
  dangerLevel: EmergencyWasteGuideDangerLevel;
}

export interface EmergencyWasteGuideResponse {
  success: true;
  data: EmergencyWasteGuideItem[];
  message?: string;
}
