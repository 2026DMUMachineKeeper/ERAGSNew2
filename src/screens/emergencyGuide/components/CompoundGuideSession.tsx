import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCompoundGuideSession } from '@/hooks/useCompoundGuideSession';
import type { CompoundGuideResult } from '@/types';
import { CompoundGuideStatus } from './CompoundGuideStatus';

interface Props {
  sessionId: string;
  compound: CompoundGuideResult;
  onNewRequest: () => void;
  onClose: () => void;
}

const PROGRESS_LABELS = {
  IN_PROGRESS: '처치 진행 중',
  BLOCKED: '처치 진행 보류',
  COMPLETED: '전체 처치 완료',
  WAITING: '처치 대기',
  DEFERRED: '손상 안내 보류',
};
const BLOCKED_LABELS: Readonly<Record<string, string>> = {
  DEFERRED_INJURIES_REMAIN: '보류된 손상이 남아 있습니다.',
  INSUFFICIENT_STOCK:
    '필요 물품의 재고가 부족합니다. 물품을 확보한 후 새로 시도해 주세요.',
  INSUFFICIENT_INVENTORY:
    '필요 물품의 재고가 부족합니다. 물품을 확보한 후 새로 시도해 주세요.',
};

export const CompoundGuideSession = ({
  sessionId,
  compound,
  onNewRequest,
  onClose,
}: Props): React.JSX.Element => {
  const {
    snapshot,
    isBusy,
    canComplete,
    hasPendingAttempt,
    errorMessage,
    handleRefresh,
    handleComplete,
  } = useCompoundGuideSession(sessionId);
  const plan = snapshot?.compound;
  const progress = snapshot?.progress;
  const current = plan?.execution.find(
    step => step.executionStepId === progress?.currentStepId,
  );
  const supplyName = (itemId: number): string =>
    plan?.injuries
      .flatMap(injury => injury.guide?.steps ?? [])
      .find(step => step.requiredItemId === itemId)?.requiredItemName ??
    `물품 ${itemId}`;
  const handleConfirmCompletion = (): void => {
    if (!current || !canComplete) {
      return;
    }
    if (hasPendingAttempt) {
      handleComplete(current.executionStepId);
      return;
    }
    Alert.alert(
      '처치 완료 확인',
      `${current.instruction}\n\n이 단계의 처치를 완료했나요?`,
      [
        { text: '아직 안 했어요', style: 'cancel' },
        {
          text: '완료했어요',
          onPress: () => handleComplete(current.executionStepId),
        },
      ],
    );
  };
  const handleCall119 = (): void => {
    Linking.openURL('tel:119').catch(() =>
      Alert.alert('전화 연결 안내', '전화 앱에서 119로 직접 전화해 주세요.'),
    );
  };

  return (
    <CompoundGuideStatus
      compound={plan ?? compound}
      onNewRequest={onNewRequest}
      onClose={onClose}
      canStartNewRequest={
        !isBusy && !hasPendingAttempt && (progress?.revision ?? 0) === 0
      }
    >
      {(plan ?? compound).call119Required ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="119 전화"
          onPress={handleCall119}
          className="mt-4 h-12 items-center justify-center rounded-lg bg-red"
        >
          <Text className="text-body font-suitBold text-white">119 전화</Text>
        </TouchableOpacity>
      ) : null}
      {isBusy ? (
        <ActivityIndicator
          accessibilityLabel="복합 가이드 서버 기록 확인 중"
          className="mt-5"
        />
      ) : null}
      {plan ? (
        <>
          <Text
            className="mt-5 text-body font-suitBold text-black"
            testID="compound-progress-status"
          >
            {progress ? PROGRESS_LABELS[progress.status] : '처치 실행 보류'}
          </Text>
          <Text className="mt-2 text-coment font-suitRegular text-textDim">
            가이드 생성 완료와 실제 처치 완료 기록은 별도입니다.
          </Text>
          {plan.redFlags.map(flag => (
            <Text key={flag} className="mt-2 text-body font-suitBold text-red">
              {plan.display?.redFlags?.find(value => value.code === flag)
                ?.label ?? flag}
            </Text>
          ))}
          {progress?.blockedReason ? (
            <Text
              accessibilityRole="alert"
              className="mt-3 text-body font-suitBold text-red"
            >
              {progress.display?.blockedReason?.code === progress.blockedReason
                ? progress.display.blockedReason.label
                : BLOCKED_LABELS[progress.blockedReason] ??
                  progress.blockedReason}
            </Text>
          ) : null}
          {progress?.injuries.map(injury => (
            <Text
              key={injury.injuryId}
              className="mt-2 text-body font-suitRegular text-textDim"
            >
              손상{' '}
              {plan.injuries.findIndex(
                value => value.injuryId === injury.injuryId,
              ) + 1}
              {' · '}
              {injury.display?.status ?? PROGRESS_LABELS[injury.status]}
            </Text>
          ))}
          <Text className="mt-6 text-title2 font-suitBold text-black">
            처치 순서
          </Text>
          {plan.execution.length === 0 ? (
            <Text className="mt-3 text-body font-suitRegular text-textDim">
              자동 실행 가능한 처치 단계가 없습니다.
            </Text>
          ) : null}
          {plan.execution.map((step, index) => (
            <View
              key={step.executionStepId}
              testID={`compound-step-${index + 1}`}
              className="mt-3 rounded-2xl bg-white p-4"
            >
              <Text className="text-body font-suitBold text-black">
                {index + 1}단계 ·{' '}
                {progress?.completedStepIds.includes(step.executionStepId)
                  ? '완료 기록됨'
                  : current?.executionStepId === step.executionStepId
                  ? '현재 단계'
                  : '대기'}
              </Text>
              <Text className="mt-2 text-body font-suitRegular text-black">
                {step.instruction}
              </Text>
              <Text className="mt-2 text-coment font-suitRegular text-textDim">
                대상:{' '}
                {step.sources
                  .map(
                    source =>
                      `손상 ${
                        plan.injuries.findIndex(
                          injury => injury.injuryId === source.injuryId,
                        ) + 1
                      }`,
                  )
                  .join(', ')}
              </Text>
              <Text className="mt-2 text-coment font-suitRegular text-textDim">
                필요 물품:{' '}
                {step.consumptionUnits
                  .map(unit => `${supplyName(unit.itemId)} ${unit.quantity}개`)
                  .join(', ') || '없음'}
              </Text>
            </View>
          ))}
          {current ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="현재 단계 처치 완료"
              disabled={!canComplete}
              onPress={handleConfirmCompletion}
              className={`mt-5 h-14 items-center justify-center rounded-lg ${
                canComplete ? 'bg-red' : 'bg-disabled'
              }`}
            >
              <Text className="text-body font-suitBold text-white">
                {hasPendingAttempt
                  ? '같은 완료 요청 다시 확인'
                  : progress?.status === 'BLOCKED'
                  ? '현재 단계 완료 다시 시도'
                  : '현재 단계 처치 완료'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text className="mt-6 text-body font-suitBold text-black">
            전체 계획 필요 물품
          </Text>
          {plan.allocations.map(item => (
            <Text
              key={item.itemId}
              className="mt-2 text-body font-suitRegular text-textDim"
            >
              {supplyName(item.itemId)} {item.quantity}개
            </Text>
          ))}
          <Text className="mt-5 text-body font-suitBold text-black">
            실제 사용 기록
          </Text>
          {snapshot.usedSupplies.length ? (
            snapshot.usedSupplies.map(item => (
              <Text
                key={item.unitId}
                className="mt-2 text-body font-suitRegular text-textDim"
              >
                {supplyName(item.itemId)} {item.quantity}개
              </Text>
            ))
          ) : (
            <Text className="mt-2 text-body font-suitRegular text-textDim">
              아직 사용 기록 없음
            </Text>
          )}
        </>
      ) : null}
      {hasPendingAttempt ? (
        <Text
          accessibilityRole="alert"
          className="mt-4 text-body font-suitRegular text-red"
        >
          완료 응답을 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.
        </Text>
      ) : null}
      {errorMessage ? (
        <Text
          accessibilityRole="alert"
          className="mt-4 text-body font-suitRegular text-red"
        >
          {errorMessage}
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="저장된 복합 가이드 다시 조회"
        disabled={isBusy}
        onPress={handleRefresh}
        className="mt-4 h-12 items-center justify-center rounded-lg border border-red"
      >
        <Text className="text-body font-suitBold text-red">
          저장된 상태 다시 조회
        </Text>
      </TouchableOpacity>
    </CompoundGuideStatus>
  );
};
