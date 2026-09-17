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

const readNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const readStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.map(readString);

  return strings.every((item): item is string => item !== null)
    ? strings
    : null;
};

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
  const latitude = readNumber(record.lat);
  const longitude = readNumber(record.lng);
  const name = readString(record.name);
  const phone = readString(record.phone);
  const detailPlaces = readStringArray(record.detailPlaces);

  if (
    !address ||
    distanceInKilometers === null ||
    latitude === null ||
    longitude === null ||
    !name ||
    !phone ||
    !detailPlaces
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

  const aeds = payload.data.map(readNearbyAed);

  if (!aeds.every((aed): aed is NearbyAed => aed !== null)) {
    throw new Error(INVALID_AED_RESPONSE_MESSAGE);
  }

  return aeds;
};
