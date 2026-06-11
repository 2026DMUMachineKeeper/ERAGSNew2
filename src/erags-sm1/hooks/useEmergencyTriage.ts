import React from 'react';
import {
  classifyVoiceToDraft,
  type SmInputDraft,
} from '../classifier/voiceInputHandler';
import {
  createDefaultEmergencyTriagePorts,
  type MlInputSender,
  type SttService,
  type VoiceTriageService,
} from '../ports';
import type {
  AccidentClassification,
  AccidentType,
  EmergencyMlInput,
  PatientContext,
  RedFlagSignal,
} from '../types';

type TriageSource = EmergencyMlInput['source'];

type TriagePorts = {
  stt?: SttService;
  triage?: VoiceTriageService;
  mlInputSender: MlInputSender;
};

type TriageResult =
  | {
      ok: true;
      input: EmergencyMlInput;
      source: TriageSource;
      text?: string;
    }
  | {
      ok: false;
      reason:
        | 'NO_STT'
        | 'STT_UNAVAILABLE'
        | 'STT_FAILED'
        | 'EMPTY_TEXT'
        | 'NO_CLASSIFICATION'
        | 'ML_REQUEST_FAILED';
      text?: string;
      error?: unknown;
    };

const mergeRedFlags = (
  base?: RedFlagSignal[],
  patch?: RedFlagSignal[],
): RedFlagSignal[] | undefined => {
  const merged = [...(base ?? []), ...(patch ?? [])];
  return merged.length ? [...new Set(merged)] : undefined;
};

const mergeDraftWithPatientContext = (
  draft: SmInputDraft,
  patientContext: PatientContext,
): PatientContext => {
  const redFlagSignals = mergeRedFlags(
    patientContext.redFlagSignals,
    draft.patientContextPatch.redFlagSignals,
  );
  const patch = { ...draft.patientContextPatch };
  delete patch.redFlagSignals;

  return {
    ...patientContext,
    ...patch,
    ...(redFlagSignals ? { redFlagSignals } : {}),
  };
};

const defaultPatientContext: PatientContext = {
  bleedingLevel: 'LOW',
  consciousness: 'UNKNOWN',
  ageGroup: 'ADULT',
};

export function useEmergencyTriage(customPorts?: Partial<TriagePorts>) {
  const defaultPorts = React.useMemo(
    () => createDefaultEmergencyTriagePorts(),
    [],
  );
  const ports = React.useMemo<TriagePorts>(
    () => ({
      ...defaultPorts,
      ...customPorts,
    }),
    [customPorts, defaultPorts],
  );
  const [isBusy, setIsBusy] = React.useState(false);

  const submitToMl = React.useCallback(
    async (input: EmergencyMlInput): Promise<TriageResult> => {
      try {
        await ports.mlInputSender.submit(input);
        return {
          ok: true,
          input,
          source: input.source,
          text: input.transcript,
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'ML_REQUEST_FAILED',
          text: input.transcript,
          error,
        };
      }
    },
    [ports.mlInputSender],
  );

  const inferInputFromText = React.useCallback(
    async (
      text: string,
      patientContext: PatientContext,
    ): Promise<EmergencyMlInput | null> => {
      if (ports.triage) {
        try {
          const aiResult = await ports.triage.classify(text, patientContext);
          if (aiResult) {
            return {
              accident: aiResult.accident,
              patientContext: aiResult.patientContext,
              transcript: text,
              source: 'AI',
            };
          }
        } catch (error) {
          console.warn(
            '[ERAGS TRIAGE] AI inference failed; using keyword fallback',
            error,
          );
        }
      }

      const draft = classifyVoiceToDraft(text);
      if (!draft) {
        return null;
      }

      return {
        accident: draft.accident,
        patientContext: mergeDraftWithPatientContext(draft, patientContext),
        transcript: text,
        missingFields: draft.missingFields,
        source: 'KEYWORD',
      };
    },
    [ports.triage],
  );

  const startVoiceTriage = React.useCallback(
    async (
      audioUri?: string,
      patientContext: PatientContext = defaultPatientContext,
    ): Promise<TriageResult> => {
      const stt = ports.stt;
      if (!stt) {
        return { ok: false, reason: 'NO_STT' };
      }

      setIsBusy(true);
      try {
        let text: string;
        try {
          text = await stt.transcribe(audioUri);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.includes('Speech recognition is not available')) {
            return { ok: false, reason: 'STT_UNAVAILABLE', error };
          }

          return { ok: false, reason: 'STT_FAILED', error };
        }

        if (!text.trim()) {
          return { ok: false, reason: 'EMPTY_TEXT', text };
        }

        const input = await inferInputFromText(text, patientContext);
        if (!input) {
          return { ok: false, reason: 'NO_CLASSIFICATION', text };
        }

        return submitToMl(input);
      } finally {
        setIsBusy(false);
      }
    },
    [inferInputFromText, ports.stt, submitToMl],
  );

  const sendManualTriage = React.useCallback(
    async (
      accidentType: AccidentType,
      patientContext: PatientContext,
    ): Promise<TriageResult> => {
      const accident: AccidentClassification = {
        type: accidentType,
        confidence: 1,
        rawInputType: 'MANUAL',
      };

      setIsBusy(true);
      try {
        return await submitToMl({
          accident,
          patientContext,
          source: 'MANUAL',
        });
      } finally {
        setIsBusy(false);
      }
    },
    [submitToMl],
  );

  const sendImageTriage = React.useCallback(
    async (
      imageUri: string,
      accident: AccidentClassification,
      patientContext: PatientContext = defaultPatientContext,
    ): Promise<TriageResult> => {
      setIsBusy(true);
      try {
        return await submitToMl({
          accident: { ...accident, rawInputType: 'IMAGE' },
          patientContext,
          imageUri,
          source: 'IMAGE',
        });
      } finally {
        setIsBusy(false);
      }
    },
    [submitToMl],
  );

  return {
    isBusy,
    startVoiceTriage,
    sendManualTriage,
    sendImageTriage,
    submitToMl,
  };
}
