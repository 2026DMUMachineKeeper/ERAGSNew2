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
  'BURN_MEDICINES_AVAILABLE',
  'FLOWING_COOL_WATER_READY',
  'BURN_COOLING_STARTED',
  'BURN_SKIN_INTACT',
  'BURN_HIGH_RISK_CONTEXT',
  'BURN_MEDICAL_EVALUATION_PLANNED',
  'BURN_PROTECTIVE_CLOTH_SUITABLE',
  'HEAT_SOURCE_OR_CONSTRICTING_ITEMS_REMAIN',
  'GUIDE_ACTIONS_ALREADY_PERFORMED',
  'WOUND_CARE_STARTED',
  'FIXATION_TOOLS_AVAILABLE',
  'FRACTURE_REST_POSITION_CONFIRMED',
  'FRACTURE_MANUAL_SUPPORT_REQUIRED',
  'OTHER_WOUND_ACCESSIBLE_WITHOUT_MOVEMENT',
  'HELP_CALL_DEVICE_READY',
  'BLEEDING_CONTROLLED_WITH_PRESSURE',
  'BLEEDING_DRESSING_ALREADY_APPLIED',
  'BLEEDING_BANDAGE_AVAILABLE',
  'CONTINUOUS_PRESSURE_HELPER_READY',
  'BURN_NONADHERENT_GAUZE_CONFIRMED',
  'BURN_BLISTERS_INTACT',
] as const;
export const QA_FACT_QUESTIONS: ReadonlyArray<{
  id: QaFactId;
  prompt: string;
}> = [
  {
    id: 'BLEEDING_CONTROLLED_WITH_PRESSURE',
    prompt:
      '손으로 누르는 동안 출혈이 조절되고 있나요? 확인하려고 손을 떼지 마세요. 계속 흐르거나 빠르게 젖거나 분출하면 아니요입니다.',
  },
  {
    id: 'BLEEDING_DRESSING_ALREADY_APPLIED',
    prompt:
      '출혈 부위에 이미 거즈·드레싱·붕대 등을 대었나요? 예라면 기존 것을 떼지 말고 그대로 답해 주세요. 맨손으로 누르기만 한 경우는 아니요입니다.',
  },
  {
    id: 'BLEEDING_BANDAGE_AVAILABLE',
    prompt:
      '거즈를 고정할 압박 붕대가 실제로 있나요? 구급함 밖의 준비물도 포함하며, 확인하지 못했다면 확인 어려움입니다.',
  },
  {
    id: 'CONTINUOUS_PRESSURE_HELPER_READY',
    prompt:
      '한 사람은 출혈 압박을 끊지 않고 계속하고, 다른 사람은 환자·상처를 옮기지 않고 화상을 식히고 덮을 수 있나요? 의료진에게 인계할 때까지 압박을 유지할 사람과 이동 도움도 실제로 확보되어 있어야 합니다.',
  },
  {
    id: 'BURN_NONADHERENT_GAUZE_CONFIRMED',
    prompt:
      '출혈용과 별개의 거즈가 있으며, 화상용 거즈가 깨끗하고 마른 비점착성 제품임을 포장·제품 표시로 확인했나요? 일반 거즈이거나 확인하지 못했다면 예가 아닙니다.',
  },
  {
    id: 'BURN_BLISTERS_INTACT',
    prompt:
      '화상의 물집이 터지지 않았고 피부 벗겨짐이나 열린 상처가 없나요? 만지거나 터뜨려 확인하지 마세요.',
  },
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
  {
    id: 'BURN_MEDICINES_AVAILABLE',
    prompt:
      '구급함의 화상연고를 포함해, 지금 화상 처치용으로 준비된 약품이 실제로 있나요? 환자·보조자가 가진 약품도 포함합니다. 제품명·성분을 모른다는 이유로 아니요를 선택하지 말고 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'FLOWING_COOL_WATER_READY',
    prompt:
      '지금 이 화상 부위에 사용할 시원한 흐르는 물이 준비되어 있나요? 얼음물이나 받아 놓은 물만 있다면 아니요를 선택해 주세요.',
  },
  {
    id: 'BURN_COOLING_STARTED',
    prompt:
      '이번 화상 부위를 식히는 처치를 이미 시작했나요? 잠깐이라도 식혔거나 지금 식히는 중이면 예입니다. 냉각을 끝냈는지는 별도 질문에서 답해 주세요.',
  },
  {
    id: 'BURN_SKIN_INTACT',
    prompt: '화상 부위에 물집·벗겨짐·열린 상처 없이 피부가 온전한가요?',
  },
  {
    id: 'BURN_HIGH_RISK_CONTEXT',
    prompt:
      '화상이 얼굴·목·손·발·성기·큰 관절을 포함하거나 몸을 둘러싸고 있나요? 환자 손바닥보다 넓거나 원인·깊이를 확인하기 어려운 경우에도 예 또는 확인 어려움으로 답해 주세요.',
  },
  {
    id: 'BURN_MEDICAL_EVALUATION_PLANNED',
    prompt:
      '이 화상에 대해 의료진의 조언이나 평가를 받기로 하고 현재 기다리는 상황인가요? 앱에서 안내를 받는 것만으로 예를 선택하지 마세요.',
  },
  {
    id: 'BURN_PROTECTIVE_CLOTH_SUITABLE',
    prompt:
      '냉각 후 화상에 느슨하게 댈 깨끗하고 마른 천을 실제로 준비했나요? 보풀이 없고 달라붙지 않는 재료인지 확인해 주세요. 젖은 천이나 적합성을 모르는 재료는 예가 아닙니다.',
  },
  {
    id: 'HEAT_SOURCE_OR_CONSTRICTING_ITEMS_REMAIN',
    prompt:
      '화상 부위에 뜨거운 물질, 달라붙은 옷 또는 조이는 반지·장신구·옷이 남아 있나요? 확인하려고 붙은 것을 떼거나 부위를 움직이지 마세요.',
  },
  {
    id: 'WOUND_CARE_STARTED',
    prompt:
      '이번 작은 상처를 씻거나 반창고·드레싱을 붙이는 처치를 이미 시작했나요? 이전 앱 안내나 직접 한 처치도 포함하며, 지혈을 위해 눌렀던 것만으로는 예가 아닙니다.',
  },
  {
    id: 'GUIDE_ACTIONS_ALREADY_PERFORMED',
    prompt:
      '이 손상에 냉각·약품 도포·덮기·세척·반창고·골절 지지나 고정·도움 요청 등 안내에 해당하는 처치를 이미 했나요? 이전 앱이나 직접 한 처치도 포함합니다. 자연스럽게 쉬던 자세나 작은 상처의 지혈만은 제외합니다. 기억이 불확실하면 확인 어려움을 선택해 주세요.',
  },
  {
    id: 'FIXATION_TOOLS_AVAILABLE',
    prompt:
      '지금 골절 부위를 고정할 도구나 재료가 실제로 있나요? 부목·붕대뿐 아니라 막대·판지·스카프·튼튼한 천 등 대신 쓸 재료도 포함합니다. 적합성을 모르면 확인 어려움으로 답해 주세요.',
  },
  {
    id: 'FRACTURE_REST_POSITION_CONFIRMED',
    prompt:
      '환자가 지금 자세를 새로 바꾸지 않아도 다친 팔·다리를 편안한 자세로 쉬고 있나요? 확인하려고 움직이거나 뼈를 맞추지 마세요. 이미 지지·고정 처치를 했다면 수행한 처치 질문에도 예로 답해 주세요.',
  },
  {
    id: 'FRACTURE_MANUAL_SUPPORT_REQUIRED',
    prompt:
      '현재 다친 팔·다리의 자세를 유지하려면 누군가 손으로 계속 잡아 주어야 하나요? 확인하려고 잡고 있는 손을 떼지 마세요.',
  },
  {
    id: 'OTHER_WOUND_ACCESSIBLE_WITHOUT_MOVEMENT',
    prompt:
      '다른 작은 상처가 골절 부위와 떨어져 있고, 지금 환자나 다친 팔·다리를 옮기거나 지지를 풀지 않아도 사용할 손으로 접근할 수 있나요? 실제로 움직여 시험하지 마세요.',
  },
  {
    id: 'HELP_CALL_DEVICE_READY',
    prompt:
      '지금 환자 곁에서 도움을 요청할 전화와 사용할 손이 확보되어 있나요? 앞으로 구할 예정이거나 연결 가능 여부를 모르면 예가 아닙니다.',
  },
];

