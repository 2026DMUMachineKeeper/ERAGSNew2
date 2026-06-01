// 라이브러리 호출 코드

import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice'; // 라이브러리 호출 STT 코드
import { ServerInventoryService, type InventoryPort } from './services/dbService';
import type { MlSessionPort } from './services/mlService';
import type {
  AccidentClassification,
  PatientContext,
  Plan,
  QRPayload,
  TreatmentSession,
} from './machine/types';

class FakeMlService implements MlSessionPort {
  async createSession(
    accident: AccidentClassification,
    patientContext: PatientContext,
  ): Promise<TreatmentSession> {
    return {
      sessionId: `mock-${Date.now()}`,
      accidentType: accident.type,
      plan: 'A',
      steps: [
        {
          stepNo: 1,
          instruction: '상처를 압박합니다.',
          checkpointQuestion: '출혈이 줄었나요?',
          requiredItemId: 1,
          requiredSlotId: 1,
          imageResource: '',
        },
      ],
      patientContext,
      startedAt: Date.now(),
    };
  }

  async switchPlan(
    session: TreatmentSession,
    nextPlan: Plan,
    _note: string,
  ): Promise<TreatmentSession> {
    return { ...session, plan: nextPlan };
  }

  async onStepCompleted(): Promise<void> {
    return;
  }

  async onEmergencyOverride(): Promise<QRPayload> {
    return { qrSvg: '', summaryText: 'emergency', rawCompressed: '' };
  }

  async onSessionCompleted(): Promise<QRPayload> {
    return { qrSvg: '', summaryText: 'completed', rawCompressed: '' };
  }
}

export function createDefaultPorts(): {
  ml: MlSessionPort;
  inventory: InventoryPort;
} {
  const inventory = new ServerInventoryService();
  const ml = new FakeMlService();

  return { ml, inventory };
}

export default createDefaultPorts;

export type SttService = {
  transcribe(audioUri?: string): Promise<string>;
};

// 실제 라이브러리 기반 STT 구현체
class OnDeviceSttService implements SttService {
  private timeoutMs = 10000;

  async transcribe(audioUri?: string): Promise<string> {
    if (audioUri) {
      return '';
    }

    const isAvailable = await Voice.isAvailable().catch(() => 0);
    const servicePromise = Voice.getSpeechRecognitionServices();
    const services = servicePromise
      ? await servicePromise.catch(() => [] as string[])
      : [];

    console.log('[ERAGS STT] available:', isAvailable);
    console.log('[ERAGS STT] services:', services);

    if (!isAvailable) {
      throw new Error('Speech recognition is not available on this device');
    }

    const startOptions: Record<string, string | number | boolean> = {
      EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
      EXTRA_MAX_RESULTS: 5,
      EXTRA_PARTIAL_RESULTS: true,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
    };

    if (
      services.some((service: string) =>
        service.includes('com.google.android.googlequicksearchbox'),
      )
    ) {
      startOptions.RECOGNIZER_ENGINE = 'GOOGLE';
    }

    return new Promise<string>((resolve, reject) => {
      let resolved = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let lastText = '';

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        Voice.removeAllListeners();
        Voice.stop().catch(() => undefined);
      };

      const finish = (text: string) => {
        if (resolved) {
          return;
        }

        resolved = true;
        cleanup();
        resolve(text);
      };

      const fail = (error?: SpeechErrorEvent) => {
        if (resolved) {
          return;
        }

        resolved = true;
        cleanup();
        reject(
          new Error(
            error?.error?.message ??
              error?.error?.code ??
              'On-device STT failed',
          ),
        );
      };

      Voice.onSpeechStart = event => {
        console.log('[ERAGS STT] speech started:', event);
      };
      Voice.onSpeechEnd = event => {
        console.log('[ERAGS STT] speech ended:', event);
        if (lastText) {
          finish(lastText);
        }
      };
      Voice.onSpeechResults = (event: SpeechResultsEvent) => {
        console.log('[ERAGS STT] final results:', event.value);
        const text = event.value?.find(value => value.trim().length > 0);
        if (text) {
          lastText = text;
          finish(text);
        }
      };
      Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
        console.log('[ERAGS STT] partial results:', event.value);
        const partialText = event.value?.[0];
        if (partialText) {
          lastText = partialText;
        }
      };
      Voice.onSpeechError = error => {
        console.warn('[ERAGS STT] speech error:', error);
        fail(error);
      };

      Voice.start('ko-KR', startOptions).catch(error => {
        console.warn('[ERAGS STT] start failed:', error);
        fail();
      });

      timeoutId = setTimeout(() => {
        if (lastText) {
          finish(lastText);
          return;
        }

        fail();
      }, this.timeoutMs);
    });
  }
}

export function createDefaultPortsWithStt(): {
  ml: MlSessionPort;
  inventory: InventoryPort;
  stt: SttService;
} {
  const { ml, inventory } = createDefaultPorts();
  const stt = new OnDeviceSttService();

  return { ml, inventory, stt };
}
