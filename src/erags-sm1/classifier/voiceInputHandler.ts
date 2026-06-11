import type {
  AccidentClassification,
  AccidentType,
  BleedingLevel,
  BurnDegree,
  FracturePattern,
  PatientContext,
  RashType,
  RedFlagSignal,
  TemperatureBand,
} from '../types';

const MIN_SCORE = 1.5;

type WeightedKeyword = { k: string; w: number };

export interface SmInputDraft {
  accident: AccidentClassification;
  patientContextPatch: Partial<PatientContext>;
  missingFields: string[];
}

const accidentKeywords: Record<AccidentType, WeightedKeyword[]> = {
  BLEEDING: [
    { k: '출혈', w: 2 },
    { k: '피가', w: 1.8 },
    { k: '피나', w: 1.8 },
    { k: '상처', w: 1.4 },
    { k: '베였', w: 1.6 },
    { k: '찢어', w: 1.6 },
    { k: 'bleed', w: 1.5 },
    { k: 'bleeding', w: 1.5 },
  ],
  BURN: [
    { k: '화상', w: 2 },
    { k: '데였', w: 1.8 },
    { k: '뜨거', w: 1.2 },
    { k: '물집', w: 1.4 },
    { k: 'burn', w: 1.5 },
  ],
  FRACTURE_BRUISE: [
    { k: '골절', w: 2 },
    { k: '부러', w: 1.8 },
    { k: '삐었', w: 1.4 },
    { k: '멍', w: 1.2 },
    { k: '뼈', w: 1.5 },
    { k: 'fracture', w: 1.5 },
    { k: 'broken', w: 1.5 },
  ],
  FEVER: [
    { k: '발열', w: 2 },
    { k: '열이', w: 1.6 },
    { k: '체온', w: 1.8 },
    { k: '고열', w: 2 },
    { k: 'febrile', w: 1.5 },
    { k: 'fever', w: 1.5 },
  ],
  SKIN_RASH: [
    { k: '발진', w: 2 },
    { k: '두드러기', w: 2 },
    { k: '피부', w: 1.2 },
    { k: '반점', w: 1.4 },
    { k: '가려', w: 1.2 },
    { k: 'rash', w: 1.5 },
    { k: 'hives', w: 1.8 },
  ],
  AIRWAY_OBSTRUCTION: [
    { k: '기도', w: 2 },
    { k: '목에', w: 1.5 },
    { k: '걸렸', w: 1.6 },
    { k: '숨을 못', w: 2 },
    { k: '말을 못', w: 1.8 },
    { k: '기침을 못', w: 1.8 },
    { k: 'choking', w: 2 },
  ],
  FRACTURE: [
    { k: '골절', w: 2 },
    { k: '부러', w: 1.8 },
    { k: 'fracture', w: 1.5 },
  ],
  CPR: [
    { k: '심폐', w: 2 },
    { k: 'cpr', w: 2 },
    { k: '의식이 없어', w: 2 },
    { k: '숨을 안', w: 2 },
    { k: '심장', w: 1.5 },
  ],
};

const bleedingLevelKeywords: Record<BleedingLevel, WeightedKeyword[]> = {
  LOW: [
    { k: '조금', w: 1.5 },
    { k: '소량', w: 1.5 },
    { k: '살짝', w: 1.4 },
    { k: '경미', w: 1.5 },
  ],
  MEDIUM: [
    { k: '계속', w: 1.5 },
    { k: '중간', w: 1.4 },
    { k: '압박', w: 1.2 },
    { k: '멈추지', w: 1.5 },
  ],
  HIGH: [
    { k: '많이', w: 1.8 },
    { k: '분수', w: 2.5 },
    { k: '뿜', w: 2.2 },
    { k: '10분', w: 2 },
    { k: '깊게', w: 1.8 },
    { k: '절단', w: 2.5 },
  ],
};

