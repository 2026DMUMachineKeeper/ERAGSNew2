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
import { BackIcon, FirstAidGuideIcon } from '@/assets';
import {
  FIRST_AID_CATEGORIES,
  SERVER_SYMPTOM_ID_BY_CATEGORY,
} from '@/constants';
import type { CompoundGuideProgress, CompoundGuideResult } from '@/types';
import { getCompoundAssessmentIssues } from '@/utils/compoundAssessmentPresentation';
import tailwindConfig from '../../../../tailwind.config';

const { colors } = tailwindConfig;

interface Props {
  compound: CompoundGuideResult;
  onNewRequest: () => void;
  onClose: () => void;
  onRefresh?: () => void;
  canStartNewRequest?: boolean;
  isCompleted?: boolean;
  isLoading?: boolean;
  isBusy?: boolean;
  errorMessage?: string;
  progress?: CompoundGuideProgress | null;
  children?: React.ReactNode;
}

const REASON_MESSAGES: Readonly<Record<string, string>> = {
  SITE_RELATION_UNKNOWN:
    '두 손상이 같은 부위인지, 다른 부위인지 확인이 필요해요.',
  ASSESSMENT_INCOMPLETE:
    '손상별 평가에서 안내를 보류한 항목이 있어요. 아래에 표시된 사유를 확인해 주세요.',
  NO_FEASIBLE_REVIEWED_VARIANT:
    '현재 손상 상태와 준비된 물품에 맞는 복합 처치 안내를 찾지 못했어요.',
  COMPOUND_DISABLED:
    '현재 이 두 손상을 함께 안내할 수 있는 처치 정보가 준비되지 않았어요.',
  POLICY_NOT_FOUND: '현재 이 손상 조합에 맞는 처치 안내가 준비되지 않았어요.',
  GUIDE_UNAVAILABLE: '필요한 처치 안내를 모두 확인하지 못해 진행을 보류했어요.',
  INJURY_DEFERRED:
    '아직 안내가 보류된 손상이 있어요. 손상별 상태를 확인해 주세요.',
};

