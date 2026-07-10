import React from 'react';

import { postEmergencyAssessmentVoice } from '@/services/emergencyAssessment.service';
import type { EmergencyAssessmentResponse } from '@/types/emergencyAssessment.types';
import type {
  AccidentClassification,
  AccidentType,
  EmergencyMlInput,
  PatientContext,
  RedFlagSignal,
} from '@/types/triage.types';

type TriageSource = EmergencyMlInput['source'];

export const getTriageErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return '응급상황 판단 요청에 실패했습니다.';
};

type TriageResult =
  | {
      ok: true;
      input: EmergencyMlInput;
      source: TriageSource;
      text?: string;
      assessment?: EmergencyAssessmentResponse;
    }
  | {
      ok: false;
      reason:
        | 'NO_AUDIO'
        | 'EMPTY_TEXT'
        | 'STT_UNAVAILABLE'
        | 'NO_CLASSIFICATION'
        | 'SM_ASSESSMENT_FAILED'
        | 'ML_REQUEST_FAILED';
      text?: string;
      error?: unknown;
    };

const supportedAccidentTypes: AccidentType[] = [
  'BLEEDING',
  'BURN',
  'FRACTURE_BRUISE',
  'FEVER',
  'SKIN_RASH',
  'AIRWAY_OBSTRUCTION',
  'FRACTURE',
  'CPR',
];

const supportedRedFlagSignals: RedFlagSignal[] = [
  'UNCONTROLLED_BLEEDING',
  'SHOCK',
  'SPURTING_BLOOD',
  'DEEP_WOUND',
  'AMPUTATION',
  'EMBEDDED_OBJECT',
  'AIRWAY_BURN',
  'FACE_BURN',
  'LARGE_AREA_BURN',
  'CHEMICAL_BURN',
  'ELECTRICAL_BURN',
  'EXPOSED_BONE',
  'NEUROVASCULAR_SYMPTOM',
  'CRUSH_INJURY',
  'ALTERED_CONSCIOUSNESS',
  'RESPIRATORY_DISTRESS',
  'SEIZURE',
  'SEVERE_DEHYDRATION',
  'HIGH_RISK_AGE',
  'NON_BLANCHING_RASH',
  'FACIAL_SWELLING',
  'LIP_SWELLING',
  'WHEEZING',
  'HOARSE_VOICE',
  'CANNOT_SPEAK',
  'CANNOT_COUGH',
  'CANNOT_BREATHE',
  'CYANOSIS',
];

const defaultPatientContext: PatientContext = {
  bleedingLevel: 'LOW',
  consciousness: 'UNKNOWN',
  ageGroup: 'ADULT',
};

const isAccidentType = (value: string): value is AccidentType =>
  supportedAccidentTypes.includes(value as AccidentType);

const isRedFlagSignal = (value: string): value is RedFlagSignal =>
  supportedRedFlagSignals.includes(value as RedFlagSignal);

const getBleedingLevelFromAssessment = (
  assessment: EmergencyAssessmentResponse,
): PatientContext['bleedingLevel'] => {
  if (
    assessment.result.severityCode === 'CRITICAL' ||
    assessment.result.severityCode === 'HIGH'
  ) {
    return 'HIGH';
  }

  if (assessment.result.severityCode === 'MEDIUM') {
    return 'MEDIUM';
  }

  return 'LOW';
};

const buildInputFromAssessment = (
  assessment: EmergencyAssessmentResponse,
  patientContext: PatientContext,
): EmergencyMlInput | null => {
  if (!isAccidentType(assessment.result.categoryCode)) {
    return null;
  }

  const redFlagSignals = assessment.result.redFlags.filter(isRedFlagSignal);

  return {
    accident: {
      type: assessment.result.categoryCode,
      confidence: assessment.result.confidence,
      rawInputType: 'VOICE',
    },
    patientContext: {
      ...patientContext,
      bleedingLevel:
        assessment.result.categoryCode === 'BLEEDING'
          ? getBleedingLevelFromAssessment(assessment)
          : patientContext.bleedingLevel,
      redFlagSignals: redFlagSignals.length
        ? [...new Set([...(patientContext.redFlagSignals ?? []), ...redFlagSignals])]
        : patientContext.redFlagSignals,
    },
    missingFields: assessment.explanation.missingInputs,
    source: 'AI',
  };
};

export function useEmergencyTriage() {
  const [isBusy, setIsBusy] = React.useState(false);

  const startVoiceTriage = React.useCallback(
    async (
      audioUri?: string,
      patientContext: PatientContext = defaultPatientContext,
    ): Promise<TriageResult> => {
      if (!audioUri) {
        return { ok: false, reason: 'NO_AUDIO' };
      }

      setIsBusy(true);
      try {
        const assessment = await postEmergencyAssessmentVoice({
          audio: { uri: audioUri },
        });
        const input = buildInputFromAssessment(assessment, patientContext);

        if (!input) {
          return {
            ok: false,
            reason: 'NO_CLASSIFICATION',
            text: assessment.explanation.summary,
          };
        }

        return {
          ok: true,
          input,
          source: input.source,
          text: assessment.explanation.summary,
          assessment,
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'SM_ASSESSMENT_FAILED',
          text: getTriageErrorMessage(error),
          error,
        };
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  const sendManualTriage = React.useCallback(
    async (
      accidentType: AccidentType,
      patientContext: PatientContext,
    ): Promise<TriageResult> => {
      const input: EmergencyMlInput = {
        accident: {
          type: accidentType,
          confidence: 1,
          rawInputType: 'MANUAL',
        },
        patientContext,
        source: 'MANUAL',
      };

      return { ok: true, input, source: input.source };
    },
    [],
  );

  const sendImageTriage = React.useCallback(
    async (
      imageUri: string,
      accident: AccidentClassification,
      patientContext: PatientContext = defaultPatientContext,
    ): Promise<TriageResult> => {
      const input: EmergencyMlInput = {
        accident: { ...accident, rawInputType: 'IMAGE' },
        patientContext,
        imageUri,
        source: 'IMAGE',
      };

      return { ok: true, input, source: input.source };
    },
    [],
  );

  return {
    isBusy,
    startVoiceTriage,
    sendManualTriage,
    sendImageTriage,
  };
}
