import { classifyVoice } from '../classifier/voiceInputHandler';
import { useMachine } from '@xstate/react';
import {
  treatmentMachine,
  type TreatmentMachineInput,
} from '../machine/treatmentMachine';
import type { AccidentType, PatientContext } from '../machine/types';
import type { SttService } from '../ports';

type AudioInputResult =
  | { ok: true; text: string; accidentType: AccidentType }
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
  ports: TreatmentMachineInput & { stt?: SttService },
) => {
  const [state, send] = useMachine(treatmentMachine, { input: ports });

  const startFromText = (text: string, patientContext: PatientContext) => {
    const result = classifyVoice(text);

    if (!result) {
      return null;
    }

    send({
      type: 'START',
      accident: result,
      patientContext,
    });

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

    const result = startFromText(text, patientContext);
    if (!result) {
      return { ok: false, reason: 'NO_CLASSIFICATION', text };
    }

    return { ok: true, text, accidentType: result.type };
  };

  return {
    state: state.value,
    context: state.context,

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

    saved: () => send({ type: 'SAVED' }),

    emergency: () =>
      send({
        type: 'EMERGENCY',
      }),
  };
};
