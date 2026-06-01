// 음성 인식으로 나온 텍스트를 사고 유형으로 판단하는 파일
// 마이스 음성 -> STT -> "텍스트" -> voiceInputHandler.ts -> BLEEDING /.. /.. 중 하나로 분류 -> 상태머신 start

import type { AccidentClassification, AccidentType } from '../machine/types';

const keywordMap: Record<AccidentType, string[]> = {
  BLEEDING: [
    '출혈',
    '피',
    '피나요',
    '피가',
    '상처',
    '베였',
    '베임',
    '찢어',
    '찢김',
    'bleed',
    'bleeding',
  ],
  BURN: ['화상', '데었', '데인', '탔', 'burn'],
  FRACTURE: ['골절', '부러', '뼈', 'fracture', 'broken'],
  CPR: ['심폐', 'cpr', '호흡 안', '숨 안', '의식 없', '쓰러졌'],
};

export const classifyVoice = (text: string): AccidentClassification | null => {
  const normalized = text.trim().toLowerCase();

  for (const [type, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => normalized.includes(keyword))) {
      return {
        type: type as AccidentType,
        confidence: 0.9,
        rawInputType: 'VOICE',
      };
    }
  }

  return null;
};