export const CompoundGuideStatus = ({
  compound,
  onNewRequest,
  onClose,
  onRefresh,
  canStartNewRequest = true,
  isCompleted = false,
  isLoading = false,
  isBusy = false,
  errorMessage = '',
  progress,
  children,
}: Props): React.JSX.Element => {
  const shouldReturnToQuestions =
    !isCompleted &&
    canStartNewRequest &&
    (compound.status === 'ASSESSMENT_ONLY' ||
      compound.status === 'GUIDE_PENDING');
  const shouldCall119 =
    compound.call119Required ||
    compound.injuries.some(injury => injury.assessment?.call119Required);
  const reasons = [
    ...new Set(
      compound.blockedReasons.map(
        code =>
          REASON_MESSAGES[code] ??
          compound.display?.blockedReasons?.find(
            reason => reason.code === code && reason.label !== code,
          )?.label ??
          '손상 상태와 처치 안내를 다시 확인해야 해요.',
      ),
    ),
  ];
  const title = isLoading
    ? '손상 정보를 확인하고 있어요'
    : errorMessage
    ? '안내를 불러오지 못했어요'
    : isCompleted
    ? '전체 처치 완료'
    : '처치 안내를 잠시 보류했어요';
  const description = isLoading
    ? '두 손상의 평가와 저장된 진행 상태를 확인하고 있어요.'
    : errorMessage
    ? '연결 상태를 확인해 주세요.'
    : isCompleted
    ? '모든 단계의 완료가 기록되었습니다.'
    : '두 손상을 함께 고려한 처치 안내가 필요해요.\n아래 사유와 손상별 상태를 확인해 주세요.';
  const handleCall119 = (): void => {
    Linking.openURL('tel:119').catch(() =>
      Alert.alert('전화 연결 안내', '전화 앱에서 119로 직접 전화해 주세요.'),
    );
  };

  return (
    <View testID="compound-guide-status" className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pb-3 pt-5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="이전 화면으로 돌아가기"
          onPress={onClose}
          className="h-11 w-11 items-start justify-center"
        >
          <BackIcon width={24} height={24} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-body font-suitBold text-black">
          복합 손상 확인
        </Text>
        <View className="w-11" />
      </View>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-[600px] self-center px-5 pb-6">
          {shouldCall119 ? (
            <View
              accessibilityRole="alert"
              className="mb-4 rounded-2xl border border-red bg-white p-4"
            >
              <Text className="text-body font-suitBold text-red">
                119 신고가 필요합니다.
              </Text>
              <Text className="mt-2 text-body font-suitRegular leading-6 text-gray">
                처치 안내 확인과 별개로 119에 연락해 주세요.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="119 전화"
                className="mt-3 min-h-[48px] items-center justify-center rounded-xl bg-red px-4 py-3"
                onPress={handleCall119}
              >
                <Text className="text-body font-suitBold text-white">
                  119 전화하기
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View className="items-center rounded-3xl bg-white px-5 py-6">
            <View
              accessible={false}
              className="h-20 w-20 items-center justify-center rounded-full bg-camera_bg"
            >
              {isLoading ? (
                <ActivityIndicator
                  size="large"
                  color={colors.red}
                  accessibilityLabel="복합 가이드 불러오는 중"
                />
              ) : (
                <FirstAidGuideIcon width={44} height={44} />
              )}
            </View>
            <View className="mt-4 rounded-full bg-background px-3 py-1.5">
              <Text className="text-coment font-suitBold text-gray">
                {isLoading
                  ? '정보 확인 중'
                  : isCompleted
                  ? '처치 기록 완료'
                  : '복합 처치 안내'}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              className="mt-3 text-center text-title2 font-suitBold text-black"
            >
              {title}
            </Text>
            <Text className="mt-3 text-center text-body font-suitRegular leading-6 text-gray">
              {description}
            </Text>
          </View>
          {!isLoading ? (
            <>
              {!isCompleted && reasons.length ? (
                <View className="mt-4 rounded-2xl bg-white p-5">
                  <Text
                    accessibilityRole="header"
                    className="text-body font-suitBold text-black"
                  >
                    안내를 보류한 이유
                  </Text>
                  {reasons.map(label => (
                    <Text
                      key={label}
                      className="mt-3 text-body font-suitRegular leading-6 text-gray"
                    >
                      {label}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text
                accessibilityRole="header"
                className="mb-3 mt-6 text-body font-suitBold text-black"
              >
                확인 중인 손상
              </Text>
              {compound.injuries.map((injury, index) => {
                const hasCompletedInjury = progress?.injuries.some(
                  record =>
                    record.injuryId === injury.injuryId &&
                    record.status === 'COMPLETED',
                );
                const category =
                  injury.display?.category ??
                  injury.assessment?.display?.category ??
                  FIRST_AID_CATEGORIES.find(
                    item =>
                      SERVER_SYMPTOM_ID_BY_CATEGORY[item.id] ===
                      injury.categoryCode,
                  )?.label ??
                  '손상 상태';
                const issues = getCompoundAssessmentIssues(injury.assessment);
                const issueStatus = [
                  ...new Set(issues.map(issue => issue.status)),
                ].join(' · ');
                return (
                  <View
                    key={injury.injuryId}
                    testID={`compound-injury-status-${injury.injuryId}`}
                    className="mb-3 rounded-2xl bg-white p-4"
                  >
                    <View className="flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-background">
                        <Text className="text-body font-suitBold text-gray">
                          {index + 1}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-body font-suitBold text-black">
                          {category}
                        </Text>
                        <Text className="mt-1 text-coment font-suitMedium text-gray">
                          {injury.deferredReason
                            ? '손상 안내 보류'
                            : isCompleted || hasCompletedInjury
                            ? '처치 기록 완료'
                            : issues.length
                            ? issueStatus
                            : '선택한 손상'}
                        </Text>
                      </View>
                    </View>
                    {injury.assessment?.display?.subtype ? (
                      <Text className="mt-3 text-body font-suitRegular text-gray">
                        {injury.assessment.display.subtype}
                      </Text>
                    ) : null}
                    {issues.map(issue => (
                      <Text
                        key={issue.message}
                        className="mt-3 text-body font-suitMedium leading-6 text-gray"
                      >
                        {issue.message}
                      </Text>
                    ))}
                  </View>
                );
              })}
              {errorMessage ? (
                <Text
                  accessibilityRole="alert"
                  className="mt-4 text-body font-suitMedium leading-6 text-red"
                >
                  {errorMessage}
                </Text>
              ) : null}
              {children}
            </>
          ) : null}
        </View>
      </ScrollView>
      <View className="border-t border-memoLine bg-white px-5 pb-4 pt-4">
        <View className="w-full max-w-[600px] self-center">
          {!isLoading && shouldReturnToQuestions ? (
            <Text className="mb-3 text-coment font-suitRegular leading-5 text-gray">
              질문 화면으로 돌아가 손상 상태와 추가 확인에 답한 뒤 새 안내를
              요청해 주세요.
            </Text>
          ) : null}
          {canStartNewRequest && !isLoading ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                shouldReturnToQuestions ? '질문으로 돌아가기' : '새 문진 시작'
              }
              className="min-h-[52px] items-center justify-center rounded-xl bg-red px-5 py-3"
              onPress={onNewRequest}
              disabled={isBusy}
            >
              <Text className="text-body font-suitBold text-white">
                {shouldReturnToQuestions ? '질문으로 돌아가기' : '새 문진 시작'}
              </Text>
            </TouchableOpacity>
          ) : null}
          {onRefresh && !isLoading && !shouldReturnToQuestions ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="저장된 복합 가이드 다시 조회"
              accessibilityState={{ busy: isBusy, disabled: isBusy }}
              className="mt-2 min-h-[48px] flex-row items-center justify-center rounded-xl border border-memoLine px-5 py-3"
              disabled={isBusy}
              onPress={onRefresh}
            >
              {isBusy ? (
                <ActivityIndicator color={colors.red} className="mr-2" />
              ) : null}
              <Text className="text-body font-suitBold text-gray">
                {isBusy ? '확인 중' : '다시 확인'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="닫기"
            className="mt-1 min-h-[44px] items-center justify-center"
            onPress={onClose}
          >
            <Text className="text-body font-suitMedium text-gray">닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
