import React from 'react';
import { Text, View } from 'react-native';
import type {
  EmergencyGuideAssessment,
  EmergencyGuideHandoverCompletedTreatment,
  EmergencyGuideHandoverUsedSupply,
  EmergencyGuidePatientContext,
} from '@/types';

interface Props {
  assessment:
    | Pick<
        EmergencyGuideAssessment,
        | 'categoryCode'
        | 'severityCode'
        | 'call119Required'
        | 'redFlags'
        | 'summary'
      >
    | null
    | undefined;
  mainLabel: string;
  consciousness: EmergencyGuidePatientContext['consciousness'];
  ageGroup: EmergencyGuidePatientContext['ageGroup'];
  completedTreatments: EmergencyGuideHandoverCompletedTreatment[];
  usedSupplies: EmergencyGuideHandoverUsedSupply[];
}

export function HandoverSummary({
  assessment,
  mainLabel,
  consciousness,
  ageGroup,
  completedTreatments,
  usedSupplies,
}: Props): React.JSX.Element {
  const redFlags = assessment?.redFlags ?? [];

  return (
    <>
      <View className="mt-3 rounded-2xl bg-white p-4">
        <Text className="text-sm font-suitBold text-warning">판단 결과</Text>
        <Text className="mt-2 text-lg font-suitBold text-black">
          {assessment?.categoryCode ?? mainLabel} /{' '}
          {assessment?.severityCode ?? 'UNKNOWN'}
        </Text>
        <Text className="mt-2 leading-6 text-textDim">
          의식 {consciousness} · 연령 {ageGroup}
        </Text>
        <Text
          className={`mt-2 font-suitBold ${
            assessment?.call119Required ? 'text-red' : 'text-textDim'
          }`}
        >
          119 신고 {assessment?.call119Required ? '필요' : '불필요'}
        </Text>
        <Text className="mt-2 leading-6 text-black">
          위험 신호: {redFlags.length > 0 ? redFlags.join(', ') : '없음'}
        </Text>
        <Text className="mt-2 leading-6 text-black">
          {assessment?.summary ?? '판단 요약이 없습니다.'}
        </Text>
      </View>

      <View className="mt-5 rounded-2xl bg-white p-4">
        <Text className="text-sm font-suitBold text-warning">완료한 처치</Text>
        {completedTreatments.length > 0 ? (
          completedTreatments.map((item, index) => (
            <Text key={item.stepId} className="mt-3 leading-6 text-black">
              {index + 1}. {item.instruction}
            </Text>
          ))
        ) : (
          <Text className="mt-3 leading-6 text-textDim">
            완료된 처치가 없습니다.
          </Text>
        )}
      </View>

      <View className="mt-5 rounded-2xl bg-white p-4">
        <Text className="text-sm font-suitBold text-warning">사용한 약품</Text>
        {usedSupplies.length > 0 ? (
          usedSupplies.map((supply, index) => (
            <Text
              key={`${supply.name}-${index}`}
              className="mt-3 leading-6 text-black"
            >
              {supply.name} · {supply.quantity}개
            </Text>
          ))
        ) : (
          <Text className="mt-3 text-textDim">
            사용 기록이 있는 약품이 없습니다.
          </Text>
        )}
      </View>
    </>
  );
}
