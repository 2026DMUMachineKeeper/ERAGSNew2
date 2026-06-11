// 라이브러리 호출 코드
// STT, Gemini 음성 추론, DB/재고, ML 세션 생성을 중간에서 연결해줌

import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice'; // 라이브러리 호출 STT 코드
import Config from 'react-native-config';
import type {
  AccidentClassification,
  AccidentType,
  AirwayObstructionState,
  BleedingLevel,
  BurnDegree,
  Consciousness,
  EmergencyMlInput,
  FracturePattern,
  InputType,
  PatientContext,
  RashType,
  RedFlagSignal,
  TemperatureBand,
} from './types';

export type SttService = {
  transcribe(audioUri?: string): Promise<string>;
};

export type VoiceTriageResult = {
  // 나중에 AI 분류 꽂을 타입 추가
  accident: AccidentClassification;
  patientContext: PatientContext;
};

export type VoiceTriageService = {
  classify(
    text: string,
    patientContext: PatientContext,
  ): Promise<VoiceTriageResult | null>;
};

export type MlInputSender = {
  submit(input: EmergencyMlInput): Promise<void>;
};

class ConfigurableMlInputSender implements MlInputSender {
  constructor(
    private readonly endpoint: string | undefined = Config.ML_INPUT_API_URL,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async submit(input: EmergencyMlInput): Promise<void> {
    if (!this.endpoint) {
      console.log(
        '[ERAGS ML INPUT] submit skipped; ML_INPUT_API_URL is not configured',
        input,
      );
      return;
    }

    const response = await this.fetcher(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ML input submit failed: ${response.status} ${body}`);
    }
  }
}

type AiTriagePayload = {
  accidentType: AccidentType | 'UNKNOWN';
  bleedingLevel?: BleedingLevel;
  burnDegree?: BurnDegree;
  fracturePattern?: FracturePattern;
  temperatureC?: number;
  temperatureBand?: TemperatureBand;
  rashType?: RashType;
  airwayObstructionState?: AirwayObstructionState;
  consciousness?: Consciousness;
  ageGroup?: PatientContext['ageGroup'];
  redFlagSignals?: RedFlagSignal[];
  confidence: number;
};

const GEMINI_TRIAGE_MODEL =
  Config.GEMINI_TRIAGE_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TRIAGE_MODEL}:generateContent`;

const accidentTypes: AccidentType[] = [
  'BLEEDING',
  'BURN',
  'FRACTURE_BRUISE',
  'FEVER',
  'SKIN_RASH',
  'AIRWAY_OBSTRUCTION',
  'FRACTURE',
  'CPR',
];
const bleedingLevels: BleedingLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
const burnDegrees: BurnDegree[] = ['FIRST', 'SECOND', 'THIRD', 'UNKNOWN'];
const fracturePatterns: FracturePattern[] = [
  'SIMPLE_CLOSED',
  'OPEN',
  'COMPLETE',
  'COMMINUTED',
  'UNKNOWN',
];
const temperatureBands: TemperatureBand[] = [
  'UNDER_37_9',
  '38_0_TO_38_9',
  '39_PLUS',
];
const rashTypes: RashType[] = [
  'MACULAR',
  'VESICULAR',
  'ERYTHEMATOUS',
  'URTICARIAL',
  'UNKNOWN',
];
const airwayObstructionStates: AirwayObstructionState[] = [
  'PARTIAL',
  'COMPLETE_CONSCIOUS',
  'UNCONSCIOUS',
  'UNKNOWN',
];
const consciousnessValues: Consciousness[] = [
  'CONSCIOUS',
  'UNCONSCIOUS',
  'UNKNOWN',
];
const ageGroups: PatientContext['ageGroup'][] = ['CHILD', 'ADULT', 'ELDERLY'];
const redFlagSignals: RedFlagSignal[] = [
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

const parseGeminiResponseText = (payload: any): string | null => {
  const textPart = payload?.candidates?.[0]?.content?.parts?.find(
    (part: any) => typeof part?.text === 'string',
  );

  return typeof textPart?.text === 'string' ? textPart.text : null;
};

const bleedingSeverityPrompt = [
  'Bleeding severity rules are important. Do not simply copy currentPatientContext. Re-evaluate from the transcript.',
  'For BLEEDING, set bleedingLevel to HIGH when Korean speech says or strongly implies heavy bleeding.',
  'HIGH examples: "피가 많이 나요", "피 많이 나요", "피가 계속 나요", "피가 안 멈춰요", "출혈이 심해요", "피가 쏟아져요", "분수처럼 나요", "옷이 젖었어요".',
  'MEDIUM is for ongoing or noticeable bleeding without heavy/severe wording.',
  'LOW is only for small/light/minor bleeding such as "조금 나요", "살짝 나요", "긁혔어요".',
  'If transcript is "피가 많이나요" or "피가 많이 나요", accidentType must be BLEEDING and bleedingLevel must be HIGH.',
].join('\n');

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
      burnDegree: result.burnDegree ?? patientContext.burnDegree,
      fracturePattern: result.fracturePattern ?? patientContext.fracturePattern,
      temperatureC: result.temperatureC ?? patientContext.temperatureC,
      temperatureBand: result.temperatureBand ?? patientContext.temperatureBand,
      rashType: result.rashType ?? patientContext.rashType,
      airwayObstructionState:
        result.airwayObstructionState ?? patientContext.airwayObstructionState,
      consciousness: result.consciousness ?? patientContext.consciousness,
      ageGroup: result.ageGroup ?? patientContext.ageGroup,
      redFlagSignals: [
        ...new Set([
          ...(patientContext.redFlagSignals ?? []),
          ...(result.redFlagSignals ?? []),
        ]),
      ],
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
                  bleedingSeverityPrompt,
                  JSON.stringify({
                    transcript: text,
                    currentPatientContext: patientContext,
                    accidentTypes,
                    bleedingLevels,
                    burnDegrees,
                    fracturePatterns,
                    temperatureBands,
                    rashTypes,
                    airwayObstructionStates,
                    consciousnessValues,
                    ageGroups,
                    redFlagSignals,
                    schema: {
                      accidentType: [...accidentTypes, 'UNKNOWN'],
                      bleedingLevel: bleedingLevels,
                      burnDegree: burnDegrees,
                      fracturePattern: fracturePatterns,
                      temperatureC: 'number in Celsius when stated',
                      temperatureBand: temperatureBands,
                      rashType: rashTypes,
                      airwayObstructionState: airwayObstructionStates,
                      consciousness: consciousnessValues,
                      ageGroup: ageGroups,
                      redFlagSignals,
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
              burnDegree: {
                type: 'STRING',
                enum: burnDegrees,
              },
              fracturePattern: {
                type: 'STRING',
                enum: fracturePatterns,
              },
              temperatureC: {
                type: 'NUMBER',
              },
              temperatureBand: {
                type: 'STRING',
                enum: temperatureBands,
              },
              rashType: {
                type: 'STRING',
                enum: rashTypes,
              },
              airwayObstructionState: {
                type: 'STRING',
                enum: airwayObstructionStates,
              },
              consciousness: {
                type: 'STRING',
                enum: consciousnessValues,
              },
              ageGroup: {
                type: 'STRING',
                enum: ageGroups,
              },
              redFlagSignals: {
                type: 'ARRAY',
                items: {
                  type: 'STRING',
                  enum: redFlagSignals,
                },
              },
              confidence: {
                type: 'NUMBER',
              },
            },
            required: [
              'accidentType',
              'bleedingLevel',
              'consciousness',
              'redFlagSignals',
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
      candidates.find(value => this.hasEmergencyKeyword(value)) ?? candidates[0]
    );
  }

  private hasEmergencyKeyword(value: string): boolean {
    return /출혈|피|피가|피나|상처|베였|베임|찢|화상|골절|부러|뼈|심폐|호흡|숨|의식/.test(
      value,
    );
  }

  private async resetRecognizer(): Promise<void> {
    Voice.removeAllListeners();
    await Voice.cancel().catch(() => undefined);
    await Voice.destroy().catch(() => undefined);
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
      throw new Error(
        'File-based transcription is not supported on this device',
      );
    }

    await this.resetRecognizer();

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
        Voice.cancel()
          .catch(() => undefined)
          .finally(() => {
            Voice.destroy().catch(() => undefined);
          });
      };

      const schedulePartialFallback = () => {
        if (partialFallbackId) {
          clearTimeout(partialFallbackId);
        }

        partialFallbackId = setTimeout(() => {
          if (lastText) {
            console.log(
              '[ERAGS STT] using delayed partial fallback:',
              lastText,
            );
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
          console.warn(
            '[ERAGS STT] recognizer returned No match; resolving empty string',
          );
          finish('');
          return;
        }

        if (lastText) {
          console.warn(
            '[ERAGS STT] error after partial result; using fallback:',
            lastText,
          );
          finish(lastText);
          return;
        }

        resolved = true;
        const message =
          (error as any)?.error?.message ??
          (error as any)?.error?.code ??
          'On-device STT failed';
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
            console.log(
              '[ERAGS STT] scheduling emergency partial result:',
              partialText,
            );
            if (partialFallbackId) {
              clearTimeout(partialFallbackId);
            }
            partialFallbackId = setTimeout(() => {
              if (lastText) {
                console.log(
                  '[ERAGS STT] using emergency partial result:',
                  lastText,
                );
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

export function createDefaultEmergencyTriagePorts(): {
  stt: SttService;
  triage?: VoiceTriageService;
  mlInputSender: MlInputSender;
} {
  const stt = new OnDeviceSttService();
  const mlInputSender = new ConfigurableMlInputSender();
  console.log('[ERAGS TRIAGE] provider: gemini');
  console.log(
    '[ERAGS TRIAGE] Gemini key configured:',
    Boolean(Config.GEMINI_API_KEY),
  );

  const triage = Config.GEMINI_API_KEY
    ? new GeminiVoiceTriageService(Config.GEMINI_API_KEY)
    : undefined;

  return { stt, triage, mlInputSender };
}

export default createDefaultEmergencyTriagePorts;