export const C_ROUTE_QA_FACT_ORDER = {
  BURN: [
    'HELPER_AVAILABLE',
    'CLEAN_WATER_AVAILABLE',
    'CLEAN_CLOTH_AVAILABLE',
    'THERMAL_CAUSE',
    'SYMPTOMS_WORSENING',
    'BURN_COOLING_COMPLETED',
    'INDEPENDENT_CARE_POSSIBLE',
    'BURN_MEDICINES_AVAILABLE',
    'FLOWING_COOL_WATER_READY',
    'BURN_COOLING_STARTED',
    'BURN_SKIN_INTACT',
    'BURN_HIGH_RISK_CONTEXT',
    'BURN_MEDICAL_EVALUATION_PLANNED',
    'BURN_PROTECTIVE_CLOTH_SUITABLE',
    'HEAT_SOURCE_OR_CONSTRICTING_ITEMS_REMAIN',
    'GUIDE_ACTIONS_ALREADY_PERFORMED',
  ],
  FRACTURE_BRUISE: [
    'SPLINT_AVAILABLE',
    'HELPER_AVAILABLE',
    'LIMB_ONLY',
    'SYMPTOMS_WORSENING',
    'INDEPENDENT_CARE_POSSIBLE',
    'GUIDE_ACTIONS_ALREADY_PERFORMED',
    'FIXATION_TOOLS_AVAILABLE',
    'FRACTURE_REST_POSITION_CONFIRMED',
    'FRACTURE_MANUAL_SUPPORT_REQUIRED',
    'OTHER_WOUND_ACCESSIBLE_WITHOUT_MOVEMENT',
    'HELP_CALL_DEVICE_READY',
  ],
  BLEEDING: [
    'PRESSURE_REQUIRED',
    'HELPER_AVAILABLE',
    'CLEAN_WATER_AVAILABLE',
    'CLEAN_CLOTH_AVAILABLE',
    'BLEEDING_STOPPED',
    'SMALL_SUPERFICIAL_WOUND',
    'WOUND_BITE',
    'WOUND_CONTAMINATION',
    'WOUND_INFECTION_SIGNS',
    'INDEPENDENT_CARE_POSSIBLE',
    'WOUND_CARE_STARTED',
    'GUIDE_ACTIONS_ALREADY_PERFORMED',
  ],
} as const satisfies Record<
  'BURN' | 'FRACTURE_BRUISE' | 'BLEEDING',
  readonly QaFactId[]
>;

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
