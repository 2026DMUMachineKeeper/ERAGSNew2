import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import { authenticatedFetch } from './authenticatedFetch.service';

const MEDICINE_IMAGE_UPLOAD_TIMEOUT_MS = 60_000;

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

export type MedicineItem = {
  id: string;
  name: string;
  info: string;
  qty: number;
  threshold: number;
  barcode: string | null;
  usage: string;
  efficacy: string;
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

const readMedicineRecords = (payload: unknown): MedicineApiRecord[] => {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const data = payload.data;

  if (Array.isArray(data)) {
    return data.filter(isRecord);
  }

  if (isRecord(data)) {
    const nestedRecords = [
      data.medicines,
      data.items,
      data.list,
      data.content,
      data.results,
    ].find(Array.isArray);

    if (Array.isArray(nestedRecords)) {
      return nestedRecords.filter(isRecord);
    }
  }

  const rootRecords = [
    payload.medicines,
    payload.items,
    payload.list,
    payload.content,
    payload.results,
  ].find(Array.isArray);

  if (Array.isArray(rootRecords)) {
    return rootRecords.filter(isRecord);
  }

  return [];
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
    throw new Error(`약품 조회 실패: ${response.status}`);
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
    throw new Error(`Available medicines request failed: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return readMedicineRecords(payload).map(normalizeMedicine);
}

export type MedicineVisionUploadResult = {
  [key: string]: unknown;
};

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
    throw new Error(`${failureMessage}: ${response.status}`);
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
    if (response.status === 413) {
      throw new Error(
        '의약품 비전 업로드 실패: 이미지 용량이 너무 큽니다. 더 작게 촬영해서 다시 시도해 주세요.',
      );
    }

    throw new Error(`의약품 비전 업로드 실패: ${response.status}`);
  }

  const payload = await response.json();
  return payload as MedicineVisionUploadResult;
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
