import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import QRCode from 'qrcode';
import type { QRCodeSegment } from 'qrcode';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import type { RootStackParamList } from '@/navigation/RootNavigator';
import {
  createEmergencyGuideHandover,
  getEmergencyGuideErrorMessage,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type {
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideHandoverCompletedTreatment,
  EmergencyGuideHandoverUsedSupply,
  EmergencyGuideTreatmentStep,
} from '@/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QRCode'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const getQrErrorDetails = (error: unknown): Record<string, unknown> => {
  const details: Record<string, unknown> = { errorType: typeof error };

  if (error instanceof Error) {
    details.errorName = error.name;
    details.errorMessage = error.message;
  }

  if (isRecord(error)) {
    details.status =
      typeof error.status === 'number' ? error.status : undefined;
    details.errorCode = typeof error.code === 'string' ? error.code : undefined;
    details.requestUrl =
      typeof error.requestUrl === 'string' ? error.requestUrl : undefined;
  }

  return details;
};

// Hermes 일부 버전에는 TextEncoder가 없어 qrcode 문자열 입력 경로가 실패하므로 바이트 세그먼트로 전달한다.
const encodeQrText = (value: string): Uint8Array => {
  const encodedValue = encodeURIComponent(value);
  const bytes: number[] = [];

  for (let index = 0; index < encodedValue.length; index += 1) {
    if (encodedValue[index] === '%') {
      bytes.push(Number.parseInt(encodedValue.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encodedValue.charCodeAt(index));
    }
  }

  return Uint8Array.from(bytes);
};

const createQrCodeData = (value: string): QRCodeSegment[] => [
  { mode: 'byte', data: encodeQrText(value) },
];

const createLocalUsedSupplies = (
  completedSteps: EmergencyGuideTreatmentStep[],
): EmergencyGuideHandoverUsedSupply[] => {
  const quantityByName = new Map<string, number>();

  completedSteps.forEach(step => {
    const name = step.requiredItemName?.trim();
    if (!name || step.requiredQuantity <= 0) {
      return;
    }

    quantityByName.set(
      name,
      (quantityByName.get(name) ?? 0) + step.requiredQuantity,
    );
  });

  return Array.from(quantityByName, ([name, quantity]) => ({ name, quantity }));
};

export function QRCodeScreen({ navigation }: Props): React.JSX.Element {
  const guide = useEmergencyGuideStore(state => state.guide);
  const mainLabel = useEmergencyGuideStore(state => state.mainLabel);
  const completedStepIds = useEmergencyGuideStore(
    state => state.completedStepIds,
  );
  const handoverStatus = useEmergencyGuideStore(state => state.handoverStatus);
  const resetGuide = useEmergencyGuideStore(state => state.resetGuide);
  const [handover, setHandover] =
    React.useState<CreateEmergencyGuideHandoverResponse | null>(null);
  const [qrSvg, setQrSvg] = React.useState<string | null>(null);
  const [handoverError, setHandoverError] = React.useState<string | null>(null);
  const [isIssuingQr, setIsIssuingQr] = React.useState(true);
  const completedStepIdSet = React.useMemo(
    () => new Set(completedStepIds),
    [completedStepIds],
  );
  const localCompletedSteps = React.useMemo(
    () =>
      guide?.treatment.steps.filter(
        step => step.stepId !== null && completedStepIdSet.has(step.stepId),
      ) ?? [],
    [completedStepIdSet, guide?.treatment.steps],
  );

  React.useEffect(() => {
    let isActive = true;

    const issueQr = async (): Promise<void> => {
      console.warn('[EmergencyGuide QR][Issue]', {
        phase: 'start',
        sessionId: guide?.sessionId ?? null,
        handoverStatus: handoverStatus ?? 'IN_PROGRESS',
        completedStepIds,
      });

      if (!guide?.sessionId) {
        console.error('[EmergencyGuide QR][Issue Error]', {
          phase: 'session_check',
          errorCode: 'SESSION_ID_MISSING',
        });
        setHandoverError(
          '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
        );
        setIsIssuingQr(false);
        return;
      }

      try {
        const response = await createEmergencyGuideHandover(guide.sessionId, {
          status: handoverStatus ?? 'IN_PROGRESS',
          completedStepIds,
        });

        if (!isActive) {
          return;
        }

        setHandover(response);
        console.warn('[EmergencyGuide QR][Handover Ready]', {
          publicHandoverUrlLength: response.publicHandoverUrl.length,
          snapshotVersion: response.snapshot.version,
          snapshotStatus: response.snapshot.status,
          completedTreatmentsCount:
            response.snapshot.completedTreatments.length,
          usedSuppliesCount: response.snapshot.usedSupplies.length,
        });

        try {
          console.warn('[EmergencyGuide QR][Generate]', {
            phase: 'start',
            inputLength: response.publicHandoverUrl.length,
            inputEncoding: 'utf8-byte-segment',
          });
          const generatedQrSvg = await QRCode.toString(
            createQrCodeData(response.publicHandoverUrl),
            {
              type: 'svg',
              errorCorrectionLevel: 'M',
            },
          );

          if (isActive) {
            setQrSvg(generatedQrSvg);
            console.warn('[EmergencyGuide QR][Generate]', {
              phase: 'success',
              svgLength: generatedQrSvg.length,
              hasSvgRoot: generatedQrSvg.trimStart().startsWith('<svg'),
              hasSvgPath: generatedQrSvg.includes('<path'),
            });
          }
        } catch (error: unknown) {
          console.error('[EmergencyGuide QR][Generate Error]', {
            ...getQrErrorDetails(error),
          });
          if (isActive) {
            setHandoverError(
              'QR 코드 생성에 실패했습니다. 인계 요약을 직접 보여주세요.',
            );
          }
        }
      } catch (error: unknown) {
        const errorMessage = getEmergencyGuideErrorMessage(error);
        console.error('[EmergencyGuide QR][Handover Error]', {
          ...getQrErrorDetails(error),
          userMessage: errorMessage,
        });
        if (isActive) {
          setHandoverError(errorMessage);
        }
      } finally {
        if (isActive) {
          setIsIssuingQr(false);
        }
      }
    };

    issueQr();

    return () => {
      isActive = false;
    };
  }, [completedStepIds, guide?.sessionId, handoverStatus]);

  const snapshot = handover?.snapshot;
  const assessment = snapshot?.assessment ?? guide?.assessment;
  const patientContext = guide?.patientContext;
  const completedTreatments: EmergencyGuideHandoverCompletedTreatment[] =
    snapshot?.completedTreatments ??
    localCompletedSteps.map(step => ({
      stepId: step.stepId as number,
      stepNo: step.stepNo,
      instruction: step.instruction,
    }));
  const usedSupplies =
    snapshot?.usedSupplies ?? createLocalUsedSupplies(localCompletedSteps);
  const consciousness =
    snapshot?.assessment.consciousness ??
    patientContext?.consciousness ??
    'UNKNOWN';
  const ageGroup =
    snapshot?.assessment.ageGroup ?? patientContext?.ageGroup ?? 'UNKNOWN';
  const redFlags = assessment?.redFlags ?? [];

  const handleHomePress = (): void => {
    resetGuide();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <ScrollView>
        <View className="px-4 pb-[140px] pt-10">
          <Text className="text-center text-body font-suitBold text-black">
            구조대원 인계 요약
          </Text>

          <View className="mt-3 rounded-2xl bg-white p-4">
            <Text className="text-sm font-suitBold text-warning">
              판단 결과
            </Text>
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
            <Text className="text-sm font-suitBold text-warning">
              완료한 처치
            </Text>
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
            <Text className="text-sm font-suitBold text-warning">
              사용한 약품
            </Text>
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

          <View className="mt-5 items-center rounded-2xl bg-white p-6">
            {isIssuingQr ? (
              <>
                <ActivityIndicator color="#FF3A3A" />
                <Text className="mt-3 text-sm text-textDim">
                  QR을 발급하고 있습니다.
                </Text>
              </>
            ) : qrSvg ? (
              <>
                <Text className="mb-3 text-sm text-black">
                  구조대원에게 QR 코드를 보여주세요.
                </Text>
                <View className="aspect-square w-full items-center justify-center rounded-xl bg-white">
                  <SvgXml
                    height="92%"
                    onError={(error): void => {
                      console.error('[EmergencyGuide QR][Render Error]', {
                        ...getQrErrorDetails(error),
                        svgLength: qrSvg.length,
                      });
                    }}
                    testID="emergency-handover-qr"
                    width="92%"
                    xml={qrSvg}
                  />
                </View>
                <Text className="mt-3 text-center text-xs text-placeholder">
                  QR은 발급 후 30분 동안 조회할 수 있습니다.
                </Text>
              </>
            ) : (
              <Text className="text-center text-sm leading-6 text-red">
                {handoverError ?? 'QR을 발급하지 못했습니다.'}
                {'\n'}위 인계 요약을 직접 보여주세요.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View className="bg-background px-5 pb-5">
        <Pressable
          onPress={handleHomePress}
          className="h-14 items-center justify-center rounded-2xl bg-red"
        >
          <Text className="font-suitBold text-white">홈으로</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
