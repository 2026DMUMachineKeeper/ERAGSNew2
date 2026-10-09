// 서비스 인덱스를 거치면 화면이 TTS 등 무관한 네이티브 모듈까지 로드하므로 필요한 모듈만 직접 가져옵니다.
import { reportEmergencySessionLocation } from '@/services/emergencyGuide.service';
import { hasLocationPermission } from '@/services/location.service';
import type { EmergencySessionLocationReport } from '@/types';

import {
  getCurrentPosition,
  isLocationPermissionDeniedError,
} from './currentPosition';

const reportedSessionIds = new Set<string>();

const toObservedAt = (timestamp?: number): string =>
  new Date(
    typeof timestamp === 'number' && Number.isFinite(timestamp)
      ? timestamp
      : Date.now(),
  ).toISOString();

const createUnavailableReport = (
  status: Exclude<EmergencySessionLocationReport['status'], 'AVAILABLE'>,
): EmergencySessionLocationReport => ({
  status,
  observedAt: toObservedAt(),
  latitude: null,
  longitude: null,
  accuracy: null,
});

// 권한이 없거나 GPS 조회에 실패해도 서버에는 사유(DENIED/UNAVAILABLE)를 좌표 null로 보고합니다.
export const collectEmergencySessionLocation =
  async (): Promise<EmergencySessionLocationReport> => {
    if (!(await hasLocationPermission())) {
      return createUnavailableReport('DENIED');
    }

    try {
      const { coords, timestamp } = await getCurrentPosition();

      if (
        !Number.isFinite(coords.latitude) ||
        !Number.isFinite(coords.longitude)
      ) {
        return createUnavailableReport('UNAVAILABLE');
      }

      return {
        status: 'AVAILABLE',
        observedAt: toObservedAt(timestamp),
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy:
          typeof coords.accuracy === 'number' &&
          Number.isFinite(coords.accuracy)
            ? coords.accuracy
            : null,
      };
    } catch (error: unknown) {
      return createUnavailableReport(
        isLocationPermissionDeniedError(error) ? 'DENIED' : 'UNAVAILABLE',
      );
    }
  };

// 응급 가이드 세션이 만들어질 때 한 번만 호출합니다. 가이드 흐름과 독립적으로 동작하며
// 실패해도 사용자에게 알리지 않고 로그만 남깁니다(관제에서 5초 주기로 조회).
export const reportEmergencySessionLocationOnce = async (
  sessionId: string | null | undefined,
): Promise<void> => {
  const normalizedSessionId = sessionId?.trim() ?? '';

  if (!normalizedSessionId || reportedSessionIds.has(normalizedSessionId)) {
    return;
  }

  reportedSessionIds.add(normalizedSessionId);

  try {
    const report = await collectEmergencySessionLocation();
    console.warn('[EmergencySessionLocation]', {
      sessionId: normalizedSessionId,
      status: report.status,
      accuracy: report.accuracy,
    });
    await reportEmergencySessionLocation(normalizedSessionId, report);
  } catch (error: unknown) {
    console.warn('[EmergencySessionLocation] 세션 위치 보고 실패:', {
      sessionId: normalizedSessionId,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
};
