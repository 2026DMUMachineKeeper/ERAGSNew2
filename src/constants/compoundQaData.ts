import type { QaFactId } from '@/types/compoundQuestionnaire.types';

// QA main의 질문 문구와 순서를 그대로 사용합니다.
export const QA_FACT_IDS = [
  'SURFACES_OVERLAP',
  'SEVERE_SWELLING',
  'CAN_SWALLOW',
  'PRESSURE_REQUIRED',
  'HELPER_AVAILABLE',
  'CLEAN_WATER_AVAILABLE',
  'CLEAN_CLOTH_AVAILABLE',
  'COOLING_TOOL_AVAILABLE',
  'SPLINT_AVAILABLE',
  'THERMAL_CAUSE',
  'BLEEDING_STOPPED',
  'SMALL_SUPERFICIAL_WOUND',
  'LIMB_ONLY',
  'BRUISE_SKIN_INTACT',
  'COMPRESSION_FEASIBLE',
  'ELEVATION_FEASIBLE',
  'KNOWN_CONTACT_EXPOSURE',
  'HAZARDOUS_CONTACT',
  'SYMPTOMS_WORSENING',
  'EFFECTIVE_COUGH_PRESENT',
  'MOUTH_VISIBLE_OBJECT',
  'AIRWAY_OBSERVER_PRESENT',
  'BURN_COOLING_COMPLETED',
  'BURN_CAN_REMAIN_CLEAN',
  'FOREIGN_BODY_EPISODE_CONFIRMED',
  'ALLERGIC_AIRWAY_SIGNS',
  'SPLINT_TRAINED_HELPER',
  'SAFE_IMMEDIATE_TRANSPORT_AVAILABLE',
  'CONTACT_EXPOSURE_ENDED',
  'RASH_OBSERVER_PRESENT',
  'WOUND_BITE',
  'WOUND_CONTAMINATION',
  'WOUND_INFECTION_SIGNS',
  'INDEPENDENT_CARE_POSSIBLE',
  'CLEAN_COLD_DAMP_CLOTH_PREPARED',
  'CLEAN_COLD_DAMP_CLOTH_CHOSEN',
  'RASH_SKIN_INTACT',
  'RASH_INFECTION_SYSTEMIC_SIGNS',
  'SUDDEN_LIP_MOUTH_SWELLING',
  'NORMAL_BREATHING_CONFIRMED',
  'NORMAL_SWALLOWING_CONFIRMED',
  'ADRENALINE_AUTOINJECTOR_ACCESSIBLE',
  'NON_PREGNANT_CONFIRMED',
  'SAFE_SUPINE_LEG_ELEVATION',
  'ACTIVE_ALLERGEN_EXPOSURE',
  'STINGER_REMAINS',
  'MEASURED_HIGH_FEVER',
  'SEVERE_BREATHING_DISTRESS',
  'HEATSTROKE_CONTEXT',
  'AIRWAY_OBSTRUCTION_SUSPECTED',
  'CURRENT_CONVULSIONS',
  'EMERGENCY_OBSERVER_PRESENT',
] as const;
export const QA_FACT_QUESTIONS: ReadonlyArray<{
  id: QaFactId;
  prompt: string;
}> = [
  { id: 'SURFACES_OVERLAP', prompt: '두 손상의 상처 표면이 서로 겹치나요?' },
  { id: 'SEVERE_SWELLING', prompt: '다친 부위에 심한 부기가 있나요?' },
  { id: 'CAN_SWALLOW', prompt: '환자가 물을 삼킬 수 있나요?' },
  { id: 'PRESSURE_REQUIRED', prompt: '현재 출혈 부위를 계속 압박해야 하나요?' },
  { id: 'HELPER_AVAILABLE', prompt: '두 손상 처치를 함께 도울 사람이 있나요?' },
  { id: 'CLEAN_WATER_AVAILABLE', prompt: '사용할 수 있는 깨끗한 물이 있나요?' },
  { id: 'CLEAN_CLOTH_AVAILABLE', prompt: '사용할 수 있는 깨끗한 천이 있나요?' },
  {
    id: 'COOLING_TOOL_AVAILABLE',
    prompt: '사용할 수 있는 냉찜질 도구가 있나요?',
  },
  { id: 'SPLINT_AVAILABLE', prompt: '사용할 수 있는 부목이 있나요?' },
  { id: 'THERMAL_CAUSE', prompt: '열이나 뜨거운 물체로 생긴 화상인가요?' },
  {
    id: 'BLEEDING_STOPPED',
    prompt:
      '현재 상처에서 피가 더 이상 나오지 않고 멎어 있나요? 계속 압박할 필요가 있는지와는 별도로 확인해 주세요.',
  },
  {
    id: 'SMALL_SUPERFICIAL_WOUND',
    prompt: '상처가 작고 피부 표면에만 얕게 있나요?',
  },
  {
    id: 'WOUND_BITE',
    prompt:
      '이 상처는 사람이나 동물에게 물려서 생겼나요? 벌레 물림과는 구분하며, 원인을 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'WOUND_CONTAMINATION',
    prompt:
      '상처에 흙·침 등 이물이나 체액이 남아 있거나, 씻은 뒤에도 더러움이 남아 있나요?',
  },
  {
    id: 'WOUND_INFECTION_SIGNS',
    prompt:
      '이 상처에서 고름이 나오거나, 붉게 부으면서 통증이 점점 심해지나요? 감염 여부를 진단하는 질문이 아니라 현재 보이는 상태를 확인합니다.',
  },
  { id: 'LIMB_ONLY', prompt: '이 손상은 팔이나 다리에만 있나요?' },
  {
    id: 'BRUISE_SKIN_INTACT',
    prompt: '멍이 든 부위의 피부가 찢어지거나 벗겨지지 않고 온전한가요?',
  },
  {
    id: 'COMPRESSION_FEASIBLE',
    prompt:
      '다른 손상 부위를 누르지 않고 멍이 든 부위만 붕대로 부드럽게 감싸 압박할 수 있나요?',
  },
  {
    id: 'ELEVATION_FEASIBLE',
    prompt:
      '통증이 생기거나 더 심해지지 않고, 다른 손상 부위를 움직이지 않으면서 멍이 든 팔이나 다리를 심장보다 높게 올려 둘 수 있나요?',
  },
  {
    id: 'KNOWN_CONTACT_EXPOSURE',
    prompt: '발진이 난 부위에 닿은 물질이나 제품을 직접 확인했나요?',
  },
  {
    id: 'HAZARDOUS_CONTACT',
    prompt:
      '발진이 난 부위에 닿은 물질이 강한 산·알칼리 등 위험한 화학물질인가요?',
  },
  {
    id: 'SYMPTOMS_WORSENING',
    prompt: '이 손상의 증상이 현재 더 심해지고 있나요?',
  },
  {
    id: 'EFFECTIVE_COUGH_PRESENT',
    prompt:
      '환자가 현재 실제로 강하고 효과적인 기침을 하고 있나요? 말할 수 있다는 것만으로 답하지 마세요.',
  },
  {
    id: 'MOUTH_VISIBLE_OBJECT',
    prompt:
      '입을 억지로 벌리거나 안쪽을 살피지 않아도 자연스럽게 보이는 입 안의 물체가 있나요? 확인하려고 손가락이나 도구를 넣지 말고, 자연스럽게 보이는 범위만으로 답하고 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'AIRWAY_OBSERVER_PRESENT',
    prompt:
      '환자의 기침과 호흡 상태를 지금부터 계속 직접 지켜볼 사람이 실제로 곁에 있나요?',
  },
  {
    id: 'BURN_COOLING_COMPLETED',
    prompt:
      '화상 부위를 깨끗하고 차가운 흐르는 물로 10~15분 식히는 냉각을 이미 끝냈나요? 이 답변은 냉각만 확인하며 연고·거즈 등 다른 처치의 완료를 뜻하지 않습니다.',
  },
  {
    id: 'BURN_CAN_REMAIN_CLEAN',
    prompt:
      '다른 손상을 처치하는 동안 화상 부위가 쓸리거나 오염되지 않도록 깨끗한 상태로 둘 수 있나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'FOREIGN_BODY_EPISODE_CONFIRMED',
    prompt:
      '음식이나 물체가 목에 걸리면서 증상이 시작된 상황을 직접 보거나 확인했나요?',
  },
  {
    id: 'ALLERGIC_AIRWAY_SIGNS',
    prompt:
      '발진과 함께 얼굴·입술·혀·목의 붓기, 쌕쌕거림, 숨쉬기 어려움, 목이 조이는 느낌, 삼키기 어려움, 쉰 목소리, 실신할 듯한 느낌 또는 혼란이 나타나나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'SPLINT_TRAINED_HELPER',
    prompt: '부목으로 고정하는 방법을 교육받은 보조자가 지금 도울 수 있나요?',
  },
  {
    id: 'SAFE_IMMEDIATE_TRANSPORT_AVAILABLE',
    prompt:
      '훈련된 보조자의 도움을 받아 다친 부위를 흔들거나 다친 다리를 딛지 않고, 환자가 직접 운전하지 않은 채 지금 병원으로 이동할 수 있나요?',
  },
  {
    id: 'CONTACT_EXPOSURE_ENDED',
    prompt:
      '발진 부위에 자극을 줄 수 있는 물질이 닿고 있었다면, 실제로 치워서 현재 접촉이 끝났나요? 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'RASH_OBSERVER_PRESENT',
    prompt:
      '다른 손상을 처치하는 동안 이 발진 부위를 직접 보며 계속 지켜볼 사람이 실제로 곁에 있나요?',
  },
  {
    id: 'CLEAN_COLD_DAMP_CLOTH_PREPARED',
    prompt:
      '이 발진 부위에 댈 깨끗한 찬물에 적신 천이나 수건을 실제로 준비했나요? 냉찜질 도구가 있다는 것만으로 답하지 마세요.',
  },
  {
    id: 'CLEAN_COLD_DAMP_CLOTH_CHOSEN',
    prompt:
      '이 발진에는 준비한 깨끗한 찬물에 적신 천이나 수건을 실제 사용할 방법으로 선택했나요? 얼음이나 다른 냉찜질 도구를 선택했다면 아니요를 선택해 주세요.',
  },
  {
    id: 'RASH_SKIN_INTACT',
    prompt:
      '이 발진 부위의 피부가 갈라지거나 벗겨지거나 열린 상처 없이 온전한가요?',
  },
  {
    id: 'RASH_INFECTION_SYSTEMIC_SIGNS',
    prompt:
      '이 발진 부위에서 진물·고름이 나오거나, 통증이 점점 심해지거나, 붉은 부위가 퍼지거나, 열이 나는 느낌·오한 또는 전반적으로 몸이 좋지 않은 증상이 있나요? 감염을 진단하는 질문이 아니라 현재 상태를 확인합니다. 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'INDEPENDENT_CARE_POSSIBLE',
    prompt:
      '두 손상이 서로 다른 부위라는 것과 별도로, 이 손상 부위를 씻거나 드레싱하거나 자세를 잡는 동안 다른 손상 부위 또는 그 드레싱을 적시거나 건드리거나 움직이지 않을 수 있나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요. 이 답변은 동시 처치가 가능하다는 뜻이 아닙니다.',
  },
  {
    id: 'SUDDEN_LIP_MOUTH_SWELLING',
    prompt: '입술이나 입 안의 부종이 갑자기 시작된 것을 직접 확인했나요?',
  },
  {
    id: 'NORMAL_BREATHING_CONFIRMED',
    prompt:
      '환자가 현재 평소처럼 정상적으로 숨 쉬는 것을 직접 확인했나요? 숨쉬기 어렵거나 확인하기 어려우면 예를 선택하지 마세요.',
  },
  {
    id: 'NORMAL_SWALLOWING_CONFIRMED',
    prompt:
      '환자가 현재 평소처럼 정상적으로 삼키는 것을 직접 확인했나요? 확인하려고 물이나 음식을 먹이지 마세요.',
  },
  {
    id: 'ADRENALINE_AUTOINJECTOR_ACCESSIBLE',
    prompt:
      '구급함 안팎을 포함해 지금 사용할 수 있는 아드레날린(에피네프린) 자동주사기가 있나요? 에피펜뿐 아니라 모든 브랜드와 환자·보조자 소지품을 포함합니다. 접근 여부를 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'NON_PREGNANT_CONFIRMED',
    prompt:
      '환자가 임신 중이 아님을 직접 확인했나요? 성별이나 외모만으로 판단하지 말고, 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'SAFE_SUPINE_LEG_ELEVATION',
    prompt:
      '다른 손상이나 호흡 불편을 악화시키지 않고 환자를 바로 눕혀 다리를 심장보다 높게 올릴 수 있음을 직접 확인했나요? 확인하려고 환자를 움직이지 마세요.',
  },
  {
    id: 'ACTIVE_ALLERGEN_EXPOSURE',
    prompt:
      '현재 알레르기 반응을 일으켰을 수 있는 물질에 계속 노출되고 있나요? 접촉이 끝났는지 직접 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'STINGER_REMAINS',
    prompt:
      '피부에 벌침 등 곤충의 침이 남아 있는 것이 보이나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'MEASURED_HIGH_FEVER',
    prompt:
      '체온계로 실제 측정한 현재 체온이 39도 이상인가요? 열감만 있거나 측정값을 확인하지 못했다면 예를 선택하지 마세요.',
  },
  {
    id: 'SEVERE_BREATHING_DISTRESS',
    prompt:
      '환자에게 현재 심한 호흡 곤란이 나타나는 것을 직접 확인했나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'HEATSTROKE_CONTEXT',
    prompt:
      '더운 환경이나 격한 활동 뒤 체온이 오르는 등 열사병을 의심할 상황이 있나요? 직접 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'AIRWAY_OBSTRUCTION_SUSPECTED',
    prompt:
      '음식이나 물체가 목에 걸리는 등 기도에 이물이 막힌 것으로 의심되는 상황이 있나요? 직접 확인하지 못했다면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'CURRENT_CONVULSIONS',
    prompt:
      '환자가 현재 경련하고 있나요? 직접 확인하기 어려우면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'EMERGENCY_OBSERVER_PRESENT',
    prompt:
      '119를 기다리는 동안 환자의 호흡과 의식 상태를 계속 직접 지켜볼 사람이 실제로 곁에 있나요?',
  },
];
export const fractureSkinFollowup = {
  question:
    '다친 부위 전체의 피부를 확인할 수 있나요? 열린 상처나 찢어진 곳이 있는지 확인해 주세요.',
  options: [
    {
      value: 'INTACT',
      label: '전체를 확인했고 피부가 온전함',
      observation: '다친 부위 전체의 피부가 온전합니다.',
    },
    {
      value: 'OPEN_WOUND',
      label: '열린 상처가 있음',
      observation: '다친 부위에 열린 상처가 있습니다.',
    },
    {
      value: 'UNKNOWN',
      label: '전체를 확인할 수 없거나 잘 모르겠음',
      observation: '다친 부위 전체의 피부 상태를 확인하지 못했습니다.',
    },
  ],
} as const;
