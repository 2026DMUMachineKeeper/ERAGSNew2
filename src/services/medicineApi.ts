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

const getBaseUrl = () => (Config.Base_URL ?? '').replace(/\/$/, '');

const buildUrl = (path: string) => {
  const baseUrl = getBaseUrl();

  // 개발용 런타임 확인 로그
  try {
    // eslint-disable-next-line no-console
    console.log('[medicineApi] Config.Base_URL =>', Config.Base_URL);
  } catch (e) {}

  if (!baseUrl) {
    throw new Error('Base_URL이 설정되지 않았습니다.');
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

const readNumber = (record: MedicineApiRecord, keys: string[], fallback: number) => {
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
  info: readString(record, ['info', 'description', 'detail', 'memo'], '').trim()
    || [
      readString(record, ['usage'], '').trim(),
      readString(record, ['efficacy'], '').trim(),
    ]
      .filter(Boolean)
      .join(' · ') || '설명 없음',
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