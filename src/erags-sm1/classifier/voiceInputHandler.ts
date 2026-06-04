// 음성 인식으로 나온 텍스트를 사고 유형으로 판단하는 파일
// 음성 -> STT -> "텍스트" -> voiceInputHandler.ts -> BLEEDING /.. /.. 중 하나로 분류 -> 상태머신 start

import type {
  AccidentClassification,
  AccidentType,
  BleedingLevel,
} from '../machine/types';

const MIN_SCORE = 1.5;

// Weighted keyword list for simple on-device classification. We keep weights
// to prefer stronger signals (e.g., '피' vs '출혈') and allow extension.
const weightedKeywords: Record<AccidentType, Array<{ k: string; w: number }>> = {
  BLEEDING: [
    { k: '출혈', w: 2 },
    { k: '피', w: 1.5 },
    { k: '피나요', w: 2 },
    { k: '피가', w: 1.5 },
    { k: '피가 많이', w: 2.4 },
    { k: '피 많이', w: 2.4 },
    { k: '많이 나', w: 1.8 },
    { k: '상처', w: 1.6 },
    { k: '상처가', w: 1.8 },
    { k: '다쳤', w: 1.6 },
    { k: '베였', w: 1.2 },
    { k: '베임', w: 1.2 },
    { k: '찢어', w: 1.3 },
    { k: '찢김', w: 1.3 },
    { k: 'bleed', w: 1.5 },
    { k: 'bleeding', w: 1.5 },
  ],
  BURN: [
    { k: '화상', w: 2 },
    { k: '데었', w: 1.5 },
    { k: '데인', w: 1.5 },
    { k: '탔', w: 1.2 },
    { k: 'burn', w: 1.5 },
  ],
  FRACTURE: [
    { k: '골절', w: 2 },
    { k: '부러', w: 1.8 },
    { k: '뼈', w: 1.2 },
    { k: 'fracture', w: 1.5 },
    { k: 'broken', w: 1.5 },
  ],
  CPR: [
    { k: '심폐', w: 2 },
    { k: 'cpr', w: 2 },
    { k: '호흡 안', w: 2 },
    { k: '숨 안', w: 2 },
    { k: '의식 없', w: 2 },
    { k: '쓰러졌', w: 1.8 },
  ],
};

const NEGATIONS = ['아니', '안', '없', '아닌'];

const bleedingLevelKeywords: Record<
  BleedingLevel,
  Array<{ k: string; w: number }>
> = {
  LOW: [
    { k: '경미', w: 2 },
    { k: '약간', w: 1.5 },
    { k: '조금', w: 1.5 },
    { k: '살짝', w: 1.5 },
    { k: '소량', w: 1.5 },
    { k: '피 조금', w: 2 },
    { k: '피가 조금', w: 2 },
  ],
  MEDIUM: [
    { k: '일반', w: 2 },
    { k: '보통', w: 1.5 },
    { k: '중간', w: 1.5 },
    { k: '계속 피', w: 1.5 },
    { k: '출혈이 있어', w: 1.5 },
  ],
  HIGH: [
    { k: '대량', w: 2.5 },
    { k: '심한', w: 2 },
    { k: '심하게', w: 2 },
    { k: '많이', w: 1.8 },
    { k: '피 많이', w: 2 },
    { k: '피가 많이', w: 2 },
    { k: '멈추지', w: 2 },
    { k: '분출', w: 2.5 },
    { k: '쏟아', w: 2.2 },
  ],
};

export const inferBleedingLevel = ( // 출혈 레벨 키워드 추론
  text: string,
): BleedingLevel | undefined => {
  const clean = text.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!clean) return undefined;

  const scores: Record<BleedingLevel, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  };

  for (const level of Object.keys(bleedingLevelKeywords) as BleedingLevel[]) {
    for (const { k, w } of bleedingLevelKeywords[level]) {
      if (clean.includes(k)) {
        scores[level] += w;
      }
    }
  }

  const entries = Object.entries(scores) as [BleedingLevel, number][];
  entries.sort((a, b) => b[1] - a[1]);

  return entries[0][1] > 0 ? entries[0][0] : undefined;
};

export const classifyVoice = (text: string): AccidentClassification | null => {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  // simple normalization: collapse whitespace
  const clean = normalized.replace(/\s+/g, ' ');

  // detect negation anywhere in text (naive but effective for short phrases)
  const hasNegation = NEGATIONS.some(n => clean.includes(n));

  // Score each accident type by summing matched keyword weights
  const scores: Record<AccidentType, number> = {
    BLEEDING: 0,
    BURN: 0,
    FRACTURE: 0,
    CPR: 0,
  };

  for (const type of Object.keys(weightedKeywords) as AccidentType[]) {
    for (const { k, w } of weightedKeywords[type]) {
      if (clean.includes(k)) {
        scores[type] += hasNegation ? w * 0.4 : w;
      }
    }
  }

  // Determine best match
  const entries = Object.entries(scores) as [AccidentType, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [bestType, bestScore] = entries[0];
  const secondScore = entries[1]?.[1] ?? 0;

  if (bestScore < MIN_SCORE) return null;

  // confidence: how dominant best is vs others
  let confidence = bestScore / (bestScore + secondScore + 0.0001);
  // scale towards >0.6 for reasonable dominance
  confidence = Math.min(0.99, Math.max(0.5, confidence));

  return {
    type: bestType,
    confidence: Math.round(confidence * 100) / 100,
    rawInputType: 'VOICE',
  };
};
