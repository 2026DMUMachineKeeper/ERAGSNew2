import type { NearbyHospital } from '@/types';

import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import { authenticatedFetch } from './authenticatedFetch.service';
import {
  ApiRequestError,
  createApiRequestError,
  readApiRequestError,
} from './apiError.service';

type Coordinates = { latitude: number; longitude: number };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const getRequestErrorLog = (error: unknown): Record<string, unknown> => {
  if (error instanceof ApiRequestError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
      name: error.name,
      status: error.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { error };
};

const readNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isBedOccupancy = (value: unknown): value is number | null =>
  value === null ||
  (typeof value === 'number' && Number.isInteger(value));

const getValueType = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  return Array.isArray(value) ? 'array' : typeof value;
};

const getInvalidHospitalFields = (value: unknown): string[] => {
  if (!isRecord(value)) {
    return ['record'];
  }

  const distance = readNumber(value.distance);
  const invalidFields: string[] = [];

  if (typeof value.name !== 'string' || !value.name.trim()) {
    invalidFields.push(`name(${getValueType(value.name)})`);
  }
  if (typeof value.address !== 'string') {
    invalidFields.push(`address(${getValueType(value.address)})`);
  }
  if (typeof value.hpid !== 'string' || !value.hpid.trim()) {
    invalidFields.push(`hpid(${getValueType(value.hpid)})`);
  }
  if (distance === null) {
    invalidFields.push(`distance(${getValueType(value.distance)})`);
  }
  if (typeof value.isRealTimeAvailable !== 'boolean') {
    invalidFields.push(
      `isRealTimeAvailable(${getValueType(value.isRealTimeAvailable)})`,
    );
  }
  if (!isBedOccupancy(value.availableBeds)) {
    invalidFields.push(`availableBeds(${getValueType(value.availableBeds)})`);
  }
  if (!isBedOccupancy(value.operatingRoomBeds)) {
    invalidFields.push(
      `operatingRoomBeds(${getValueType(value.operatingRoomBeds)})`,
    );
  }
  if (typeof value.ctAvailable !== 'boolean') {
    invalidFields.push(`ctAvailable(${getValueType(value.ctAvailable)})`);
  }
  if (typeof value.mriAvailable !== 'boolean') {
    invalidFields.push(`mriAvailable(${getValueType(value.mriAvailable)})`);
  }

  return invalidFields;
};

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
    !isBedOccupancy(value.availableBeds) ||
    !isBedOccupancy(value.operatingRoomBeds) ||
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
  const path = `/api/v1/facilities/hospitals?${query.toString()}`;

  console.warn('[Hospital API][Request]', { latitude, longitude, path });

  try {
    const response = await authenticatedFetch({
      getAccessToken: getAuthToken,
      init: { method: 'GET' },
      isAccessTokenExpiredError: isAuthTokenExpiredError,
      path,
      refreshAccessToken: async (): Promise<string> =>
        (await refreshAuthTokens()).accessToken,
    });

    console.warn('[Hospital API][Response]', {
      ok: response.ok,
      status: response.status,
    });

    if (!response.ok) {
      throw await readApiRequestError(
        response,
        '주변 병원 정보를 불러오지 못했습니다.',
      );
    }

    const payload = (await response.json()) as unknown;
    console.warn('[Hospital API][Response Body]', {
      dataCount: isRecord(payload) && Array.isArray(payload.data)
        ? payload.data.length
        : null,
      hasDataArray: isRecord(payload) && Array.isArray(payload.data),
      success: isRecord(payload) ? payload.success : null,
    });

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
      console.error('[Hospital API][Invalid Records]', {
        records: payload.data
          .map((item, index) => ({
            fields: getInvalidHospitalFields(item),
            hpid: isRecord(item) && typeof item.hpid === 'string'
              ? item.hpid
              : null,
            index,
            name: isRecord(item) && typeof item.name === 'string'
              ? item.name
              : null,
          }))
          .filter(record => record.fields.length > 0),
      });
      throw new Error('주변 병원 정보 응답 형식이 올바르지 않습니다.');
    }

    console.warn('[Hospital API][Success]', { hospitalCount: hospitals.length });
    return hospitals;
  } catch (error: unknown) {
    console.error('[Hospital API][Failure]', {
      latitude,
      longitude,
      path,
      ...getRequestErrorLog(error),
    });
    throw error;
  }
};
