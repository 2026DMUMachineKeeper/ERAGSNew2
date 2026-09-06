import React from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import type { EmergencyGuideRuntimeStep } from '../../constants/emergencyGuideData';

type StepDetailStep = Partial<EmergencyGuideRuntimeStep> & {
  description?: string;
};

type Props = {
  step?: StepDetailStep | null;
  onStopPress?: () => void;
};

const getInstructionFromTitle = (title: string) =>
  title.replace(/^\d+\s*단계:\s*/, '').trim();

export const StepDetail = ({ step, onStopPress }: Props): React.JSX.Element => {
  const [failedImageResource, setFailedImageResource] = React.useState<
    string | null
  >(null);
  const [showStopModal, setShowStopModal] = React.useState(false);
  const imageResource = step?.imageResource?.trim() ?? '';
  const hasImageLoadError = failedImageResource === imageResource;
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
  const requiredSupply =
    requiredItemName && requiredQuantity > 0
      ? `${requiredItemName} x${requiredQuantity}`
      : null;

  return (
    <View className="flex-1 px-4 pt-2">
      <View className="relative min-h-[84px] justify-center items-center">
        <View className="items-center justify-center">
          <Text className="text-xl text-red">{stepNo}단계</Text>
          <Text className="text-2xl font-bold text-black mt-2 text-center">
            {instruction}
          </Text>
        </View>

        <TouchableOpacity
          className="absolute right-0 top-0 px-2.5 py-1.5 rounded-full border border-red bg-backgroud"
          onPress={() => setShowStopModal(true)}
        >
          <Text className="text-dangerText text-xs font-bold">
            응급처치 중단
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showStopModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStopModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[320px] rounded-2xl bg-white border border-white px-5 py-5">
            <View className="mb-4">
              <Text className="text-lg font-bold text-black text-center">
                응급처치를 중단하시겠습니까?
              </Text>
              <Text className="mt-3 text-sm text-black text-center leading-5">
                중단하면 현재 안내를 종료하고 구조대원 인계 페이지로 이동합니다.
              </Text>
            </View>

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                className="flex-1 h-12 rounded-xl border border-borderSubtle items-center justify-center"
                onPress={() => setShowStopModal(false)}
              >
                <Text className="text-black font-bold">취소</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 h-12 rounded-xl bg-red items-center justify-center"
                onPress={() => {
                  setShowStopModal(false);
                  onStopPress?.();
                }}
              >
                <Text className="text-white font-bold">중단</Text>
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

      <View className="mt-6 items-center">
        <View className="h-[200px] w-[260px] items-center justify-center overflow-hidden rounded-lg bg-offWhite">
          {imageResource && !hasImageLoadError ? (
            <Image
              key={imageResource}
              accessibilityLabel={`${stepNo}단계 응급처치 이미지`}
              className="h-full w-full"
              resizeMode="contain"
              source={{ uri: imageResource }}
              onLoadStart={(): void => {
                console.warn('[EmergencyGuide Image][Request]', {
                  requestUrl: imageResource,
                });
              }}
              onLoad={(): void => {
                console.warn('[EmergencyGuide Image][Response]', {
                  requestUrl: imageResource,
                  status: 'LOADED',
                });
              }}
              onError={(event): void => {
                setFailedImageResource(imageResource);
                console.error('[EmergencyGuide Image][Response]', {
                  requestUrl: imageResource,
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

      {requiredSupply ? (
        <View className="mt-6">
          <Text className="text-black text-sm">필요한 약품</Text>
          <View className="flex-row items-center mt-3">
            <View className="bg-red px-4 py-2 rounded-full">
              <Text className="text-white">{requiredSupply}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};
