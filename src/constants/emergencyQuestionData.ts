import type { EmergencyCategoryId } from './firstAidData';

export interface EmergencyQuestionOption {
  id: string;
  label: string;
}

export interface EmergencyQuestion {
  id: string;
  title: string;
  prompt: string;
  isMultiple: boolean;
  options: readonly EmergencyQuestionOption[];
  exclusiveAnswerIds?: readonly string[];
  mutuallyExclusiveGroups?: readonly (readonly string[])[];
}

export const getNextEmergencyAnswerIds = (
  question: EmergencyQuestion,
  previousAnswerIds: readonly string[],
  answerId: string,
): readonly string[] => {
  if (!question.isMultiple) {
    return [answerId];
  }

  if (previousAnswerIds.includes(answerId)) {
    return previousAnswerIds.filter(id => id !== answerId);
  }

  const exclusiveAnswerIds = question.exclusiveAnswerIds ?? [];

  if (exclusiveAnswerIds.includes(answerId)) {
    return [answerId];
  }

  const selectedGroup = question.mutuallyExclusiveGroups?.find(group =>
    group.includes(answerId),
  );

  return [
    ...previousAnswerIds.filter(
      id => !exclusiveAnswerIds.includes(id) && !selectedGroup?.includes(id),
    ),
    answerId,
  ];
};

const COMMON_QUESTIONS: readonly EmergencyQuestion[] = [
  {
    id: 'immediateDanger',
    title: '즉시 위험 신호',
    prompt: '지금 환자에게 보이는 위험 신호를 모두 선택해 주세요.',
    isMultiple: true,
    exclusiveAnswerIds: ['NONE'],
    options: [
      { id: 'UNCONSCIOUS', label: '의식이 없거나 깨워도 반응이 없음' },
      {
        id: 'BREATHING_ABNORMAL',
        label: '숨을 쉬지 않거나 호흡이 매우 불규칙함',
      },
      {
        id: 'BREATHING_DIFFICULTY',
        label: '숨쉬기 어렵거나 말을 제대로 못 함',
      },
      { id: 'MASSIVE_BLEEDING', label: '피가 매우 많이 나거나 뿜어져 나옴' },
      { id: 'CYANOSIS', label: '입술이나 얼굴이 파랗게 변함' },
      { id: 'FACE_NECK_SWELLING', label: '얼굴·입술·목이 빠르게 붓고 있음' },
      { id: 'SEIZURE', label: '경련 중이거나 경련 직후임' },
      { id: 'NONE', label: '해당 없음' },
    ],
  },
  {
    id: 'visibleSymptoms',
    title: '현재 보이는 증상',
    prompt: '현재 보이거나 확인되는 증상을 모두 선택해 주세요.',
    isMultiple: true,
    options: [
      { id: 'BLEEDING', label: '피가 나거나 상처가 있음' },
      { id: 'BURN', label: '데었거나 피부가 화상을 입음' },
      {
        id: 'FRACTURE_BRUISE',
        label: '부딪힘, 심한 통증, 붓기 또는 변형이 있음',
      },
      { id: 'AIRWAY_OBSTRUCTION', label: '목에 무언가 걸렸거나 숨쉬기 어려움' },
      { id: 'ALLERGY_RASH', label: '두드러기, 발진 또는 부종이 있음' },
      {
        id: 'FEVER_NEUROLOGIC',
        label: '고열, 심한 오한, 경련 또는 의식 변화가 있음',
      },
      { id: 'OTHER_UNKNOWN', label: '잘 모르겠거나 다른 증상임' },
    ],
  },
];

const CATEGORY_QUESTIONS: Record<
  EmergencyCategoryId,
  readonly EmergencyQuestion[]
