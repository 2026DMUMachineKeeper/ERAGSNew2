import type { MedicineItem } from '@/types';

import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import { authenticatedFetch } from './authenticatedFetch.service';
import { readApiRequestError } from './apiError.service';

const MEDICINE_IMAGE_UPLOAD_TIMEOUT_MS = 60_000;
const INVALID_MEDICINE_RESPONSE_MESSAGE =
  '약품 목록 응답 형식이 올바르지 않습니다.';

export type MedicineApiRecord = {
  id?: string | number;
  medicineId?: string | number;
  medicine_id?: string | number;
  name?: string;
  info?: string;
  description?: string;
  detail?: string;
  usage?: string | null;
  efficacy?: string | null;
  barcode?: string | null;
  qty?: number | string;
  quantity?: number | string;
  count?: number | string;
  stock?: number | string;
  threshold?: number | string;
  [key: string]: unknown;
};



const authenticatedMedicineFetch = async (
  path: string,
  init: RequestInit = {},
  hasJsonBody = false,
  timeoutMs?: number,
): Promise<Response> => {
  return authenticatedFetch({
    getAccessToken: getAuthToken,
    init: {
      ...init,
      headers: {
        ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    },
    isAccessTokenExpiredError: isAuthTokenExpiredError,
    path,
    refreshAccessToken: async (): Promise<string> =>
      (await refreshAuthTokens()).accessToken,
    timeoutMs,
  });
};

const readString = (
  record: MedicineApiRecord,
  keys: string[],
  fallback: string,
) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
};

const readOptionalString = (record: MedicineApiRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    if (value === null) {
      return null;
    }
  }

  return null;
};

const readNumber = (
  record: MedicineApiRecord,
  keys: string[],
  fallback: number,
) => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const readIdentifier = (record: MedicineApiRecord): string => {
  const id = record.id ?? record.medicineId ?? record.medicine_id;

  if (typeof id === 'string' && id.trim().length > 0) {
    return id;
  }

  if (typeof id === 'number' && Number.isFinite(id)) {
    return String(id);
  }

  return readString(record, ['name', 'medicineName', 'itemName'], 'unknown');
};

const isRecord = (payload: unknown): payload is Record<string, unknown> => {
  return payload !== null && typeof payload === 'object';
};

const readRecordArray = (payload: unknown): MedicineApiRecord[] | null => {
  if (!Array.isArray(payload)) {
    return null;
  }

  if (!payload.every(isRecord)) {
    throw new Error(INVALID_MEDICINE_RESPONSE_MESSAGE);
  }

  return payload;
};

const readMedicineRecords = (payload: unknown): MedicineApiRecord[] => {
  const rootRecords = readRecordArray(payload);
  if (rootRecords) {
    return rootRecords;
  }

  if (!isRecord(payload)) {
    throw new Error(INVALID_MEDICINE_RESPONSE_MESSAGE);
  }

  const dataRecords = readRecordArray(payload.data);
  if (dataRecords) {
    return dataRecords;
  }

  const data = payload.data;
  const candidates = [
    ...(isRecord(data)
      ? [data.medicines, data.items, data.list, data.content, data.results]
      : []),
    payload.medicines,
    payload.items,
    payload.list,
    payload.content,
    payload.results,
  ];

  for (const candidate of candidates) {
    const records = readRecordArray(candidate);
    if (records) {
      return records;
    }
  }

  throw new Error(INVALID_MEDICINE_RESPONSE_MESSAGE);
};

export const normalizeMedicine = (record: MedicineApiRecord): MedicineItem => ({
  id: readIdentifier(record),
  name: readString(record, ['name', 'medicineName', 'itemName'], '이름 없음'),
  info:
    readString(record, ['info', 'description', 'detail', 'memo'], '').trim() ||
    [
      readString(record, ['usage'], '').trim(),
      readString(record, ['efficacy'], '').trim(),
    ]
      .filter(Boolean)
      .join(' · ') ||
    '설명 없음',
  qty: readNumber(record, ['qty', 'quantity', 'count', 'stock'], 0),
  threshold: readNumber(record, ['threshold'], 0),
  barcode: readOptionalString(record, ['barcode']),
  usage: readString(record, ['usage'], '정보 없음'),
  efficacy: readString(record, ['efficacy'], '정보 없음'),
});

export async function fetchMedicines(): Promise<MedicineItem[]> {
  const response = await authenticatedMedicineFetch('/api/medicines', {
    method: 'GET',
  });

  if (!response.ok) {
    throw await readApiRequestError(response, '약품 조회에 실패했습니다.');
  }

  const payload = (await response.json()) as unknown;
  return readMedicineRecords(payload).map(normalizeMedicine);
}

export async function fetchMedicineById(id: string): Promise<MedicineItem> {
  const medicine = (await fetchMedicines()).find(item => item.id === id);

  if (!medicine) {
    throw new Error('약품 정보를 찾을 수 없습니다.');
  }

  return medicine;
}

