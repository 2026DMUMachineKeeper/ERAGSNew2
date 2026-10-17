import React from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { CompoundGuideResult } from '@/types';

interface Props {
  compound: CompoundGuideResult;
  onNewRequest: () => void;
  onClose: () => void;
  canStartNewRequest?: boolean;
  isCompleted?: boolean;
  children?: React.ReactNode;
}
const REASON_MESSAGES: Readonly<Record<string, string>> = {
  SITE_RELATION_UNKNOWN: '두 손상의 부위 관계를 확인해 주세요.',
  ASSESSMENT_INCOMPLETE: '처치 안내를 위해 손상 상태를 추가로 확인해야 합니다.',
  NO_FEASIBLE_REVIEWED_VARIANT:
    '현재 조건과 준비된 물품으로 제공할 수 있는 처치 안내가 없습니다.',
  COMPOUND_DISABLED: '현재 이 손상 조합의 처치 안내를 제공할 수 없습니다.',
};
export const CompoundGuideStatus = ({
  compound,
  onNewRequest,
  onClose,
  canStartNewRequest = true,
  isCompleted = false,
  children,
}: Props): React.JSX.Element => {
  const missing = [
    ...new Set(
      compound.injuries.flatMap(
        injury =>
          injury.assessment?.missingInputs.map(
            code =>
              injury.assessment?.display?.missingInputs?.find(
                input => input.code === code,
              )?.label ?? '손상 상태를 추가로 확인해 주세요.',
          ) ?? [],
      ),
    ),
  ];
  return (
    <ScrollView className="flex-1 px-5 py-6">
      <Text
        accessibilityRole="header"
        className="text-title2 font-suitBold text-black"
      >
        {isCompleted ? '전체 처치 완료' : '처치 안내를 확인해 주세요'}
      </Text>
      {isCompleted ? (
        <Text className="mt-4 text-body font-suitRegular text-textDim">
          모든 단계의 완료가 기록되었습니다.
        </Text>
      ) : (
        compound.blockedReasons.map(code => (
          <Text
            key={code}
            className="mt-4 text-body font-suitMedium text-black"
          >
            {compound.display?.blockedReasons?.find(
              reason => reason.code === code,
            )?.label ??
              REASON_MESSAGES[code] ??
              '현재 처치 안내를 제공할 수 없습니다. 상태를 다시 확인해 주세요.'}
          </Text>
        ))
      )}
      {missing.map(label => (
        <Text key={label} className="mt-3 text-body font-suitMedium text-black">
          {label}
        </Text>
      ))}
      {compound.injuries
        .filter(injury => injury.deferredReason)
        .map(injury => (
          <Text
            key={injury.injuryId}
            className="mt-3 text-body font-suitMedium text-red"
          >
            {injury.display?.category ?? '다른 손상'} · 손상 안내 보류
          </Text>
        ))}
      {compound.call119Required ||
      compound.injuries.some(injury => injury.assessment?.call119Required) ? (
        <Text className="mt-5 text-body font-suitBold text-red">
          119 신고가 필요합니다.
        </Text>
      ) : null}
      {children}
      {canStartNewRequest ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="새 문진 시작"
          className="mt-6 h-12 items-center justify-center rounded-lg bg-red"
          onPress={onNewRequest}
        >
          <Text className="text-body font-suitBold text-white">
            새 문진 시작
          </Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="닫기"
        className="mb-10 mt-3 h-12 items-center justify-center"
        onPress={onClose}
      >
        <Text className="text-body font-suitBold text-gray">닫기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
