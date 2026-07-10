export type EmergencySeverityCode =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN';

export type EmergencyTreatmentRouteCode = 'A' | 'B' | 'C' | null;

export interface EmergencyTreatmentStep {
  stepNo: number;
  instruction: string;
  checkpointQuestion: string;
  requiredItemId: number | null;
  requiredQuantity: number;
  imageResource: string | null;
}

export interface EmergencyAssessmentResponse {
  assessmentId: string;
  generatedAt: string;
  result: {
    categoryCode: string;
    subtypeCode: string;
    severityCode: EmergencySeverityCode;
    confidence: number;
    redFlags: string[];
    call119Required: boolean;
  };
  treatment: {
    routeCode: EmergencyTreatmentRouteCode;
    steps: EmergencyTreatmentStep[];
  };
  explanation: {
    summary: string;
    reasons: string[];
    missingInputs: string[];
  };
}

export interface EmergencyAssessmentErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string[];
  };
}

export interface EmergencyAssessmentAudioFile {
  uri: string;
  name?: string;
  type?: string;
}

export interface EmergencyAssessmentVoiceUploadParams {
  audio: EmergencyAssessmentAudioFile;
  language?: string;
  requestId?: string;
}
