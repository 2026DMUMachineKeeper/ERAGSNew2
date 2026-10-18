import {
  QA_FACT_QUESTIONS,
  C_ROUTE_QA_FACT_ORDER,
  fractureSkinFollowup,
} from '@/constants/compoundQaData';
import type {
  CompoundQuestionnaireDraft,
  CompoundQuestionnaireInjury,
  QaFactId,
} from '@/types';

const hasAnswers = (
  injury: CompoundQuestionnaireInjury,
  questionId: string,
  required: readonly string[],
  excluded: readonly string[] = [],
): boolean => {
  const values = injury.answers[questionId] ?? [];
  return (
    new Set(values).size === values.length &&
    required.every(value => values.includes(value)) &&
    !excluded.some(value => values.includes(value))
  );
};
const isSmallWound = (injury: CompoundQuestionnaireInjury): boolean =>
  injury.categoryCode === 'BLEEDING' &&
  hasAnswers(
    injury,
    'bleedingPattern',
    ['BLEEDING_OOZING'],
    [
      'BLEEDING_CONTINUOUS',
      'BLEEDING_SOAKING',
      'BLEEDING_SPURTING',
      'BLEEDING_UNKNOWN',
    ],
  ) &&
  hasAnswers(
    injury,
    'woundRisk',
    ['NONE'],
    [
      'WOUND_DEEP',
      'FOREIGN_OBJECT',
      'AMPUTATION',
      'PRESSURE_FAILED',
      'SHOCK_SIGNS',
    ],
  );
const isSmallBurn = (injury: CompoundQuestionnaireInjury): boolean =>
  injury.categoryCode === 'BURN' &&
  hasAnswers(
    injury,
    'burnCause',
    ['BURN_SMALL_AREA'],
    [
      'BURN_FACE_NECK',
      'BURN_LARGE_AREA',
      'BURN_CHEMICAL',
      'BURN_ELECTRICAL',
      'SMOKE_INHALATION',
    ],
  ) &&
  hasAnswers(
    injury,
    'burnSkinState',
    ['RED_PAINFUL'],
    ['BLISTER', 'WHITE_BLACK', 'NUMB', 'UNKNOWN'],
  );
const isClosedInjury = (injury: CompoundQuestionnaireInjury): boolean =>
  injury.categoryCode === 'FRACTURE_BRUISE' &&
  hasAnswers(
    injury,
    'injuryState',
    [],
    ['OPEN_FRACTURE', 'CRUSH_INJURY', 'MINOR_BRUISE', 'UNKNOWN'],
  ) &&
  (injury.answers.injuryState ?? []).some(value =>
    ['DEFORMITY', 'SEVERE_SWELLING', 'CANNOT_USE_LIMB'].includes(value),
  );

const canHaveCQuestions = (injury: CompoundQuestionnaireInjury): boolean => {
  if (injury.categoryCode === 'BLEEDING') {
    return (
      (!injury.answers.bleedingPattern?.length ||
        hasAnswers(
          injury,
          'bleedingPattern',
          ['BLEEDING_OOZING'],
          [
            'BLEEDING_CONTINUOUS',
            'BLEEDING_SOAKING',
            'BLEEDING_SPURTING',
            'BLEEDING_UNKNOWN',
          ],
        )) &&
      (!injury.answers.woundRisk?.length ||
        hasAnswers(
          injury,
          'woundRisk',
          ['NONE'],
          [
            'WOUND_DEEP',
            'FOREIGN_OBJECT',
            'AMPUTATION',
            'PRESSURE_FAILED',
            'SHOCK_SIGNS',
          ],
        ))
    );
  }
  if (injury.categoryCode === 'BURN') {
    return (
      (!injury.answers.burnCause?.length ||
        hasAnswers(
          injury,
          'burnCause',
          ['BURN_SMALL_AREA'],
          [
            'BURN_FACE_NECK',
            'BURN_LARGE_AREA',
            'BURN_CHEMICAL',
            'BURN_ELECTRICAL',
            'SMOKE_INHALATION',
          ],
        )) &&
      (!injury.answers.burnSkinState?.length ||
        hasAnswers(
          injury,
          'burnSkinState',
          ['RED_PAINFUL'],
          ['BLISTER', 'WHITE_BLACK', 'NUMB', 'UNKNOWN'],
        ))
    );
  }
  return (
    injury.categoryCode === 'FRACTURE_BRUISE' &&
    (!injury.answers.injuryState?.length || isClosedInjury(injury))
  );
};

