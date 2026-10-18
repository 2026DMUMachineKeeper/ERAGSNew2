import React from 'react';
import QRCode from 'qrcode';
import type { QRCodeSegment } from 'qrcode';
import {
  createEmergencyGuideHandover,
  getEmergencyGuideErrorMessage,
  getEmergencyWasteGuide,
  fetchMedicines,
} from '@/services';
import { useEmergencyGuideStore } from '@/store';
import type {
  CreateEmergencyGuideHandoverResponse,
  CompoundGuideSnapshot,
  EmergencyGuideHandoverStatus,
} from '@/types';
import {
  hasMatchingCompoundHandover,
  getCompoundHandoverSupplyNames,
  isCompoundTreatmentCompleted,
} from '@/utils/compoundHandover';

interface Params {
  sessionId: string | null | undefined;
  completedStepIds: number[];
  handoverStatus: EmergencyGuideHandoverStatus | null;
  compoundSnapshot?: CompoundGuideSnapshot | null;
  isCompound?: boolean;
}

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

export function useEmergencyHandoverQr({
  sessionId,
  completedStepIds,
  handoverStatus,
  compoundSnapshot,
  isCompound = false,
}: Params) {
  const [handover, setHandover] =
    React.useState<CreateEmergencyGuideHandoverResponse | null>(null);
  const [qrSvg, setQrSvg] = React.useState<string | null>(null);
  const [handoverError, setHandoverError] = React.useState<string | null>(null);
  const [isIssuingQr, setIsIssuingQr] = React.useState(true);
  const [isHandoverUnavailable, setIsHandoverUnavailable] =
    React.useState(false);
  const setWasteGuide = useEmergencyGuideStore(state => state.setWasteGuide);
  const setWasteGuideError = useEmergencyGuideStore(
    state => state.setWasteGuideError,
  );
  const setWasteGuideLoading = useEmergencyGuideStore(
    state => state.setWasteGuideLoading,
  );

  React.useEffect(() => {
    let isActive = true;
    const guideAtRequestStart = useEmergencyGuideStore.getState().guide;
    // 이전 화면의 응답이 새 응급 가이드의 전역 상태를 덮어쓰지 않도록 요청 당시 가이드를 확인한다.
    const isCurrentGuide = (): boolean =>
      isActive &&
      useEmergencyGuideStore.getState().guide === guideAtRequestStart &&
      guideAtRequestStart?.sessionId === sessionId;

    const issueQr = async (): Promise<void> => {
      setHandover(null);
      setQrSvg(null);
      setHandoverError(null);
      setIsIssuingQr(true);
      setIsHandoverUnavailable(false);
      console.warn('[EmergencyGuide QR][Issue]', {
        phase: 'start',
        sessionId: sessionId ?? null,
        handoverStatus: handoverStatus ?? 'IN_PROGRESS',
        completedStepIds,
      });

      if (!sessionId) {
        console.error('[EmergencyGuide QR][Issue Error]', {
          phase: 'session_check',
          errorCode: 'SESSION_ID_MISSING',
        });
        setHandoverError(
          '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
        );
        setWasteGuideError(
          '응급 가이드 세션을 찾을 수 없습니다. 새 응급 요청을 시작해 주세요.',
        );
        setIsIssuingQr(false);
        return;
      }

      if (
        isCompound &&
        (compoundSnapshot?.sessionId !== sessionId ||
          (handoverStatus === 'COMPLETED' &&
            !isCompoundTreatmentCompleted(compoundSnapshot)))
      ) {
        const message =
          '복합 처치의 전체 완료 기록을 확인하지 못했습니다. 가이드에서 진행 상태를 확인해 주세요.';
        setHandoverError(message);
        setWasteGuideError(message);
        setIsIssuingQr(false);
        return;
      }

      if (
        isCompound
          ? !compoundSnapshot?.progress?.completedStepIds.length
          : completedStepIds.length === 0
      ) {
        setWasteGuide([]);
        setIsHandoverUnavailable(true);
        setIsIssuingQr(false);
        return;
      }

      setWasteGuideLoading();
      setIsHandoverUnavailable(false);

      const loadWasteGuide = async (): Promise<void> => {
        try {
          const wasteGuideResponse = await getEmergencyWasteGuide(sessionId);
          if (isCurrentGuide()) {
            if (
              isCompound &&
              compoundSnapshot?.usedSupplies.length &&
              !wasteGuideResponse.data.length
            ) {
              setWasteGuideError(
                '실제 사용한 물품에 대한 폐기물 안내가 서버 응답에 없습니다.',
              );
            } else {
              setWasteGuide(wasteGuideResponse.data);
            }
          }
        } catch (error: unknown) {
          if (isCurrentGuide()) {
            const errorMessage = getEmergencyGuideErrorMessage(error);
            console.error('[EmergencyGuide QR][Waste Guide Error]', {
              ...getQrErrorDetails(error),
              userMessage: errorMessage,
            });
            setWasteGuideError(errorMessage);
          }
        }
      };

      try {
        // 복합 실행 ID를 숫자로 바꾸면 기록이 섞입니다. 기존 API의 복합 지원은 서버 저장 기록을 읽어야 하며 응답도 검증합니다.
        const response = await createEmergencyGuideHandover(sessionId, {
          status: isCompound
            ? isCompoundTreatmentCompleted(compoundSnapshot)
              ? 'COMPLETED'
              : 'IN_PROGRESS'
            : handoverStatus ?? 'IN_PROGRESS',
          completedStepIds: isCompound ? [] : completedStepIds,
        });

        if (!isCurrentGuide()) {
          return;
        }

        let hasMatchingHandover =
          !isCompound || !compoundSnapshot ||
          hasMatchingCompoundHandover(compoundSnapshot, response.snapshot);
        if (isCompound && compoundSnapshot && !hasMatchingHandover) {
          const names = getCompoundHandoverSupplyNames(compoundSnapshot);
          const missingIds = [
            ...new Set(compoundSnapshot.usedSupplies.map(unit => unit.itemId)),
          ].filter(itemId => !names.has(itemId));
          if (missingIds.length > 0) {
            // 물품명이 선택 사항인 저장 세션도 ID로 조회해 대조하며 수량만으로 물품을 추측하지 않습니다.
            const medicines = await fetchMedicines();
            if (!isCurrentGuide()) {
              return;
            }
            missingIds.forEach(itemId => {
              const name = medicines
                .find(medicine => medicine.id === String(itemId))
                ?.name.trim();
              if (name) {
                names.set(itemId, name);
              }
            });
            hasMatchingHandover = hasMatchingCompoundHandover(
              compoundSnapshot,
              response.snapshot,
              names,
            );
          }
        }

        if (isCompound && compoundSnapshot && !hasMatchingHandover) {
          console.error('[EmergencyGuide QR][Handover Error]', {
            errorCode: 'COMPOUND_HANDOVER_RECORD_MISMATCH',
            completedExecutionCount:
              compoundSnapshot.progress?.completedStepIds.length,
            handoverTreatmentCount:
              response.snapshot.completedTreatments.length,
            usedUnitCount: compoundSnapshot.usedSupplies.length,
            handoverSupplyCount: response.snapshot.usedSupplies.length,
          });
          const message =
            '서버 인계장에 복합 처치 완료 기록 또는 사용 물품이 일치하지 않아 QR을 표시하지 않았습니다. 아래 인계 요약을 직접 보여주세요.';
          setHandoverError(message);
          setWasteGuideError(
            '복합 처치 사용 기록이 인계장에 반영되지 않아 폐기물 안내를 확인할 수 없습니다.',
          );
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

        loadWasteGuide();

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

          if (isCurrentGuide()) {
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
          if (isCurrentGuide()) {
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
        if (isCurrentGuide()) {
          setHandoverError(errorMessage);
          if (isCompound) {
            loadWasteGuide();
          } else {
            setWasteGuideError(errorMessage);
          }
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
  }, [
    completedStepIds,
    compoundSnapshot,
    isCompound,
    handoverStatus,
    sessionId,
    setWasteGuide,
    setWasteGuideError,
    setWasteGuideLoading,
  ]);

  const handleQrRenderError = (error: Error): void => {
    console.error('[EmergencyGuide QR][Render Error]', {
      ...getQrErrorDetails(error),
      svgLength: qrSvg?.length,
    });
  };

  return {
    handover,
    qrSvg,
    handoverError,
    isIssuingQr,
    isHandoverUnavailable,
    handleQrRenderError,
  };
}
