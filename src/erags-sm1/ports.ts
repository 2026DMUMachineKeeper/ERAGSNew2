// 라이브러리 호출 코드
// STT, Gemini 음성 추론, DB/재고, ML 세션 생성을 중간에서 연결해줌

import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice'; // 라이브러리 호출 STT 코드
import Config from 'react-native-config';
import { ServerInventoryService, type InventoryPort } from './services/dbService';
import type { MlSessionPort } from './services/mlService';
import type {
  AccidentClassification,
  AccidentType,
  BleedingLevel,
  Consciousness,
  InputType,
  PatientContext,
  Plan,
  QRPayload,
  TreatmentSession,
} from './machine/types';

class FakeMlService implements MlSessionPort { // ML/session 서버 역할을 임시로 흉내냄. 테스트용
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

export type VoiceTriageResult = { // 나중에 AI 분류 꽂을 타입 추가
  accident: AccidentClassification;
  patientContext: PatientContext;
};

export type VoiceTriageService = {
  classify(
    text: string,
    patientContext: PatientContext,
  ): Promise<VoiceTriageResult | null>;
};

type AiTriagePayload = {
  accidentType: AccidentType | 'UNKNOWN';
  bleedingLevel?: BleedingLevel;
  consciousness?: Consciousness;
  confidence: number;
};

const GEMINI_TRIAGE_MODEL =
  Config.GEMINI_TRIAGE_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TRIAGE_MODEL}:generateContent`;

const accidentTypes: AccidentType[] = ['BLEEDING', 'BURN', 'FRACTURE', 'CPR'];
const bleedingLevels: BleedingLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
const consciousnessValues: Consciousness[] = [
  'CONSCIOUS',
  'UNCONSCIOUS',
  'UNKNOWN',
];

const parseGeminiResponseText = (payload: any): string | null => {
  const textPart = payload?.candidates?.[0]?.content?.parts?.find(
    (part: any) => typeof part?.text === 'string',
  );

  return typeof textPart?.text === 'string' ? textPart.text : null;
};

const normalizeTriageResult = (
  result: AiTriagePayload,
  patientContext: PatientContext,
): VoiceTriageResult | null => {
  if (result.accidentType === 'UNKNOWN') {
    return null;
  }

  const rawInputType: InputType = 'VOICE';
  return {
    accident: {
      type: result.accidentType,
      confidence: Math.round(result.confidence * 100) / 100,
      rawInputType,
    },
    patientContext: {
      ...patientContext,
      bleedingLevel:
        result.accidentType === 'BLEEDING'
          ? result.bleedingLevel ?? patientContext.bleedingLevel
          : patientContext.bleedingLevel,
      consciousness: result.consciousness ?? patientContext.consciousness,
    },
  };
};

class GeminiVoiceTriageService implements VoiceTriageService {
  constructor(private readonly apiKey: string) {}

  async classify(
    text: string,
    patientContext: PatientContext,
  ): Promise<VoiceTriageResult | null> {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'You classify Korean first-aid voice transcripts.',
                  'Return only JSON matching the schema.',
                  'If the accident type is unclear, use UNKNOWN.',
                  JSON.stringify({
                    transcript: text,
                    currentPatientContext: patientContext,
                    accidentTypes,
                    bleedingLevels,
                    consciousnessValues,
                    schema: {
                      accidentType: [...accidentTypes, 'UNKNOWN'],
                      bleedingLevel: bleedingLevels,
                      consciousness: consciousnessValues,
                      confidence: 'number from 0 to 1',
                    },
                  }),
                ].join('\n'),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              accidentType: {
                type: 'STRING',
                enum: [...accidentTypes, 'UNKNOWN'],
              },
              bleedingLevel: {
                type: 'STRING',
                enum: bleedingLevels,
              },
              consciousness: {
                type: 'STRING',
                enum: consciousnessValues,
              },
              confidence: {
                type: 'NUMBER',
              },
            },
            required: [
              'accidentType',
              'bleedingLevel',
              'consciousness',
              'confidence',
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini triage failed: ${response.status} ${body}`);
    }

    const responseJson = await response.json();
    const responseText = parseGeminiResponseText(responseJson);
    if (!responseText) {
      return null;
    }

    return normalizeTriageResult(
      JSON.parse(responseText) as AiTriagePayload,
      patientContext,
    );
  }
}

// 실제 라이브러리 기반 STT 구현체 (음성 -> 텍스트 변환)
class OnDeviceSttService implements SttService {
  private timeoutMs = 26000;
  private emergencyPartialDelayMs = 900;
  private activeTranscription: Promise<string> | null = null;

  private pickBestSpeechText(values?: string[]): string | undefined {
    const candidates =
      values?.map(value => value.trim()).filter(value => value.length > 0) ??
      [];

    if (!candidates.length) {
      return undefined;
    }

    return (
      candidates.find(value => this.hasEmergencyKeyword(value)) ??
      candidates[0]
    );
  }

  private hasEmergencyKeyword(value: string): boolean {
    return /출혈|피|피가|피나|상처|베였|베임|찢|화상|골절|부러|뼈|심폐|호흡|숨|의식/.test(
      value,
    );
  }

  async transcribe(audioUri?: string): Promise<string> {
    if (this.activeTranscription) {
      console.log('[ERAGS STT] reusing active transcription');
      return this.activeTranscription;
    }

    const transcription = this.transcribeOnce(audioUri).finally(() => {
      if (this.activeTranscription === transcription) {
        this.activeTranscription = null;
      }
    });

    this.activeTranscription = transcription;
    return transcription;
  }