// QA main의 노출 조건을 그대로 적용하고, 답하지 않은 항목은 전송하지 않습니다.
export function relevantQaFacts(
  draft: CompoundQuestionnaireDraft,
  injury: CompoundQuestionnaireInjury,
) {
  if (draft.injuries.length !== 2) return [];
  const ids = new Set<QaFactId>();
  const hasAirway = draft.injuries.some(
    i => i.categoryCode === 'AIRWAY_OBSTRUCTION',
  );
  if (
    draft.relation === 'DIFFERENT' &&
    draft.injuries.every(
      i =>
        i.location.scope === 'LOCALIZED' &&
        ['BLEEDING', 'BURN', 'FRACTURE_BRUISE', 'ALLERGY_RASH'].includes(
          i.categoryCode ?? '',
        ),
    )
  )
    ids.add('INDEPENDENT_CARE_POSSIBLE');
  const matchesAnswers = (
    questionId: string,
    required: string[],
    excluded: string[] = [],
  ) => hasAnswers(injury, questionId, required, excluded);
  const isMinorBruise =
    injury.categoryCode === 'FRACTURE_BRUISE' &&
    matchesAnswers(
      'injuryState',
      ['MINOR_BRUISE'],
      [
        'DEFORMITY',
        'OPEN_FRACTURE',
        'SEVERE_SWELLING',
        'CANNOT_USE_LIMB',
        'CRUSH_INJURY',
      ],
    );
  const isSuspectedClosedInjury = isClosedInjury(injury);
  // C 경로를 앱에서 확정하지 않고, 서버가 판단할 때 필요한 관찰만 추가로 수집합니다.
  const hasCQuestionContext =
    draft.relation === 'DIFFERENT' &&
    draft.injuries.every(item => item.location.scope === 'LOCALIZED') &&
    draft.injuries.some(item => item.categoryCode === 'BLEEDING') &&
    draft.injuries.some(item =>
      ['BURN', 'FRACTURE_BRUISE'].includes(item.categoryCode),
    ) &&
    draft.injuries.every(canHaveCQuestions);
  if (hasCQuestionContext) {
    ids.add('GUIDE_ACTIONS_ALREADY_PERFORMED');
    if (isSmallWound(injury)) ids.add('WOUND_CARE_STARTED');
    if (isSmallBurn(injury)) {
      (
        [
          'BURN_MEDICINES_AVAILABLE',
          'FLOWING_COOL_WATER_READY',
          'BURN_COOLING_STARTED',
          'BURN_SKIN_INTACT',
          'BURN_HIGH_RISK_CONTEXT',
          'BURN_MEDICAL_EVALUATION_PLANNED',
          'BURN_PROTECTIVE_CLOTH_SUITABLE',
          'HEAT_SOURCE_OR_CONSTRICTING_ITEMS_REMAIN',
        ] as const
      ).forEach(id => ids.add(id));
    }
    if (isSuspectedClosedInjury) {
      (
        [
          'FIXATION_TOOLS_AVAILABLE',
          'FRACTURE_REST_POSITION_CONFIRMED',
          'FRACTURE_MANUAL_SUPPORT_REQUIRED',
          'OTHER_WOUND_ACCESSIBLE_WITHOUT_MOVEMENT',
          'HELP_CALL_DEVICE_READY',
          'SYMPTOMS_WORSENING',
        ] as const
      ).forEach(id => ids.add(id));
    }
  }
  const isLocalFlatRash =
    injury.categoryCode === 'ALLERGY_RASH' &&
    matchesAnswers(
      'allergyRisk',
      ['LOCAL_RASH'],
      [
        'WIDESPREAD_HIVES',
        'FACE_LIP_SWELLING',
        'WHEEZING',
        'NON_BLANCHING_RASH',
        'UNKNOWN',
      ],
    ) &&
    matchesAnswers(
      'rashAppearance',
      ['RASH_FLAT_SPOTS'],
      ['RASH_BLISTERS', 'RASH_RED_WARM', 'RASH_RAISED_WHEALS', 'UNKNOWN'],
    );
  const isLocalErythema =
    injury.categoryCode === 'ALLERGY_RASH' &&
    injury.location.scope === 'LOCALIZED' &&
    matchesAnswers(
      'allergyRisk',
      ['LOCAL_RASH'],
      [
        'WIDESPREAD_HIVES',
        'FACE_LIP_SWELLING',
        'WHEEZING',
        'NON_BLANCHING_RASH',
        'UNKNOWN',
      ],
    ) &&
    matchesAnswers(
      'rashAppearance',
      ['RASH_RED_WARM'],
      ['RASH_BLISTERS', 'RASH_RAISED_WHEALS', 'UNKNOWN'],
    );
  const isEmergencyUrticaria =
    injury.categoryCode === 'ALLERGY_RASH' &&
    injury.location.scope === 'SYSTEMIC' &&
    matchesAnswers(
      'allergyRisk',
      ['FACE_LIP_SWELLING'],
      [
        'LOCAL_RASH',
        'WIDESPREAD_HIVES',
        'WHEEZING',
        'NON_BLANCHING_RASH',
        'UNKNOWN',
      ],
    ) &&
    matchesAnswers(
      'rashAppearance',
      ['RASH_RAISED_WHEALS'],
      ['RASH_FLAT_SPOTS', 'RASH_BLISTERS', 'RASH_RED_WARM', 'UNKNOWN'],
    );
  const isEmergencyFever =
    injury.categoryCode === 'FEVER_NEUROLOGIC' &&
    injury.location.scope === 'SYSTEMIC' &&
    matchesAnswers(
      'feverSymptoms',
      ['TEMP_39_OR_HIGHER', 'BREATHING_DIFFICULTY'],
      [
        'TEMP_UNDER_38',
        'TEMP_38_TO_38_9',
        'TEMP_UNKNOWN',
        'ALTERED_MENTAL_STATUS',
        'SEIZURE',
      ],
    );
  if (isEmergencyUrticaria) {
    (
      [
        'ALLERGIC_AIRWAY_SIGNS',
        'RASH_OBSERVER_PRESENT',
        'RASH_INFECTION_SYSTEMIC_SIGNS',
        'SUDDEN_LIP_MOUTH_SWELLING',
        'NORMAL_BREATHING_CONFIRMED',
        'NORMAL_SWALLOWING_CONFIRMED',
        'ADRENALINE_AUTOINJECTOR_ACCESSIBLE',
        'NON_PREGNANT_CONFIRMED',
        'SAFE_SUPINE_LEG_ELEVATION',
        'ACTIVE_ALLERGEN_EXPOSURE',
        'STINGER_REMAINS',
      ] as const
    ).forEach(id => ids.add(id));
  }
  if (isEmergencyFever) {
    (
      [
        'MEASURED_HIGH_FEVER',
        'SEVERE_BREATHING_DISTRESS',
        'HEATSTROKE_CONTEXT',
        'AIRWAY_OBSTRUCTION_SUSPECTED',
        'CURRENT_CONVULSIONS',
        'EMERGENCY_OBSERVER_PRESENT',
      ] as const
    ).forEach(id => ids.add(id));
  }
  if (isSmallWound(injury)) {
    ids.add('BLEEDING_STOPPED');
    ids.add('SMALL_SUPERFICIAL_WOUND');
    ids.add('WOUND_BITE');
    ids.add('WOUND_CONTAMINATION');
    ids.add('WOUND_INFECTION_SIGNS');
  }
  if (isMinorBruise) {
    ids.add('LIMB_ONLY');
    ids.add('BRUISE_SKIN_INTACT');
    ids.add('COMPRESSION_FEASIBLE');
    ids.add('ELEVATION_FEASIBLE');
  }
  if (isSuspectedClosedInjury) {
    ids.add('LIMB_ONLY');
    ids.add('SPLINT_TRAINED_HELPER');
    if (injury.location.scope === 'LOCALIZED')
      ids.add('SAFE_IMMEDIATE_TRANSPORT_AVAILABLE');
  }
  if (isLocalFlatRash || isLocalErythema) {
    ids.add('KNOWN_CONTACT_EXPOSURE');
    ids.add('HAZARDOUS_CONTACT');
    ids.add('CONTACT_EXPOSURE_ENDED');
    ids.add('RASH_OBSERVER_PRESENT');
    if (hasAirway || isLocalErythema) ids.add('ALLERGIC_AIRWAY_SIGNS');
  }
  if (isLocalErythema) {
    ids.add('CLEAN_COLD_DAMP_CLOTH_PREPARED');
    ids.add('CLEAN_COLD_DAMP_CLOTH_CHOSEN');
    ids.add('RASH_SKIN_INTACT');
    ids.add('RASH_INFECTION_SYSTEMIC_SIGNS');
  }
  if (
    isMinorBruise ||
    isLocalFlatRash ||
    isLocalErythema ||
    (injury.categoryCode === 'FEVER_NEUROLOGIC' && !isEmergencyFever)
  )
    ids.add('SYMPTOMS_WORSENING');
  if (
    injury.categoryCode === 'AIRWAY_OBSTRUCTION' &&
    matchesAnswers(
      'speakOrCough',
      ['CAN_SPEAK_OR_COUGH'],
      ['WEAK_COUGH', 'CANNOT_SPEAK_OR_COUGH', 'UNCONSCIOUS', 'UNKNOWN'],
    )
  ) {
    ids.add('EFFECTIVE_COUGH_PRESENT');
    if (injury.location.scope === 'SYSTEMIC') ids.add('MOUTH_VISIBLE_OBJECT');
    ids.add('AIRWAY_OBSERVER_PRESENT');
    ids.add('FOREIGN_BODY_EPISODE_CONFIRMED');
  }
  if (
    draft.relation === 'SAME' &&
    injury.injuryId === draft.injuries[0].injuryId
  )
    ids.add('SURFACES_OVERLAP');
  if (injury.categoryCode === 'FRACTURE_BRUISE') {
    ids.add('SEVERE_SWELLING');
    ids.add('COOLING_TOOL_AVAILABLE');
    ids.add('SPLINT_AVAILABLE');
  }
  if (injury.categoryCode === 'FEVER_NEUROLOGIC' && !isEmergencyFever)
    ids.add('CAN_SWALLOW');
  if (injury.categoryCode === 'BLEEDING') ids.add('PRESSURE_REQUIRED');
  if (injury.categoryCode === 'BURN') {
    ids.add('THERMAL_CAUSE');
    ids.add('CLEAN_WATER_AVAILABLE');
    ids.add('BURN_COOLING_COMPLETED');
    if (injury.location.scope === 'LOCALIZED') {
      ids.add('SYMPTOMS_WORSENING');
      ids.add('BURN_CAN_REMAIN_CLEAN');
    }
  }
  if (injury.location.scope === 'LOCALIZED') {
    ids.add('CLEAN_WATER_AVAILABLE');
    ids.add('CLEAN_CLOTH_AVAILABLE');
  }
  if (
    injury.injuryId === draft.injuries[0].injuryId &&
    (hasAirway ||
      draft.injuries.every(i =>
        ['BLEEDING', 'BURN', 'FRACTURE_BRUISE', 'ALLERGY_RASH'].includes(
          i.categoryCode ?? '',
        ),
      ))
  )
    ids.add('HELPER_AVAILABLE');
  const questions = QA_FACT_QUESTIONS.filter(q => ids.has(q.id));
  const order: readonly QaFactId[] | null = !hasCQuestionContext
    ? null
    : isSmallBurn(injury)
    ? C_ROUTE_QA_FACT_ORDER.BURN
    : isSuspectedClosedInjury
    ? C_ROUTE_QA_FACT_ORDER.FRACTURE_BRUISE
    : isSmallWound(injury)
    ? C_ROUTE_QA_FACT_ORDER.BLEEDING
    : null;
  if (!order) return questions;
  // 자료의 C 질문을 먼저 묻고, 이미 확인한 다른 관찰은 숨기거나 삭제하지 않습니다.
  const ordered = order.flatMap(id =>
    questions.filter(question => question.id === id),
  );
  const hasFixationResourceAnswer =
    ['YES', 'UNKNOWN'].includes(injury.qaFacts?.SPLINT_AVAILABLE ?? '') ||
    ['YES', 'UNKNOWN'].includes(injury.qaFacts?.FIXATION_TOOLS_AVAILABLE ?? '');
  return [
    ...ordered,
    ...questions.filter(
      question =>
        !order.includes(question.id) &&
        (injury.qaFacts?.[question.id] !== undefined ||
          (injury.categoryCode === 'BURN' &&
            question.id === 'BURN_CAN_REMAIN_CLEAN' &&
            injury.qaFacts?.BURN_COOLING_COMPLETED === 'YES') ||
          (injury.categoryCode === 'FRACTURE_BRUISE' &&
            hasFixationResourceAnswer)),
    ),
  ];
}

