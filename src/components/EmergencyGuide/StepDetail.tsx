import React from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import type { EmergencyGuideRuntimeStep } from '../../constants/emergencyGuideData';

type StepDetailStep = Partial<EmergencyGuideRuntimeStep> & {
  description?: string;
};

type Props = {
  step?: StepDetailStep | null;
  isStepCompleted?: boolean;
  onStopPress?: (hasCompletedCurrentStep: boolean) => void;
  images?: readonly { uri: string; label?: string }[];
  supplies?: readonly { name: string; quantity: number }[];
  stopFooterText?: string;
  canCompleteOnStop?: boolean;
};

const getInstructionFromTitle = (title: string) =>
  title.replace(/^\d+\s*단계:\s*/, '').trim();

export const StepDetail = ({
  step,
  isStepCompleted = false,
  onStopPress,
  images,
  supplies,
  stopFooterText = '완료한 처치만 기록하여 구조대원 인계 페이지로 이동합니다.',
  canCompleteOnStop = true,
}: Props): React.JSX.Element => {
  const [isStopModalVisible, setIsStopModalVisible] = React.useState(false);
  const imageResource = step?.imageResource?.trim() ?? '';
  const title = typeof step?.title === 'string' ? step.title : '';
  const stepNo =
    typeof step?.stepNo === 'number'
      ? step.stepNo
      : Number(title.match(/\d+/)?.[0] ?? 1);
  const instruction =
    step?.instruction?.trim() ||
    getInstructionFromTitle(title) ||
    '응급처치 안내';
  const checkpointQuestion =
    step?.checkpointQuestion?.trim() ||
    step?.description?.trim() ||
    '현재 단계를 확인하고 다음 안내를 진행하세요.';
  const requiredItemName = step?.requiredItemName?.trim() ?? '';
  const requiredQuantity = step?.requiredQuantity ?? 0;
  const requiredSupplies =
    supplies ??
    (requiredItemName && requiredQuantity > 0
      ? [{ name: requiredItemName, quantity: requiredQuantity }]
      : []);

  return (
    <View className="px-4 pt-2">
      <View className="items-end">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="응급처치 중단"
          className="px-2.5 py-1.5 rounded-full border border-red bg-backgroud"
          onPress={() => setIsStopModalVisible(true)}
        >
          <Text className="text-dangerText text-xs font-bold">
            응급처치 중단
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-2 items-center justify-center">
        <Text className="text-xl text-red">{stepNo}단계</Text>
        <Text className="text-2xl font-bold text-black mt-2 text-center">
          {instruction}
        </Text>
      </View>

      <Modal
        visible={isStopModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStopModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[320px] rounded-2xl bg-white border border-white px-5 py-5">
            <View className="mb-4">
              <Text className="text-lg font-bold text-black text-center">
                응급처치를 중단하시겠습니까?
              </Text>
              <Text className="mt-3 text-sm text-black text-center leading-5">
                {isStepCompleted
                  ? `${stepNo}단계는 이미 완료로 기록되어 있습니다.`
                  : `현재 ${stepNo}단계의 처치를 완료했나요?`}
                {'\n'}
                {stopFooterText}
              </Text>
            </View>

            <View className="mt-5 gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  isStepCompleted ? '중단' : '완료했어요 · 중단'
                }
                disabled={!canCompleteOnStop && !isStepCompleted}
                className={`h-12 rounded-xl ${
                  !canCompleteOnStop && !isStepCompleted
                    ? 'bg-disabled'
                    : 'bg-red'
                } items-center justify-center`}
                onPress={() => {
                  setIsStopModalVisible(false);
                  onStopPress?.(true);
                }}
              >
                <Text className="text-white font-suitBold">
                  {isStepCompleted ? '중단' : '완료했어요 · 중단'}
                </Text>
              </TouchableOpacity>

              {!isStepCompleted ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="아직 안 했어요 · 중단"
                  className="h-12 rounded-xl border border-borderSubtle items-center justify-center"
                  onPress={() => {
                    setIsStopModalVisible(false);
                    onStopPress?.(false);
                  }}
                >
                  <Text className="text-black font-suitBold">
                    아직 안 했어요 · 중단
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="취소"
                className="h-12 items-center justify-center"
                onPress={() => setIsStopModalVisible(false)}
              >
                <Text className="text-black font-suitBold">취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View className="mt-6">
        <Text className="text-black text-base leading-6">
          {checkpointQuestion}
        </Text>
      </View>

      {(images?.length ? images : [{ uri: imageResource }]).map(
        (image, index) => (
          <StepImage
            key={`${image.uri}:${index}`}
            uri={image.uri}
            label={image.label}
            stepNo={stepNo}
          />
        ),
      )}

      {requiredSupplies.length ? (
        <View className="mt-6">
          <Text className="text-black text-sm">필요한 약품</Text>
          <View className="flex-row items-center mt-3">
            {requiredSupplies.map((supply, index) => (
              <View
                key={`${supply.name}:${index}`}
                className="mr-2 bg-red px-4 py-2 rounded-full"
              >
                <Text className="text-white">
                  {supply.name} x{supply.quantity}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const StepImage = ({
  uri,
  label,
  stepNo,
}: {
  uri: string;
  label?: string;
  stepNo: number;
}): React.JSX.Element => {
  const [failedImageResource, setFailedImageResource] = React.useState<
    string | null
  >(null);
  const hasImageLoadError = failedImageResource === uri;
  return (
    <View className="mt-6 items-center">
      <View className="h-[200px] w-[260px] items-center justify-center overflow-hidden rounded-lg bg-background">
        {uri && !hasImageLoadError ? (
          <Image
            key={uri}
            accessibilityLabel={`${stepNo}단계 응급처치 이미지${
              label ? ` · ${label}` : ''
            }`}
            className="h-full w-full"
            resizeMode="contain"
            source={{ uri: uri }}
            onLoadStart={(): void => {
              console.warn('[EmergencyGuide Image][Request]', {
                requestUrl: uri,
              });
            }}
            onLoad={(): void => {
              console.warn('[EmergencyGuide Image][Response]', {
                requestUrl: uri,
                status: 'LOADED',
              });
            }}
            onError={(event): void => {
              setFailedImageResource(uri);
              console.error('[EmergencyGuide Image][Response]', {
                requestUrl: uri,
                status: 'FAILED',
                error: event.nativeEvent.error,
              });
            }}
          />
        ) : (
          <Text className="px-5 text-center text-sm font-suitMedium leading-5 text-gray">
            {hasImageLoadError
              ? '이미지를 불러오지 못했습니다. 텍스트 안내에 따라 진행해 주세요.'
              : '제공된 이미지가 없습니다.'}
          </Text>
        )}
      </View>
    </View>
  );
};
