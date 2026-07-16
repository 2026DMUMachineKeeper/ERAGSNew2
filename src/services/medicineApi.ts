import Config from 'react-native-config';

import { getAuthToken, refreshAuthTokens } from './auth.service';

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
  expiry?: string;
  expire_date?: string;
  expiryDate?: string;
  expirationDate?: string;
  expiredAt?: string;
  [key: string]: unknown;
};

export type MedicineItem = {
  id: string;
  name: string;
  info: string;
  qty: number;
  expiry: string;
  threshold: number;
  barcode: string | null;
  usage: string;
  efficacy: string;
};

const buildUrl = (path: string) => {
  const baseUrl = (Config.API_BASE_URL ?? Config.Base_URL ?? '').replace(
    /\/+$/,
    '',
  );

  if (!baseUrl) {
    throw new Error('Base_URL이 설정되지 않았습니다. .env를 확인하세요.');
  }

  return `${baseUrl}${path}`;
};

const buildMedicineHeaders = async (
  hasJsonBody = false,
): Promise<Record<string, string>> => {
  const token = await getAuthToken();
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
  };

  console.log('[medicineApi] auth headers ready', {
    hasAuthorization: headers.Authorization.length > 'Bearer '.length,
    hasJsonBody,
  });

  return headers;
};

const authenticatedMedicineFetch = async (
  path: string,
  init: RequestInit = {},
  hasJsonBody = false,
): Promise<Response> => {
  const request = async (): Promise<Response> =>
    fetch(buildUrl(path), {
      ...init,
      headers: {
        ...(await buildMedicineHeaders(hasJsonBody)),
        ...(init.headers as Record<string, string> | undefined),
      },
    });

  const response = await request();

  if (response.status !== 401) {
    return response;
  }

  await refreshAuthTokens();

  return request();
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
  expiry: readString(
    record,
    ['expiry', 'expire_date', 'expiryDate', 'expirationDate', 'expiredAt'],
    '미정',
  ),
  threshold: readNumber(record, ['threshold'], 0),
  barcode: readOptionalString(record, ['barcode']),
  usage: readString(record, ['usage'], '정보 없음'),
  efficacy: readString(record, ['efficacy'], '정보 없음'),
});

export async function fetchMedicines(): Promise<MedicineItem[]> {
  const url = buildUrl('/api/medicines');
  console.log('[medicineApi] fetchMedicines request', { url });

  const response = await authenticatedMedicineFetch('/api/medicines', {
    method: 'GET',
  });

  console.log('[medicineApi] fetchMedicines response', {
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    throw new Error(`약품 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  console.log('[medicineApi] fetchMedicines payload shape', {
    isArray: Array.isArray(payload),
    dataIsArray: isRecord(payload) && Array.isArray(payload.data),
    dataKeys:
      isRecord(payload) && isRecord(payload.data)
        ? Object.keys(payload.data)
        : [],
    keys:
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? Object.keys(payload)
        : [],
  });

  const records = readMedicineRecords(payload);

  console.log('[medicineApi] fetchMedicines normalized count', {
    count: records.length,
  });

  return records.map(normalizeMedicine);
}

export async function fetchAvailableMedicines(): Promise<MedicineItem[]> {
  const response = await authenticatedMedicineFetch('/api/medicines/available', {
    method: 'GET',
  });

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

const getBase64ImageKind = (base64: string) => {
  if (base64.startsWith('/9j/')) {
    return 'jpeg';
  }

  if (base64.startsWith('iVBORw0KGgo')) {
    return 'png';
  }

  if (base64.startsWith('data:image/')) {
    return 'data-uri';
  }

  return 'unknown';
};

export async function postMedicineVision(params: {
  imageBase64: string;
  quantityToAdd?: number;
}): Promise<MedicineVisionUploadResult> {
  console.log('[medicineApi] postMedicineVision start', {
    imageBase64Length: params.imageBase64.length,
    imageBase64Kind: getBase64ImageKind(params.imageBase64),
    imageBase64Preview: params.imageBase64.slice(0, 80),
    hasDataUriPrefix: params.imageBase64.startsWith('data:image/'),
    quantityToAdd: params.quantityToAdd ?? 1,
  });

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
  );

  console.log('[medicineApi] postMedicineVision response', {
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        '의약품 비전 업로드 실패: 이미지 용량이 너무 큽니다. 더 작게 촬영해서 다시 시도해 주세요.',
      );
    }

    throw new Error(`의약품 비전 업로드 실패: ${response.status}`);
  }

  const payload = await response.json();
  console.log(
    '[medicineApi] postMedicineVision full response body',
    JSON.stringify(payload),
  );
  console.log('[medicineApi] postMedicineVision payload keys', {
    keys: Object.keys(payload ?? {}),
  });

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

  console.log('[medicineApi] postMedicineManual request', {
    body,
  });

  const response = await authenticatedMedicineFetch(
    '/api/medicines/manual',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    true,
  );

  console.log('[medicineApi] postMedicineManual response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = await response.json();
  console.log(
    '[medicineApi] postMedicineManual full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throw new Error(`약품 수동 등록 실패: ${response.status}`);
  }

  return payload as MedicineManualCreateResult;
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

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Medicine use request failed: ${response.status}`);
  }

  return payload as MedicineMutationResult;
}

export async function updateMedicine(
  id: string,
  params: MedicineUpdateParams,
): Promise<MedicineMutationResult> {
  const body = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  console.log('[medicineApi] updateMedicine request', { id, body });

  const response = await authenticatedMedicineFetch(
    `/api/medicines/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
    true,
  );

  console.log('[medicineApi] updateMedicine response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = await response.json();
  console.log(
    '[medicineApi] updateMedicine full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throw new Error(`약품 수정 실패: ${response.status}`);
  }

  return payload as MedicineMutationResult;
}

export async function deleteMedicine(
  id: string,
): Promise<MedicineMutationResult> {
  console.log('[medicineApi] deleteMedicine request', { id });

  const response = await authenticatedMedicineFetch(`/api/medicines/${id}`, {
    method: 'DELETE',
  });

  console.log('[medicineApi] deleteMedicine response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = await response.json();
  console.log(
    '[medicineApi] deleteMedicine full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throw new Error(`약품 삭제 실패: ${response.status}`);
  }

  return payload as MedicineMutationResult;
}