export const getMissingCompoundQuestions = (
  draft: CompoundQuestionnaireDraft,
) =>
  draft.injuries.flatMap((injury, index) => {
    const prompts = relevantQaFacts(draft, injury)
      .filter(question => injury.qaFacts?.[question.id] === undefined)
      .map(question => question.prompt);
    if (
      injury.categoryCode === 'FRACTURE_BRUISE' &&
      !injury.fractureSkinAnswer
    ) {
      prompts.unshift(fractureSkinFollowup.question);
    }
    return prompts.length
      ? [{ injuryId: injury.injuryId, injuryIndex: index, prompts }]
      : [];
  });
export function pruneQaFacts(
  draft: CompoundQuestionnaireDraft,
): CompoundQuestionnaireDraft {
  return {
    ...draft,
    injuries: draft.injuries.map(injury => ({
      ...injury,
      qaFacts: Object.fromEntries(
        relevantQaFacts(draft, injury)
          .filter(q => injury.qaFacts?.[q.id] !== undefined)
          .map(q => [q.id, injury.qaFacts![q.id]]),
      ),
    })),
  };
}
export function encodedQaFacts(
  draft: CompoundQuestionnaireDraft,
  injury: CompoundQuestionnaireInjury,
): string[] {
  const local = new Set(relevantQaFacts(draft, injury).map(q => q.id));
  const shared = draft.injuries[0];
  const sharedIds = new Set(
    relevantQaFacts(draft, shared)
      .filter(q => q.id === 'SURFACES_OVERLAP' || q.id === 'HELPER_AVAILABLE')
      .map(q => q.id),
  );
  return QA_FACT_QUESTIONS.flatMap(q => {
    const answer = sharedIds.has(q.id)
      ? shared.qaFacts?.[q.id]
      : local.has(q.id)
      ? injury.qaFacts?.[q.id]
      : undefined;
    return answer === undefined ? [] : [`QA_FACT_V1:${q.id}=${answer}`];
  });
}