> = {
  bleeding: [
    {
      id: 'bleedingPattern',
      title: '출혈 양상',
      prompt: '출혈 상태에 해당하는 항목을 모두 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['BLEEDING_UNKNOWN'],
      options: [
        { id: 'BLEEDING_OOZING', label: '피가 조금씩 배어 나옴' },
        { id: 'BLEEDING_CONTINUOUS', label: '피가 계속 흐름' },
        { id: 'BLEEDING_SOAKING', label: '거즈나 옷이 빠르게 젖을 정도임' },
        { id: 'BLEEDING_SPURTING', label: '심장 박동에 맞춰 피가 뿜어져 나옴' },
        { id: 'BLEEDING_UNKNOWN', label: '잘 모르겠음' },
      ],
    },
    {
      id: 'woundRisk',
      title: '상처 상태와 추가 위험',
      prompt: '상처 상태에 해당하는 항목을 모두 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['NONE'],
      options: [
        { id: 'WOUND_DEEP', label: '상처가 깊거나 벌어져 있음' },
        { id: 'FOREIGN_OBJECT', label: '이물질이 박혀 있음' },
        { id: 'AMPUTATION', label: '신체 일부가 잘렸거나 거의 절단됨' },
        { id: 'PRESSURE_FAILED', label: '10분 이상 압박해도 멈추지 않음' },
        {
          id: 'SHOCK_SIGNS',
          label: '창백함, 식은땀, 심한 어지럼 또는 무기력함',
        },
        { id: 'NONE', label: '해당 없음' },
      ],
    },
  ],
  burn: [
    {
      id: 'burnCause',
      title: '화상 위치와 원인',
      prompt: '화상 부위나 원인에 해당하는 항목을 모두 선택해 주세요.',
      isMultiple: true,
      mutuallyExclusiveGroups: [['BURN_LARGE_AREA', 'BURN_SMALL_AREA']],
      options: [
        { id: 'BURN_FACE_NECK', label: '얼굴, 목 또는 기도 주변' },
        { id: 'BURN_LARGE_AREA', label: '넓은 부위' },
        { id: 'BURN_CHEMICAL', label: '화학물질' },
        { id: 'BURN_ELECTRICAL', label: '전기' },
        { id: 'SMOKE_INHALATION', label: '연기 흡입' },
        { id: 'BURN_SMALL_AREA', label: '작은 부위의 일반 화상' },
      ],
    },
    {
      id: 'burnSkinState',
      title: '피부 상태',
      prompt: '화상 부위의 피부 상태에 해당하는 항목을 모두 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['UNKNOWN'],
      options: [
        { id: 'RED_PAINFUL', label: '붉고 통증이 있음' },
        { id: 'BLISTER', label: '물집이 생김' },
        { id: 'WHITE_BLACK', label: '피부가 하얗거나 검게 변함' },
        { id: 'NUMB', label: '감각이 둔하거나 없음' },
        { id: 'UNKNOWN', label: '확인하기 어려움' },
      ],
    },
  ],
  fractureBruise: [
    {
      id: 'injuryState',
      title: '손상 상태',
      prompt: '다친 부위에 해당하는 상태를 모두 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['MINOR_BRUISE'],
      options: [
        { id: 'DEFORMITY', label: '모양이 평소와 다르게 변함' },
        { id: 'OPEN_FRACTURE', label: '뼈가 보이거나 피부 밖으로 나옴' },
        { id: 'SEVERE_SWELLING', label: '심하게 붓고 통증이 큼' },
        { id: 'CANNOT_USE_LIMB', label: '움직이거나 체중을 실을 수 없음' },
        { id: 'CRUSH_INJURY', label: '무거운 물체에 깔리거나 눌림' },
        { id: 'MINOR_BRUISE', label: '가벼운 멍이나 통증 정도임' },
      ],
    },
    {
      id: 'distalCondition',
      title: '말단 혈액순환·감각',
      prompt: '다친 부위 아래쪽의 손이나 발 상태를 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['NORMAL_DISTAL', 'UNKNOWN'],
      options: [
        { id: 'NUMBNESS', label: '감각이 없거나 저림' },
        { id: 'PALE_COLD', label: '창백하거나 차가움' },
        { id: 'MOVEMENT_LOSS', label: '손가락이나 발가락을 움직이기 어려움' },
        { id: 'NORMAL_DISTAL', label: '감각, 색, 온도, 움직임이 대체로 정상' },
        { id: 'UNKNOWN', label: '확인하기 어려움' },
      ],
    },
  ],
  airwayObstruction: [
    {
      id: 'speakOrCough',
      title: '말과 기침 가능 여부',
      prompt: '환자가 말을 하거나 강하게 기침할 수 있나요?',
      isMultiple: false,
      options: [
        { id: 'CAN_SPEAK_OR_COUGH', label: '말하거나 강하게 기침할 수 있음' },
        { id: 'WEAK_COUGH', label: '약한 기침만 가능함' },
        { id: 'CANNOT_SPEAK_OR_COUGH', label: '말하거나 기침할 수 없음' },
        { id: 'UNCONSCIOUS', label: '의식이 없음' },
        { id: 'UNKNOWN', label: '확인하기 어려움' },
      ],
    },
  ],
  skinRash: [
    {
      id: 'allergyRisk',
      title: '알레르기 위험 신호',
      prompt: '현재 나타나는 증상을 모두 선택해 주세요.',
      isMultiple: true,
      exclusiveAnswerIds: ['UNKNOWN'],
      options: [
        { id: 'LOCAL_RASH', label: '일부 부위에만 발진이나 가려움이 있음' },
        { id: 'WIDESPREAD_HIVES', label: '전신에 두드러기가 퍼짐' },
        { id: 'FACE_LIP_SWELLING', label: '얼굴이나 입술이 부음' },
        { id: 'WHEEZING', label: '쌕쌕거리거나 숨쉬기 어려움' },
        { id: 'NON_BLANCHING_RASH', label: '눌러도 사라지지 않는 붉은 반점' },
        { id: 'UNKNOWN', label: '확인하기 어려움' },
      ],
    },
  ],
  fever: [
    {
      id: 'feverSymptoms',
      title: '체온과 동반 증상',
      prompt: '체온과 함께 나타나는 증상을 선택해 주세요.',
      isMultiple: true,
      mutuallyExclusiveGroups: [
        ['TEMP_UNDER_39', 'TEMP_39_OR_HIGHER', 'TEMP_UNKNOWN'],
      ],
      options: [
        { id: 'TEMP_UNDER_39', label: '측정 체온이 39도 미만' },
        { id: 'TEMP_39_OR_HIGHER', label: '측정 체온이 39도 이상' },
        { id: 'TEMP_UNKNOWN', label: '체온을 측정하지 못함' },
        {
          id: 'ALTERED_MENTAL_STATUS',
          label: '평소와 다르게 멍하거나 반응이 둔함',
        },
        { id: 'SEIZURE', label: '경련이 있었음' },
        { id: 'BREATHING_DIFFICULTY', label: '호흡이 어려움' },
      ],
    },
  ],
};

const AGE_QUESTION: EmergencyQuestion = {
  id: 'ageGroup',
  title: '환자 연령대',
  prompt: '환자의 연령대를 선택해 주세요.',
  isMultiple: false,
  options: [
    { id: 'CHILD', label: '어린이' },
    { id: 'ADULT', label: '성인' },
    { id: 'ELDERLY', label: '고령자' },
    { id: 'UNKNOWN', label: '알 수 없음' },
  ],
};

export const getEmergencyQuestions = (
  categoryId: EmergencyCategoryId,
): readonly EmergencyQuestion[] => [
  ...COMMON_QUESTIONS,
  ...CATEGORY_QUESTIONS[categoryId],
  AGE_QUESTION,
];
