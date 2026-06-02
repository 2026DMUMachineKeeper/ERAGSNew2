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
  qty?: number;
  quantity?: number;
  count?: number;
  stock?: number;
  threshold?: number;
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

const getBaseUrl = () => {
  const configuredBaseUrl =
    Config.Base_URL ?? Config.BASE_URL ?? Config.base_url ?? '';

  return configuredBaseUrl.replace(/\/$/, '');
};

const buildUrl = (path: string) => {
  const baseUrl = getBaseUrl();

  try {
    // eslint-disable-next-line no-console
    console.log('[medicineApi] buildUrl', { baseUrl, path });
  } catch (e) {}

  if (!baseUrl) {
    throw new Error(
      'Base_URL이 설정되지 않았습니다. .env에 Base_URL을 넣고 앱을 재빌드했는지 확인하세요.',
    );
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
    '미지정',
  ),
  threshold: readNumber(record, ['threshold'], 0),
  barcode: readOptionalString(record, ['barcode']),
  usage: readString(record, ['usage'], '정보 없음'),
  efficacy: readString(record, ['efficacy'], '정보 없음'),
});

export async function fetchMedicines(): Promise<MedicineItem[]> {
  const response = await fetch(buildUrl('/api/medicines'), {
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

export async function postMedicineVision(params: {
  imageBase64: string;
  quantityToAdd?: number;
}): Promise<MedicineVisionUploadResult> {
  // eslint-disable-next-line no-console
  console.log('[medicineApi] postMedicineVision start', {
    imageBase64Length: params.imageBase64.length,
    quantityToAdd: params.quantityToAdd ?? 1,
  });

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

  // eslint-disable-next-line no-console
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
  // eslint-disable-next-line no-console
  console.log('[medicineApi] postMedicineVision payload keys', {
    keys: Object.keys(payload ?? {}),
  });

  return payload as MedicineVisionUploadResult;
}