  private async transcribeOnce(audioUri?: string): Promise<string> {
    if (audioUri) {
      throw new Error('File-based transcription is not supported on this device');
    }

    const isAvailable = await Voice.isAvailable().catch(() => false);
    const servicePromise = Voice.getSpeechRecognitionServices();
    const services = servicePromise
      ? await servicePromise.catch(() => [] as string[])
      : [];

    console.log('[ERAGS STT] available:', isAvailable);
    console.log('[ERAGS STT] services:', services);

    const hasRecognizerService = services.some((s: string) => {
      const id = (s || '').toLowerCase();
      return (
        id.includes('googlequicksearchbox') ||
        id.includes('recognition') ||
        id.includes('voice') ||
        id.includes('speech') ||
        id.includes('bixby') ||
        id.includes('assistant') ||
        id.includes('search')
      );
    });

    if (!isAvailable) {
      console.warn(
        '[ERAGS STT] Voice.isAvailable() returned falsy — will attempt start() as a fallback',
      );
    }

    if (!hasRecognizerService) {
      console.warn(
        '[ERAGS STT] no recognizer service detected via getSpeechRecognitionServices(), will attempt start() anyway',
      );
    }

    const startOptions: Record<string, string | number | boolean> = {
      EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
      EXTRA_MAX_RESULTS: 5,
      EXTRA_PARTIAL_RESULTS: true,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3500,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3500,
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
      let partialFallbackId: ReturnType<typeof setTimeout> | null = null;
      let lastText = '';

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (partialFallbackId) {
          clearTimeout(partialFallbackId);
        }

        Voice.removeAllListeners();
        Voice.cancel().catch(() => undefined);
      };

      const schedulePartialFallback = () => {
        if (partialFallbackId) {
          clearTimeout(partialFallbackId);
        }

        partialFallbackId = setTimeout(() => {
          if (lastText) {
            console.log('[ERAGS STT] using delayed partial fallback:', lastText);
            finish(lastText);
          }
        }, 1200);
      };

      const finish = (text: string) => {
        if (resolved) {
          console.log('[ERAGS STT] finish ignored after resolve:', text);
          return;
        }

        console.log('[ERAGS STT] resolved text:', text);
        resolved = true;
        resolve(text);
        cleanup();
      };

      const fail = (error?: SpeechErrorEvent) => {
        if (resolved) {
          return;
        }

        // If recognizer reports `7/No match`, resolve with empty string
        // so callers can handle 'no transcription' gracefully instead of
        // entering an error state.
        const code = (error as any)?.error?.code?.toString?.();
        if (code === '7' || code === '7/No match') {
          console.warn('[ERAGS STT] recognizer returned No match; resolving empty string');
          finish('');
          return;
        }

        if (lastText) {
          console.warn('[ERAGS STT] error after partial result; using fallback:', lastText);
          finish(lastText);
          return;
        }

        resolved = true;
        const message =
          (error as any)?.error?.message ?? (error as any)?.error?.code ?? 'On-device STT failed';
        console.warn('[ERAGS STT] failing transcribe promise:', message, error);
        reject(new Error(String(message)));
        cleanup();
      };

      Voice.onSpeechStart = event => {
        console.log('[ERAGS STT] speech started:', event);
      };
      Voice.onSpeechEnd = event => {
        console.log('[ERAGS STT] speech ended:', event);
        if (lastText) {
          schedulePartialFallback();
        }
      };
      Voice.onSpeechResults = (event: SpeechResultsEvent) => {
        console.log('[ERAGS STT] final results:', event.value);
        const text = this.pickBestSpeechText(event.value);
        if (text) {
          lastText = text;
          finish(text);
          return;
        }

        if (lastText) {
          console.log('[ERAGS STT] using partial result fallback:', lastText);
          finish(lastText);
        }
      };
      Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
        console.log('[ERAGS STT] partial results:', event.value);
        const partialText = this.pickBestSpeechText(event.value);
        if (partialText && partialText.trim().length > 0) {
          lastText = partialText;
          if (this.hasEmergencyKeyword(partialText)) {
            console.log('[ERAGS STT] scheduling emergency partial result:', partialText);
            partialFallbackId = setTimeout(() => {
              if (lastText) {
                console.log('[ERAGS STT] using emergency partial result:', lastText);
                finish(lastText);
              }
            }, this.emergencyPartialDelayMs);
            return;
          }

          schedulePartialFallback();
        }
      };
      Voice.onSpeechError = error => {
        console.warn('[ERAGS STT] speech error:', error);
        fail(error);
      };

      Voice.start('ko-KR', startOptions).catch(error => {
        console.warn('[ERAGS STT] start failed:', error);
        fail(error as SpeechErrorEvent);
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
  triage?: VoiceTriageService;
} {
  const { ml, inventory } = createDefaultPorts();
  const stt = new OnDeviceSttService();
  console.log('[ERAGS TRIAGE] provider: gemini');
  console.log('[ERAGS TRIAGE] Gemini key configured:', Boolean(Config.GEMINI_API_KEY));

  const triage = Config.GEMINI_API_KEY
    ? new GeminiVoiceTriageService(Config.GEMINI_API_KEY)
    : undefined;

  return { ml, inventory, stt, triage };
}
