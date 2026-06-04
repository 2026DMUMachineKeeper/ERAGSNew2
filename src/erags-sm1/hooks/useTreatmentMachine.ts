// 상태머신을 React hook으로 감싼 파일. 음성입력, 직접선택, next, confirm 같은 함수 제공
import {
  classifyVoice,
  inferBleedingLevel,
} from '../classifier/voiceInputHandler';
import { useMachine } from '@xstate/react';
import {
  treatmentMachine,
  type TreatmentMachineInput,
} from '../machine/treatmentMachine';
import type {
  AccidentClassification,
  AccidentType,
  PatientContext,
} from '../machine/types';
import type { SttService, VoiceTriageService } from '../ports';

type VoiceInferenceSource = 'KEYWORD' | 'AI';

type VoiceInference = {
  accident: AccidentClassification;
  patientContext: PatientContext;
  source: VoiceInferenceSource;
};

type AudioInputResult =
  | {
      ok: true;
      text: string;
      accidentType: AccidentType;
      source: VoiceInferenceSource;
    }
  | {
      ok: false;
      reason:
        | 'NO_STT'
        | 'STT_UNAVAILABLE'
        | 'STT_FAILED'
        | 'EMPTY_TEXT'
        | 'NO_CLASSIFICATION';
      text?: string;
    };

export const useTreatmentMachine = (
  ports: TreatmentMachineInput & {
    stt?: SttService;
    triage?: VoiceTriageService;
  },
) => {
  const [state, send] = useMachine(treatmentMachine, { input: ports });

  const startFromAccident = (
    accident: AccidentClassification,
    patientContext: PatientContext,
  ) => {
    send({
      type: 'START',
      accident,
      patientContext,
    });

    return accident;
  };

  const startFromInference = (inference: VoiceInference) => { // 추론 결과 나오면 상태머신에 START 보냄
    startFromAccident(inference.accident, inference.patientContext);
    return inference.accident;
  };

  const inferPatientContext = (
    text: string,
    accident: AccidentClassification,
    patientContext: PatientContext,
  ): PatientContext => {
    if (accident.type !== 'BLEEDING') {
      return patientContext;
    }

    return {
      ...patientContext,
      bleedingLevel: inferBleedingLevel(text) ?? patientContext.bleedingLevel,
    };
  };

  const inferFromText = async (
    text: string,
    patientContext: PatientContext,
  ): Promise<VoiceInference | null> => {
    if (ports.triage) {
      console.log('[ERAGS TRIAGE] AI inference requested:', text);
      try {
        const aiResult = await ports.triage.classify(text, patientContext);
        if (aiResult) {
          console.log('[ERAGS TRIAGE] AI inference selected:', aiResult);
          return {
            accident: aiResult.accident,
            patientContext: aiResult.patientContext,
            source: 'AI',
          };
        }

        console.log('[ERAGS TRIAGE] AI returned no classification');
      } catch (error) {
        console.warn('[ERAGS TRIAGE] AI inference failed; using keyword fallback', error);
      }
    } else {
      console.warn('[ERAGS TRIAGE] AI service is not configured; using keyword fallback');
    }

    const keywordResult = classifyVoice(text);
    if (!keywordResult) {
      return null;
    }

    return {
      accident: keywordResult,
      patientContext: inferPatientContext(
        text,
        keywordResult,
        patientContext,
      ),
      source: 'KEYWORD',
    };
  };

  const startFromText = (text: string, patientContext: PatientContext) => {
    const result = classifyVoice(text);

    if (!result) {
      return null;
    }

    const inference: VoiceInference = {
      accident: result,
      patientContext: inferPatientContext(text, result, patientContext),
      source: 'KEYWORD',
    };

    startFromInference(inference);
    return result;
  };

  const audioInputResult = async (
    audioUri: string | undefined,
    patientContext: PatientContext,
  ): Promise<AudioInputResult> => {
    const stt = ports.stt;
    if (!stt) {
      return { ok: false, reason: 'NO_STT' };
    }

    let text: string;
    try {
      text = await stt.transcribe(audioUri);
    } catch (error) {
      console.warn('[ERAGS STT] failed', error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Speech recognition is not available')) {
        return { ok: false, reason: 'STT_UNAVAILABLE' };
      }

      return { ok: false, reason: 'STT_FAILED' };
    }

    console.log('[ERAGS STT] recognized text:', text);

    if (!text.trim()) {
      return { ok: false, reason: 'EMPTY_TEXT' };
    }

    const inference = await inferFromText(text, patientContext);
    if (!inference) {
      return { ok: false, reason: 'NO_CLASSIFICATION', text };
    }

    startFromInference(inference);

    return {
      ok: true,
      text,
      accidentType: inference.accident.type,
      source: inference.source,
    };
  };

  return {
    state: state.value,
    context: state.context,

    manualInput: (
      accidentType: AccidentType,
      patientContext: PatientContext,
    ) => {
      startFromAccident(
        {
          type: accidentType,
          confidence: 1,
          rawInputType: 'MANUAL',
        },
        patientContext,
      );
    },

    voiceInput: (text: string, patientContext: PatientContext) =>
      startFromText(text, patientContext) !== null,

    audioInput: async (
      audioUri: string | undefined,
      patientContext: PatientContext,
    ) => {
      const result = await audioInputResult(audioUri, patientContext);
      return result.ok;
    },

    audioInputResult,

    retry: () => send({ type: 'RETRY' }),

    next: () => send({ type: 'NEXT' }),

    toggle: (checked: boolean) =>
      send({
        type: 'TOGGLE',
        checked,
      }),

    confirm: () => send({ type: 'CONFIRM' }),

    emergency: () =>
      send({
        type: 'EMERGENCY',
      }),
  };
};
