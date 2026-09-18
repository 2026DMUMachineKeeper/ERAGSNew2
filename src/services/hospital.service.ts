import type { NearbyHospital } from '@/types';

import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import { authenticatedFetch } from './authenticatedFetch.service';
import { createApiRequestError, readApiRequestError } from './apiError.service';

type Coordinates = { latitude: number; longitude: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const readNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isBedCount = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === 'number' && Number.isInteger(value) && value >= 0);

const readHospital = (value: unknown): NearbyHospital | null => {
  if (!isRecord(value)) {
    return null;
  }

  const distance = readNumber(value.distance);

  if (
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    typeof value.address !== 'string' ||
    typeof value.hpid !== 'string' ||
    !value.hpid.trim() ||
    distance === null ||
    typeof value.isRealTimeAvailable !== 'boolean' ||
    !isBedCount(value.availableBeds) ||
    !isBedCount(value.operatingRoomBeds) ||
    typeof value.ctAvailable !== 'boolean' ||
    typeof value.mriAvailable !== 'boolean'
  ) {
    return null;
  }

  return {
    address: value.address,
    availableBeds: value.availableBeds,
    ctAvailable: value.ctAvailable,
    distanceInMeters: distance * 1000,
    hpid: value.hpid,
    isRealTimeAvailable: value.isRealTimeAvailable,
    mriAvailable: value.mriAvailable,
    name: value.name,
    operatingRoomBeds: value.operatingRoomBeds,
  };
};

export const fetchNearbyHospitals = async ({
  latitude,
  longitude,
}: Coordinates): Promise<NearbyHospital[]> => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('병원 조회 위치 정보가 올바르지 않습니다.');
  }

  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const response = await authenticatedFetch({
    getAccessToken: getAuthToken,
    init: { method: 'GET' },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path: `/api/v1/facilities/hospitals?${query.toString()}`,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
  });

  if (!response.ok) {
    throw await readApiRequestError(
      response,
      '주변 병원 정보를 불러오지 못했습니다.',
    );
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || payload.success !== true) {
    throw createApiRequestError(
      payload,
      response.status,
      '주변 병원 정보를 불러오지 못했습니다.',
    );
  }

  if (!Array.isArray(payload.data)) {
    throw new Error('주변 병원 정보 응답 형식이 올바르지 않습니다.');
  }

  const hospitals = payload.data.map(readHospital);
  if (!hospitals.every((hospital): hospital is NearbyHospital => hospital !== null)) {
    throw new Error('주변 병원 정보 응답 형식이 올바르지 않습니다.');
  }

  return hospitals;
};
