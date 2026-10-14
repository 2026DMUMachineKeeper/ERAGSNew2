import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { CompoundGuideResult } from '@/types';

interface Props {
  compound: CompoundGuideResult;
  onNewRequest: () => void;
  onClose: () => void;
  canStartNewRequest?: boolean;
  children?: React.ReactNode;
}

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  SITE_RELATION_UNKNOWN: '두 손상의 부위 관계가 확인되지 않았습니다.',
  ASSESSMENT_INCOMPLETE: '손상별 평가 정보가 부족합니다.',
  COMPOUND_DISABLED: '복합 처치 자동 안내 미활성화',
};

export const CompoundGuideStatus = ({
  compound,
  onNewRequest,
  onClose,
  canStartNewRequest = true,
  children,
}: Props): React.JSX.Element => (
  <ScrollView className="flex-1 px-5 py-6">
    <Text
      accessibilityRole="header"
      className="text-title2 font-suitBold text-black"
    >
      복합 손상 평가 결과
    </Text>
    <Text className="mt-3 text-body font-suitRegular text-textDim">
      {compound.display?.status ??
        {
          COMPLETE: '가이드 생성 완료',
          PARTIAL: '일부 손상 안내 보류',
          ASSESSMENT_ONLY: '평가 완료 · 처치 안내 보류',
          GUIDE_PENDING: '가이드 확인 필요',
        }[compound.status]}
    </Text>
    {compound.blockedReasons.map(code => (
      <Text key={code} className="mt-4 text-body font-suitBold text-black">
        {compound.display?.blockedReasons?.find(reason => reason.code === code)
          ?.label ??
          REASON_MESSAGES[code] ??
          code}
      </Text>
    ))}
    {compound.injuries.map(injury => (
      <View key={injury.injuryId} className="mt-5 rounded-2xl bg-white p-4">
        <Text className="text-body font-suitBold text-black">
          {injury.display?.category ?? injury.categoryCode}
        </Text>
        {injury.assessment ? (
          <Text className="mt-2 text-body font-suitRegular text-textDim">
            {injury.assessment.display?.subtype ??
              injury.assessment.subtypeCode ??
              '세부 유형 미확정'}
            {' · '}
            {injury.assessment.display?.severity ??
              injury.assessment.severityCode}
          </Text>
        ) : null}
        {injury.display?.disposition ? (
          <Text className="mt-2 text-body font-suitRegular text-textDim">
            {injury.display.disposition}
          </Text>
        ) : null}
        {injury.assessment?.missingInputs.map(code => (
          <Text
            key={code}
            className="mt-2 text-body font-suitRegular text-textDim"
          >
            {injury.assessment?.display?.missingInputs?.find(
              input => input.code === code,
            )?.label ?? code}
          </Text>
        ))}
        {injury.deferredReason ? (
          <Text className="mt-2 text-body font-suitRegular text-textDim">
            {injury.deferredReason}
          </Text>
        ) : null}
      </View>
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
        <Text className="text-body font-suitBold text-white">새 문진 시작</Text>
      </TouchableOpacity>
    ) : (
      <Text className="mt-6 text-body font-suitRegular text-textDim">
        진행 중인 가이드와 완료·보류 기록을 먼저 확인해 주세요.
      </Text>
    )}
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
