import Config from 'react-native-config';

export type MedicineApiRecord = {
  id: string | number;
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
  const baseUrl = (Config.API_BASE_URL ?? '').replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error('API_BASE_URL이 설정되지 않았습니다. .env를 확인하세요.');
  }

  return `${baseUrl}${path}`;
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

export const normalizeMedicine = (record: MedicineApiRecord): MedicineItem => ({
  id: String(record.id),
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

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`약품 조회 실패: ${response.status}`);
  }

  const payload = await response.json();
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : [];

  return records.map(normalizeMedicine);
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

export type MedicineMutationResult = {
  [key: string]: unknown;
};

export async function postMedicineVision(params: {
  imageBase64: string;
  quantityToAdd?: number;
}): Promise<MedicineVisionUploadResult> {
  const response = await fetch(buildUrl('/api/medicines/vision'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      quantityToAdd: params.quantityToAdd ?? 1,
    }),
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

  const response = await fetch(buildUrl('/api/medicines/manual'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`약품 수동 등록 실패: ${response.status}`);
  }

  return payload as MedicineManualCreateResult;
}

export async function updateMedicine(
  id: string,
  params: MedicineUpdateParams,
): Promise<MedicineMutationResult> {
  const body = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

  const response = await fetch(buildUrl(`/api/medicines/${id}`), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`약품 수정 실패: ${response.status}`);
  }

  return payload as MedicineMutationResult;
}

export async function deleteMedicine(
  id: string,
): Promise<MedicineMutationResult> {
  const response = await fetch(buildUrl(`/api/medicines/${id}`), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`약품 삭제 실패: ${response.status}`);
  }

  return payload as MedicineMutationResult;
}
