import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GuideHeader } from '@/components/EmergencyGuide/GuideHeader';
import { GuideNextButton } from '@/components/EmergencyGuide/GuideNextButton';
import { useCompoundGuideSession } from '@/hooks/useCompoundGuideSession';
import { useEmergencyGuideTts } from '@/hooks/useEmergencyGuideTts';
import { useEmergencyGuideStore } from '@/store';
import type { CompoundGuideResult } from '@/types';
import { isCompoundTreatmentCompleted } from '@/utils/compoundHandover';
import { CompoundGuideStep } from './CompoundGuideStep';
import { CompoundGuideStatus } from './CompoundGuideStatus';

interface Props {
  sessionId: string;
  compound: CompoundGuideResult;
  onNewRequest: () => void;
  onClose: () => void;
  onStopped: () => void;
  onFinished?: () => void;
}
const BLOCKED_LABELS: Readonly<Record<string, string>> = {
  DEFERRED_INJURIES_REMAIN: '보류된 손상이 남아 있습니다.',
  INSUFFICIENT_STOCK:
    '필요 물품의 재고가 부족합니다. 물품을 확보한 후 다시 확인해 주세요.',
  INSUFFICIENT_INVENTORY:
    '필요 물품의 재고가 부족합니다. 물품을 확보한 후 다시 확인해 주세요.',
};
export const CompoundGuideSession = ({
  sessionId,
  compound,
  onNewRequest,
  onClose,
  onStopped,
  onFinished,
}: Props): React.JSX.Element => {
  const {
    snapshot,
    hasVerifiedSnapshot,
    isBusy,
    canComplete,
    hasPendingAttempt,
    errorMessage,
    handleRefresh,
    handleComplete,
  } = useCompoundGuideSession(sessionId);
  const mainLabel = useEmergencyGuideStore(state => state.mainLabel);
  const elapsedSeconds = useEmergencyGuideStore(state => state.elapsedSeconds);
  const [reviewIndex, setReviewIndex] = React.useState<number | null>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const hasFinishedRef = React.useRef(false);
  React.useEffect(() => {
    if (
      !hasFinishedRef.current &&
      hasVerifiedSnapshot &&
      !isBusy &&
      !hasPendingAttempt &&
      isCompoundTreatmentCompleted(snapshot) &&
      useEmergencyGuideStore.getState().guide?.sessionId === sessionId &&
      onFinished
    ) {
      hasFinishedRef.current = true;
      onFinished();
    }
  }, [
    hasVerifiedSnapshot,
    isBusy,
    hasPendingAttempt,
    snapshot,
    sessionId,
    onFinished,
  ]);
  const plan = snapshot?.compound;
  const progress = snapshot?.progress;
  const isFinishing =
    !!onFinished && !errorMessage && isCompoundTreatmentCompleted(snapshot);
  const hasUnconfirmedCompletion = hasPendingAttempt && !isBusy;
  const activeIndex =
    plan?.execution.findIndex(
      step => step.executionStepId === progress?.currentStepId,
    ) ?? -1;
  // QR로 전환되기 전에는 마지막 안내를 유지해 완료 상태 화면이 사이에 끼지 않게 합니다.
  const currentIndex = isFinishing
    ? (plan?.execution.length ?? 0) - 1
    : activeIndex;
  const current = currentIndex >= 0 ? plan?.execution[currentIndex] : undefined;
  const displayedIndex =
    reviewIndex !== null && reviewIndex >= 0 && reviewIndex < currentIndex
      ? reviewIndex
      : currentIndex;
  const displayed =
    displayedIndex >= 0 ? plan?.execution[displayedIndex] : undefined;
  const isReviewing =
    !!displayed && displayed.executionStepId !== current?.executionStepId;
  const isDisplayedCompleted =
    !!displayed &&
    !!progress?.completedStepIds.includes(displayed.executionStepId);
  useEmergencyGuideTts({
    instruction: isFinishing ? '' : displayed?.instruction.trim() ?? '',
    stepKey: displayed?.executionStepId,
  });
  React.useEffect(() => {
    setReviewIndex(null);
  }, [current?.executionStepId]);
  React.useLayoutEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [displayed?.executionStepId]);
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
  const handleNextPress = (): void => {
    if (isBusy) {
      return;
    }
    if (isReviewing && isDisplayedCompleted) {
      setReviewIndex(displayedIndex + 1);
      return;
    }
    handleConfirmCompletion();
  };
  const handleStopPress = async (hasCompletedStep: boolean): Promise<void> => {
    if (!displayed || isBusy) {
      return;
    }
    if (!hasCompletedStep || isDisplayedCompleted) {
      if (!hasPendingAttempt) {
        onStopped();
      }
      return;
    }
    if (
      !canComplete ||
      displayed.executionStepId !== current?.executionStepId
    ) {
      return;
    }
    await handleComplete(displayed.executionStepId);
    const saved = useEmergencyGuideStore.getState();
    // 응답을 확인하지 못했을 때 완료로 간주하고 화면을 닫으면 미확인 처치 기록이 사라져 보입니다.
    if (
      saved.guide?.sessionId === sessionId &&
      saved.compoundSnapshot?.progress?.completedStepIds.includes(
        displayed.executionStepId,
      )
    ) {
      if (
        !onFinished ||
        !isCompoundTreatmentCompleted(saved.compoundSnapshot)
      ) {
        onStopped();
      }
    }
  };
  const handleCall119 = (): void => {
    Linking.openURL('tel:119').catch(() =>
      Alert.alert('전화 연결 안내', '전화 앱에서 119로 직접 전화해 주세요.'),
    );
  };
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    '0',
  )}:${String(elapsedSeconds % 60).padStart(2, '0')}`;
  const blockedMessage = progress?.blockedReason
    ? progress.display?.blockedReason?.label ??
      BLOCKED_LABELS[progress.blockedReason] ??
      '현재 처치 안내가 보류되었습니다. 저장된 상태를 다시 확인해 주세요.'
    : '';
  const header = (
    <GuideHeader
      centerLabel="응급처치 종류"
      centerValue={
        mainLabel ||
        (plan ?? compound).injuries
          .map(injury => injury.display?.category ?? injury.categoryCode)
          .join(' · ')
      }
      elapsedLabel={elapsedLabel}
      progress={
        plan?.execution.length
          ? (displayedIndex >= 0
              ? displayedIndex + 1
              : progress?.completedStepIds.length ?? 0) / plan.execution.length
          : 0
      }
      showBackButton={
        displayedIndex > 0 && !isBusy && !hasPendingAttempt && !isFinishing
      }
      onBackPress={() => {
        if (!isBusy && !hasPendingAttempt) {
          setReviewIndex(Math.max(0, displayedIndex - 1));
        }
      }}
    />
  );
  const notices = (
    <>
      {isBusy ? (
        <ActivityIndicator
          accessibilityLabel="복합 가이드 서버 기록 확인 중"
          className="mt-3"
        />
      ) : null}
      {blockedMessage ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-body font-suitMedium text-red"
        >
          {blockedMessage}
        </Text>
      ) : null}
      {hasUnconfirmedCompletion ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-body font-suitMedium text-red"
        >
          처치 완료 여부를 확인하지 못했습니다. ‘완료 다시 확인’을 눌러 주세요.
        </Text>
      ) : null}
      {errorMessage ? (
        <Text
          accessibilityRole="alert"
          className="mt-3 text-body font-suitMedium text-red"
        >
          {errorMessage}
        </Text>
      ) : null}
    </>
  );
  const refresh = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="저장된 복합 가이드 다시 조회"
      disabled={isBusy}
      onPress={handleRefresh}
      className="mt-4 h-10 items-center justify-center"
    >
      <Text className="text-coment font-suitMedium text-gray">다시 확인</Text>
    </TouchableOpacity>
  );
  if (!plan && isBusy) {
    return (
      <CompoundGuideStatus
        compound={compound}
        onClose={onClose}
        onNewRequest={onNewRequest}
        canStartNewRequest={false}
        isLoading
      />
    );
  }
  if (!plan || !current || !displayed) {
    return (
      <CompoundGuideStatus
        compound={plan ?? compound}
        progress={progress}
        onClose={onClose}
        onNewRequest={onNewRequest}
        isCompleted={progress?.status === 'COMPLETED'}
        onRefresh={handleRefresh}
        isBusy={isBusy}
        errorMessage={errorMessage}
        canStartNewRequest={
          !isBusy &&
          !hasPendingAttempt &&
          (progress?.status === 'COMPLETED' || (progress?.revision ?? 0) === 0)
        }
      >
        {blockedMessage ? (
          <Text
            accessibilityRole="alert"
            className="mt-4 text-body font-suitMedium leading-6 text-red"
          >
            {blockedMessage}
          </Text>
        ) : null}
        {hasUnconfirmedCompletion ? (
          <Text
            accessibilityRole="alert"
            className="mt-4 text-body font-suitMedium leading-6 text-red"
          >
            처치 완료 여부를 확인하지 못했습니다. ‘다시 확인’을 눌러 저장된
            기록을 확인해 주세요.
          </Text>
        ) : null}
      </CompoundGuideStatus>
    );
  }
  return (
    <View className="flex-1">
      {header}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {plan.call119Required ||
        plan.injuries.some(injury => injury.assessment.call119Required) ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="119 전화"
            onPress={handleCall119}
            className="mb-3 h-12 items-center justify-center rounded-lg bg-red"
          >
            <Text className="text-body font-suitBold text-white">119 전화</Text>
          </TouchableOpacity>
        ) : null}
        {[
          ...new Set(
            plan.redFlags.map(
              flag =>
                plan.display?.redFlags?.find(value => value.code === flag)
                  ?.label ?? '주의가 필요한 상황입니다.',
            ),
          ),
        ].map(label => (
          <Text
            key={label}
            accessibilityRole="alert"
            className="mb-3 text-body font-suitBold text-red"
          >
            {label}
          </Text>
        ))}
        {plan.injuries
          .filter(injury => injury.disposition !== 'ACTIVE')
          .map(injury => (
            <Text
              key={injury.injuryId}
              accessibilityRole="alert"
              className="mb-3 text-body font-suitMedium text-red"
            >
              {injury.display?.category ?? '다른 손상'} · 손상 안내 보류
            </Text>
          ))}
        <View className="pb-4">
          <CompoundGuideStep
            plan={plan}
            step={displayed}
            stepIndex={displayedIndex}
            isStepCompleted={isDisplayedCompleted}
            canCompleteOnStop={canComplete || isDisplayedCompleted}
            onStopPress={handleStopPress}
          />
        </View>
        {notices}
        {!isBusy && (errorMessage || blockedMessage || hasUnconfirmedCompletion)
          ? refresh
          : null}
      </ScrollView>
      <View className="bg-background px-5 pb-5">
        <GuideNextButton
          title={
            hasUnconfirmedCompletion && !isReviewing
              ? '완료 다시 확인'
              : displayedIndex === plan.execution.length - 1
              ? '완료'
              : '다음 단계'
          }
          accessibilityLabel={isReviewing ? '다음 단계' : '현재 단계 처치 완료'}
          isDisabled={
            isBusy ||
            isFinishing ||
            (isReviewing ? !isDisplayedCompleted : !canComplete)
          }
          onPress={handleNextPress}
        />
      </View>
    </View>
  );
};
