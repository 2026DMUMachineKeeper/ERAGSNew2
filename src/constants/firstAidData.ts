import type { CompoundCategoryCode } from '@/types/emergencyGuide.types';

export type EmergencyCategoryId =
  | 'bleeding'
  | 'burn'
  | 'fractureBruise'
  | 'fever'
  | 'skinRash'
  | 'airwayObstruction';

export const SERVER_SYMPTOM_ID_BY_CATEGORY: Record<EmergencyCategoryId, CompoundCategoryCode> = {
  bleeding: 'BLEEDING',
  burn: 'BURN',
  fractureBruise: 'FRACTURE_BRUISE',
  fever: 'FEVER_NEUROLOGIC',
  skinRash: 'ALLERGY_RASH',
  airwayObstruction: 'AIRWAY_OBSTRUCTION',
};

export interface FirstAidCategory {
  id: EmergencyCategoryId;
  label: string;
  subtypes: readonly string[];
}

export const FIRST_AID_CATEGORIES: readonly FirstAidCategory[] = [
  { id: 'bleeding', label: '출혈', subtypes: ['경미', '일반', '과다'] },
  { id: 'burn', label: '화상', subtypes: ['1도', '2도', '3도'] },
  {
    id: 'fractureBruise',
    label: '골절/타박상',
    subtypes: ['단순 폐쇄성', '개방성', '완전', '분쇄'],
  },
  { id: 'fever', label: '발열', subtypes: ['~37.9', '~38.9', '39~'] },
  {
    id: 'skinRash',
    label: '피부 발진',
    subtypes: ['반점형', '수포성', '홍반성', '두드러기'],
  },
  { id: 'airwayObstruction', label: '기도 폐쇄', subtypes: [] },
];