const redFlagKeywords: Record<RedFlagSignal, string[]> = {
  UNCONTROLLED_BLEEDING: ['멈추지', '10분', '계속 피', '지혈 안'],
  SHOCK: ['쇼크', '창백', '식은땀', '어지러'],
  SPURTING_BLOOD: ['분수', '뿜'],
  DEEP_WOUND: ['깊게', '깊은 상처', '찢어'],
  AMPUTATION: ['절단', '잘렸'],
  EMBEDDED_OBJECT: ['박혔', '유리', '칼', '이물질'],
  AIRWAY_BURN: ['연기', '목이 부어', '숨쉬기 힘'],
  FACE_BURN: ['얼굴'],
  LARGE_AREA_BURN: ['넓게', '전신', '넓은'],
  CHEMICAL_BURN: ['화학', '약품'],
  ELECTRICAL_BURN: ['감전', '전기'],
  EXPOSED_BONE: ['뼈가 보여', '뼈 보여'],
  NEUROVASCULAR_SYMPTOM: ['감각이 없어', '피가 안 통'],
  CRUSH_INJURY: ['으스러', '깔렸', '압궤'],
  ALTERED_CONSCIOUSNESS: ['의식이 이상', '잘 못 깨', '의식이 없어'],
  RESPIRATORY_DISTRESS: ['숨쉬기 힘', '숨이 차', '숨을 못'],
  SEIZURE: ['경련', '발작'],
  SEVERE_DEHYDRATION: ['소변', '입이 바짝', '탈수'],
  HIGH_RISK_AGE: ['아이', '아기', '어르신', '노인'],
  NON_BLANCHING_RASH: ['눌러도 안 사라', '자반'],
  FACIAL_SWELLING: ['얼굴이 부어', '눈 주위'],
  LIP_SWELLING: ['입술이 부어', '입술 부'],
  WHEEZING: ['쌕쌕', '천명'],
  HOARSE_VOICE: ['목소리가 쉬', '쉰 목소리'],
  CANNOT_SPEAK: ['말을 못'],
  CANNOT_COUGH: ['기침을 못'],
  CANNOT_BREATHE: ['숨을 못', '숨 못'],
  CYANOSIS: ['파래', '청색증'],
};

const scoreKeywords = (text: string, keywords: WeightedKeyword[]) =>
  keywords.reduce((score, { k, w }) => score + (text.includes(k) ? w : 0), 0);

const unique = <T>(values: T[]): T[] => [...new Set(values)];

const detectRedFlags = (text: string): RedFlagSignal[] =>
  unique(
    (Object.keys(redFlagKeywords) as RedFlagSignal[]).filter(signal =>
      redFlagKeywords[signal].some(keyword => text.includes(keyword)),
    ),
  );

export const inferBleedingLevel = (text: string): BleedingLevel | undefined => {
  const clean = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return undefined;

  const entries = (Object.keys(bleedingLevelKeywords) as BleedingLevel[])
    .map(
      level =>
        [level, scoreKeywords(clean, bleedingLevelKeywords[level])] as const,
    )
    .sort((a, b) => b[1] - a[1]);

  return entries[0][1] > 0 ? entries[0][0] : undefined;
};

const inferBurnDegree = (text: string): BurnDegree | undefined => {
  if (text.includes('물집') || text.includes('수포')) return 'SECOND';
  if (
    text.includes('하얗') ||
    text.includes('검게') ||
    text.includes('감각이 없')
  ) {
    return 'THIRD';
  }
  if (text.includes('빨갛') || text.includes('따가') || text.includes('붉')) {
    return 'FIRST';
  }
  return undefined;
};

const inferFracturePattern = (text: string): FracturePattern | undefined => {
  if (
    text.includes('뼈가 보여') ||
    text.includes('개방') ||
    text.includes('피가')
  ) {
    return 'OPEN';
  }
  if (text.includes('완전히') || text.includes('꺾')) return 'COMPLETE';
  if (text.includes('으스러') || text.includes('분쇄')) return 'COMMINUTED';
  if (text.includes('삐었') || text.includes('멍') || text.includes('부러')) {
    return 'SIMPLE_CLOSED';
  }
  return undefined;
};

const inferRashType = (text: string): RashType | undefined => {
  if (text.includes('두드러기') || text.includes('부풀')) return 'URTICARIAL';
  if (text.includes('물집') || text.includes('수포')) return 'VESICULAR';
  if (text.includes('빨갛') || text.includes('홍반')) return 'ERYTHEMATOUS';
  if (text.includes('반점') || text.includes('점처럼')) return 'MACULAR';
  return undefined;
};

const inferTemperatureBand = (temperatureC: number): TemperatureBand => {
  if (temperatureC < 38) return 'UNDER_37_9';
  if (temperatureC < 39) return '38_0_TO_38_9';
  return '39_PLUS';
};

