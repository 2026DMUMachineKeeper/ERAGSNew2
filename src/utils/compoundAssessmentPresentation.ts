import type { CompoundGuideResult } from '@/types';

type Assessment = CompoundGuideResult['injuries'][number]['assessment'];
interface AssessmentIssue {
  status: string;
  message: string;
}

const INPUT_MESSAGES: Readonly<Record<string, string>> = {
  category: '현재 손상의 증상 유형을 다시 확인해 주세요.',
  bleedingLevel: '출혈 양상과 상처 상태를 확인해 주세요.',
  burnDegree:
    '화상 부위의 피부 상태를 확인해 주세요. 확인하기 어렵다면 모름을 유지해 주세요.',
  fractureType:
    '뼈 노출 여부와 다친 부위 전체의 피부 상태를 확인해 주세요. 확인할 수 없다면 모름을 유지해 주세요.',
  FRACTURE_DISTAL_STATE_UNCONFIRMED:
    '다친 부위 아래쪽 손·발의 감각·색·온도·움직임이 확인되지 않았어요. 확인하기 어렵다면 모름을 유지해 주세요.',
  temperatureC:
    '측정한 체온 구간이 필요해요. 측정하지 못했다면 모름을 유지해 주세요.',
  rashType: '발진 모양 질문에서 실제로 확인되는 형태를 선택해 주세요.',
  RASH_RISK_UNCONFIRMED:
    '발진과 함께 부종·쌕쌕거림·전신 두드러기가 있는지 확인해 주세요. 확인하기 어렵다면 모름을 유지해 주세요.',
  airwayPatency:
    '말하거나 강하게 기침할 수 있는지와 의식 상태를 다시 확인해 주세요.',
  WOUND_CARE_SCOPE_UNCONFIRMED:
    '물림 여부와 상처에 남은 오염·고름·악화 징후가 확인되지 않았어요. 확인하기 어렵다면 모름을 유지해 주세요.',
  RASH_CARE_SCOPE_UNCONFIRMED:
    '발진의 분비물·악화·전신 불편감이나 알레르기 위험 여부가 확인되지 않았어요. 확인하기 어렵다면 모름을 유지해 주세요.',
  CONTACT_EXPOSURE_UNCONFIRMED:
    '발진 부위에 접촉 물질이 아직 남아 있는지 확인해 주세요.',
  EMERGENCY_CARE_SCOPE_UNCONFIRMED:
    '응급 가이드의 적용 조건에 확인되지 않은 내용이 있어요. 실제로 확인한 답변만 유지해 주세요.',
};
const CONFLICT_MESSAGES: Readonly<Record<string, string>> = {
  SUBTYPE_EVIDENCE_CONFLICT:
    '손상 상태에 대한 답변과 관찰 내용이 서로 달라요. 현재 상태를 다시 확인해 주세요.',
  QUESTIONNAIRE_EVIDENCE_CONFLICT:
    '문진의 위험 신호 답변과 관찰·음성 내용이 서로 달라요. 현재 상태를 다시 확인해 주세요.',
  EVIDENCE_CATEGORY_CONFLICT:
    '선택한 손상 유형과 음성·사진의 내용이 서로 달라요. 해당 손상의 자료인지 확인해 주세요.',
  QA_FACT_EVIDENCE_CONFLICT:
    '추가 확인 답변과 관찰·음성 내용이 서로 달라요. 현재 상태를 다시 확인해 주세요.',
  AIRWAY_EVIDENCE_CONFLICT:
    '말·기침 가능 여부에 대한 입력이 서로 달라요. 현재 상태를 다시 확인해 주세요.',
  TEMPERATURE_EVIDENCE_CONFLICT:
    '체온 답변과 입력된 측정값이 서로 달라요. 현재 측정값을 확인해 주세요.',
};
const REVIEW_MESSAGES: Readonly<Record<string, string>> = {
  WOUND_CARE_SCOPE_REVIEW_REQUIRED:
    '물림·남은 오염·고름 또는 악화 징후가 있어 현재의 작은 상처 가이드로 안내할 수 없어요. 별도 상처 평가가 필요해요. 안내를 받기 위해 답변을 바꾸지 마세요.',
  RASH_CARE_SCOPE_REVIEW_REQUIRED:
    '발진의 분비물·악화 또는 전신 증상이 있어 현재 국소 발진 가이드로 안내할 수 없어요. 별도 평가가 필요해요. 안내를 받기 위해 답변을 바꾸지 마세요.',
};
const SERVER_MESSAGES: Readonly<Record<string, string>> = {
  DB_SUBTYPE_RISK_UNCONFIRMED:
    '서버에서 이 손상에 해당하는 가이드 위험 정보를 찾지 못했어요. 답변을 바꿔 해결할 수 있는 문제가 아니며, 서비스 운영자의 확인이 필요해요.',
  DB_SUBTYPE_RISK_UNAVAILABLE:
    '서버에서 가이드 위험 정보를 조회하지 못했어요. 답변 부족으로 생긴 문제가 아니에요. 문제가 반복되면 서비스 운영자에게 알려 주세요.',
  QA_FACT_INVALID:
    '추가 확인 답변의 전달 형식을 서버가 확인하지 못했어요. 새 문진에서도 반복되면 서비스 운영자에게 알려 주세요.',
  QA_FACT_DUPLICATE_OR_CONFLICT:
    '추가 확인 답변이 중복되거나 서로 다른 값으로 전달됐어요. 새 문진에서도 반복되면 서비스 운영자에게 알려 주세요.',
};

export const getCompoundAssessmentIssues = (
  assessment: Assessment,
): readonly AssessmentIssue[] => {
  const codes = [...new Set(assessment?.missingInputs ?? [])];
  const issues = codes.map(code => {
    const label = assessment?.display?.missingInputs?.find(
      item => item.code === code && item.label.trim() && item.label !== code,
    )?.label;
    // 서버의 missingInputs에는 입력 부족뿐 아니라 적용 범위와 서버 오류도 포함됩니다.
    for (const [messages, status] of [
      [INPUT_MESSAGES, '추가 확인 필요'],
      [CONFLICT_MESSAGES, '입력 불일치'],
      [REVIEW_MESSAGES, '별도 평가 필요'],
      [SERVER_MESSAGES, '서버 확인 필요'],
    ] as const) {
      if (Object.prototype.hasOwnProperty.call(messages, code)) {
        return {
          status,
          message: label ? `${label}\n${messages[code]}` : messages[code],
        };
      }
    }
    return {
      status: '평가 확인 필요',
      message:
        label ??
        '손상 평가를 완료하지 못했어요. 손상별 상태와 입력 내용을 확인해 주세요.',
    };
  });
  return issues.filter(
    (issue, index) =>
      issues.findIndex(item => item.message === issue.message) === index,
  );
};
