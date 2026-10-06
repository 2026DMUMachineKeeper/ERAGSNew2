import type { NearbyAed } from '@/types';

import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import { authenticatedFetch } from './authenticatedFetch.service';
import { createApiRequestError, readApiRequestError } from './apiError.service';

const INVALID_AED_RESPONSE_MESSAGE =
  '주변 AED 정보 응답 형식이 올바르지 않습니다.';

type NearbyAedCoordinates = {
  latitude: number;
  longitude: number;
};

type AedApiRecord = {
  address: unknown;
  detailPlaces: unknown;
  distance: unknown;
  lat: unknown;
  lng: unknown;
  name: unknown;
  phone: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

// Number(null)과 Number('')는 0이 되어 (0, 0) 좌표로 표시되므로 숫자와 비어 있지 않은 문자열만 허용합니다.
const readNumber = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : NaN;

  return Number.isFinite(parsed) ? parsed : null;
};

const readCoordinate = (value: unknown, limit: number): number | null => {
  const coordinate = readNumber(value);

  return coordinate !== null && Math.abs(coordinate) <= limit
    ? coordinate
    : null;
};

// 상세 위치는 부가 정보이므로 형식이 맞지 않는 항목만 제외합니다.
const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(readString)
        .filter((item): item is string => item !== null)
    : [];

const readNearbyAed = (value: unknown): NearbyAed | null => {
  if (!isRecord(value)) {
    return null;
  }

  const record: AedApiRecord = {
    address: value.address,
    detailPlaces: value.detailPlaces,
    distance: value.distance,
    lat: value.lat,
    lng: value.lng,
    name: value.name,
    phone: value.phone,
  };
  const address = readString(record.address);
  const distanceInKilometers = readNumber(record.distance);
  const latitude = readCoordinate(record.lat, 90);
  const longitude = readCoordinate(record.lng, 180);
  const name = readString(record.name);
  // 전화번호와 상세 위치가 없는 AED도 위치 안내에는 필요하므로 선택 항목으로 처리합니다.
  const phone = readString(record.phone) ?? '';
  const detailPlaces = readStringArray(record.detailPlaces);

  if (
    !address ||
    distanceInKilometers === null ||
    latitude === null ||
    longitude === null ||
    !name
  ) {
    return null;
  }

  return {
    address,
    detailPlaces,
    distanceInMeters: distanceInKilometers * 1000,
    latitude,
    longitude,
    name,
    phone,
  };
};

export const fetchNearbyAeds = async ({
  latitude,
  longitude,
}: NearbyAedCoordinates): Promise<NearbyAed[]> => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('AED 조회 위치 정보가 올바르지 않습니다.');
  }

  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const response = await authenticatedFetch({
    getAccessToken: getAuthToken,
    init: { method: 'GET' },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path: `/api/v1/facilities/aeds?${query.toString()}`,
    refreshAccessToken: async (): Promise<string> =>
      (
        await refreshAuthTokens()
      ).accessToken,
  });

  if (!response.ok) {
    throw await readApiRequestError(
      response,
      '주변 AED 정보를 불러오지 못했습니다.',
    );
  }

  const payload = (await response.json()) as unknown;

  if (!isRecord(payload) || payload.success !== true) {
    throw createApiRequestError(
      payload,
      response.status,
      '주변 AED 정보를 불러오지 못했습니다.',
    );
  }

  if (!Array.isArray(payload.data)) {
    throw new Error(INVALID_AED_RESPONSE_MESSAGE);
  }

  const aeds = payload.data
    .map(readNearbyAed)
    .filter((aed): aed is NearbyAed => aed !== null);

  // 일부 레코드가 잘못되어도 나머지 AED는 보여 주고, 전부 잘못된 경우만 응답 형식 오류로 봅니다.
  if (aeds.length === 0 && payload.data.length > 0) {
    throw new Error(INVALID_AED_RESPONSE_MESSAGE);
  }
  if (aeds.length < payload.data.length) {
    console.warn(
      `[aed.service] 형식이 맞지 않는 AED ${
        payload.data.length - aeds.length
      }건을 제외했습니다.`,
    );
  }

  return aeds;
};
