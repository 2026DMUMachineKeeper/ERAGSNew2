import React from 'react';
import QRCode from 'qrcode';
import type { QRCodeSegment } from 'qrcode';
import {
  createEmergencyGuideHandover,
  getEmergencyGuideErrorMessage,
} from '@/services';
import type {
  CreateEmergencyGuideHandoverResponse,
  EmergencyGuideHandoverStatus,
} from '@/types';

interface Params {
  sessionId: string | null | undefined;
  completedStepIds: number[];
  handoverStatus: EmergencyGuideHandoverStatus | null;
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
}: Params) {
  const [handover, setHandover] =
    React.useState<CreateEmergencyGuideHandoverResponse | null>(null);
  const [qrSvg, setQrSvg] = React.useState<string | null>(null);
  const [handoverError, setHandoverError] = React.useState<string | null>(null);
  const [isIssuingQr, setIsIssuingQr] = React.useState(true);
  const [isHandoverUnavailable, setIsHandoverUnavailable] =
    React.useState(false);

  React.useEffect(() => {
    let isActive = true;

    const issueQr = async (): Promise<void> => {
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
        setIsIssuingQr(false);
        return;
      }

      if (completedStepIds.length === 0) {
        setIsHandoverUnavailable(true);
        setIsIssuingQr(false);
        return;
      }

      setIsHandoverUnavailable(false);

      try {
        const response = await createEmergencyGuideHandover(sessionId, {
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
  }, [completedStepIds, sessionId, handoverStatus]);

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
