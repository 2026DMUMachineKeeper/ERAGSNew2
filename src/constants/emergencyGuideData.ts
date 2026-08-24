export type EmergencySubtypeKey = 'mild' | 'moderate' | 'severe' | 'default';

export type EmergencyGuideStep = {
  id: string;
  title: string;
  description: string;
};

export interface EmergencyGuideRuntimeStep {
  stepNo: number;
  title: string;
  instruction: string;
  checkpointQuestion: string;
  requiredItemId: number | null;
  requiredItemName: string | null;
  requiredQuantity: number;
  requiredSlotId: number | null;
  imageResource: string;
}

export const emergencyGuideSteps: EmergencyGuideStep[] = [
  {
    id: 'step-1',
    title: '1단계: 환자 상태 확인',
    description:
      '의식이 있는지, 호흡은 정상인지, 통증이 어느 정도인지 빠르게 확인하세요.',
  },
  {
    id: 'step-2',
    title: '2단계: 위험 요소 제거',
    description:
      '주변의 위험한 물건을 치우고, 환자가 더 다치지 않도록 안전한 환경을 만드세요.',
  },
  {
    id: 'step-3',
    title: '3단계: 기본 응급처치',
    description:
      '상태에 맞게 냉각, 압박, 고정, 안정을 유지하는 기본 응급처치를 진행하세요.',
  },
  {
    id: 'step-4',
    title: '4단계: 응급 도움 요청',
    description:
      '증상이 심하거나 악화되면 즉시 119에 신고하고 의료진의 도움을 받으세요.',
  },
];

export const emergencyGuideStepCountBySubtype: Record<
  EmergencySubtypeKey,
  number
> = {
  mild: 2,
  moderate: 3,
  severe: 4,
  default: 4,
};

export function getEmergencySubtypeKey(label?: string): EmergencySubtypeKey {
  if (!label) {
    return 'default';
  }

  if (label.includes('경미한')) {
    return 'mild';
  }

  if (label.includes('중간')) {
    return 'moderate';
  }

  if (label.includes('심한')) {
    return 'severe';
  }

  return 'default';
}