const parseTemperatureC = (text: string): number | undefined => {
  const match = text.match(/([3-4]\d(?:\.\d)?)\s*(?:도|c|℃)?/i);
  if (!match) return undefined;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
};

const inferAirwayState = (
  text: string,
): PatientContext['airwayObstructionState'] | undefined => {
  if (text.includes('의식이 없') || text.includes('쓰러')) return 'UNCONSCIOUS';
  if (
    text.includes('말을 못') ||
    text.includes('기침을 못') ||
    text.includes('숨을 못')
  ) {
    return 'COMPLETE_CONSCIOUS';
  }
  if (text.includes('기침') || text.includes('말은')) return 'PARTIAL';
  return undefined;
};

const detectAccident = (text: string): AccidentClassification | null => {
  const entries = (Object.keys(accidentKeywords) as AccidentType[])
    .map(type => [type, scoreKeywords(text, accidentKeywords[type])] as const)
    .sort((a, b) => b[1] - a[1]);

  const [bestType, bestScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;
  if (bestScore < MIN_SCORE) return null;

  const confidence = Math.min(
    0.99,
    Math.max(0.5, bestScore / (bestScore + secondScore + 0.0001)),
  );

  return {
    type: bestType === 'FRACTURE' ? 'FRACTURE_BRUISE' : bestType,
    confidence: Math.round(confidence * 100) / 100,
    rawInputType: 'VOICE',
  };
};

export const classifyVoiceToDraft = (text: string): SmInputDraft | null => {
  const clean = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return null;

  const accident = detectAccident(clean);
  if (!accident) return null;

  const patientContextPatch: Partial<PatientContext> = {};
  const missingFields: string[] = [];
  const redFlagSignals = detectRedFlags(clean);

  if (redFlagSignals.length) {
    patientContextPatch.redFlagSignals = redFlagSignals;
  }

  if (clean.includes('의식이 있') || clean.includes('깨어')) {
    patientContextPatch.consciousness = 'CONSCIOUS';
  } else if (clean.includes('의식이 없') || clean.includes('쓰러')) {
    patientContextPatch.consciousness = 'UNCONSCIOUS';
  }

  if (clean.includes('아이') || clean.includes('아기')) {
    patientContextPatch.ageGroup = 'CHILD';
  } else if (clean.includes('어르신') || clean.includes('노인')) {
    patientContextPatch.ageGroup = 'ELDERLY';
  }

  if (accident.type === 'BLEEDING') {
    const bleedingLevel = inferBleedingLevel(clean);
    if (bleedingLevel) patientContextPatch.bleedingLevel = bleedingLevel;
  }

  if (accident.type === 'BURN') {
    const burnDegree = inferBurnDegree(clean);
    if (burnDegree) patientContextPatch.burnDegree = burnDegree;
    else missingFields.push('burnDegree');
  }

  if (accident.type === 'FRACTURE_BRUISE') {
    const fracturePattern = inferFracturePattern(clean);
    if (fracturePattern) patientContextPatch.fracturePattern = fracturePattern;
    else missingFields.push('fracturePattern');
  }

  if (accident.type === 'FEVER') {
    const temperatureC = parseTemperatureC(clean);
    if (temperatureC !== undefined) {
      patientContextPatch.temperatureC = temperatureC;
      patientContextPatch.temperatureBand = inferTemperatureBand(temperatureC);
    } else if (
      clean.includes('고열') ||
      clean.includes('39도') ||
      clean.includes('40도')
    ) {
      patientContextPatch.temperatureBand = '39_PLUS';
    } else {
      missingFields.push('temperatureC');
    }
  }

  if (accident.type === 'SKIN_RASH') {
    const rashType = inferRashType(clean);
    if (rashType) patientContextPatch.rashType = rashType;
    else missingFields.push('rashType');
  }

  if (accident.type === 'AIRWAY_OBSTRUCTION') {
    patientContextPatch.airwayObstructionState =
      inferAirwayState(clean) ?? 'UNKNOWN';
  }

  return {
    accident,
    patientContextPatch,
    missingFields: unique(missingFields),
  };
};

export const classifyVoice = (text: string): AccidentClassification | null =>
  classifyVoiceToDraft(text)?.accident ?? null;