export async function fetchAvailableMedicines(): Promise<MedicineItem[]> {
  const response = await authenticatedMedicineFetch(
    '/api/medicines/available',
    {
      method: 'GET',
    },
  );

  if (!response.ok) {
    throw await readApiRequestError(
      response,
      '사용 가능한 약품 조회에 실패했습니다.',
    );
  }

  const payload = (await response.json()) as unknown;
  return readMedicineRecords(payload).map(normalizeMedicine);
}

interface RegisteredMedicineVisionResult {
  efficacy: string;
  id?: number;
  isRegistered: true;
  name: string;
  quantity?: number;
  step: number | null;
  usage: string;
}

interface UnregisteredMedicineVisionResult {
  isRegistered: false;
  step: number | null;
}

export type MedicineVisionUploadResult =
  | RegisteredMedicineVisionResult
  | UnregisteredMedicineVisionResult;

export type MedicineManualCreateParams = {
  name: string;
  efficacy?: string;
  usage?: string;
  quantityToAdd?: number;
};

export type MedicineManualCreateResult = {
  [key: string]: unknown;
};

export type MedicineUpdateParams = {
  name?: string;
  usage?: string;
  efficacy?: string;
  quantity?: number;
};

export type MedicineUseParams = {
  id?: string;
  medicineId?: string;
  quantityToUse?: number;
};

export type MedicineMutationResult = {
  [key: string]: unknown;
};

const readMedicineMutationResult = async (
  response: Response,
  failureMessage: string,
): Promise<MedicineMutationResult> => {
  if (!response.ok) {
    throw await readApiRequestError(response, failureMessage);
  }

  if (response.status === 204) {
    return {};
  }

  const responseBody = await response.text();

  return responseBody.trim().length > 0
    ? (JSON.parse(responseBody) as MedicineMutationResult)
    : {};
};

export async function postMedicineVision(params: {
  imageBase64: string;
  quantityToAdd?: number;
}): Promise<MedicineVisionUploadResult> {
  const response = await authenticatedMedicineFetch(
    '/api/medicines/vision',
    {
      method: 'POST',
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        quantityToAdd: params.quantityToAdd ?? 1,
      }),
    },
    true,
    MEDICINE_IMAGE_UPLOAD_TIMEOUT_MS,
  );

  if (!response.ok) {
    throw await readApiRequestError(response, '약품 사진 등록에 실패했습니다.');
  }

  const payload = (await response.json()) as unknown;
  const payloadRecord = isRecord(payload) ? payload : null;
  const result =
    payloadRecord && isRecord(payloadRecord.data) ? payloadRecord.data : null;
  const isRegistered =
    typeof result?.isRegistered === 'boolean'
      ? result.isRegistered
      : payloadRecord?.isRegistered;
  const step = result?.step ?? payloadRecord?.step ?? null;

  if (
    !isRecord(result) ||
    typeof isRegistered !== 'boolean' ||
    (step !== null && typeof step !== 'number')
  ) {
    throw new Error('약품 사진 등록 응답 형식이 올바르지 않습니다.');
  }

  if (!isRegistered) {
    return {
      isRegistered: false,
      step,
    };
  }

  if (
    typeof result.name !== 'string' ||
    typeof result.usage !== 'string' ||
    typeof result.efficacy !== 'string' ||
    (result.id !== undefined && typeof result.id !== 'number') ||
    (result.quantity !== undefined && typeof result.quantity !== 'number')
  ) {
    throw new Error('약품 사진 등록 응답 형식이 올바르지 않습니다.');
  }

  return {
    efficacy: result.efficacy,
    ...(result.id === undefined ? {} : { id: result.id }),
    isRegistered: true,
    name: result.name,
    ...(result.quantity === undefined ? {} : { quantity: result.quantity }),
    step,
    usage: result.usage,
  };
}

export async function postMedicineManual(
  params: MedicineManualCreateParams,
): Promise<MedicineManualCreateResult> {
  const body = {
    name: params.name,
    efficacy: params.efficacy,
    usage: params.usage,
    quantityToAdd: params.quantityToAdd ?? 1,
  };

  const response = await authenticatedMedicineFetch(
    '/api/medicines/manual',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    true,
  );

  return readMedicineMutationResult(response, '약품 수동 등록 실패');
}

export async function postMedicineUse(
  params: MedicineUseParams,
): Promise<MedicineMutationResult> {
  const body = {
    id: params.id,
    medicineId: params.medicineId,
    quantityToUse: params.quantityToUse ?? 1,
  };

  const response = await authenticatedMedicineFetch(
    '/api/medicines/use',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    true,
  );

  return readMedicineMutationResult(response, 'Medicine use request failed');
}

export async function updateMedicine(
  id: string,
  params: MedicineUpdateParams,
): Promise<MedicineMutationResult> {
  const body = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  const response = await authenticatedMedicineFetch(
    `/api/medicines/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
    true,
  );

  return readMedicineMutationResult(response, '약품 수정 실패');
}

export async function deleteMedicine(
  id: string,
): Promise<MedicineMutationResult> {
  const response = await authenticatedMedicineFetch(`/api/medicines/${id}`, {
    method: 'DELETE',
  });

  return readMedicineMutationResult(response, '약품 삭제 실패');
}

export type { MedicineItem } from '@/types';
