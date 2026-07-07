import Config from 'react-native-config';

type MedicineApiErrorCode =
  | 'CONFIG_MISSING'
  | 'NETWORK_FAILED'
  | 'INVALID_RESPONSE'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'SERVER_UNAVAILABLE'
  | 'REQUEST_FAILED';

type MedicineErrorAction =
  | 'load'
  | 'vision'
  | 'manualCreate'
  | 'update'
  | 'delete';

type MedicineListResponseBody = {
  data?: unknown;
  [key: string]: unknown;
};

class MedicineApiError extends Error {
  constructor(message: string, public readonly code: MedicineApiErrorCode) {
    super(message);
    this.name = 'MedicineApiError';
  }
}

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
  const baseUrl = (
    Config.API_BASE_URL ??
    Config.Base_URL ??
    Config.BaseURL ??
    ''
  ).replace(/\/+$/, '');

  if (!baseUrl) {
    throw new MedicineApiError(
      'API 서버 주소가 설정되지 않았습니다. .env를 확인하세요.',
      'CONFIG_MISSING',
    );
  }

  return `${baseUrl}${path}`;
};

const getMedicineApiErrorCode = (
  responseStatus: number,
): MedicineApiErrorCode => {
  if (responseStatus === 400 || responseStatus === 422) {
    return 'VALIDATION_FAILED';
  }

  if (responseStatus === 404) {
    return 'NOT_FOUND';
  }

  if (responseStatus === 413) {
    return 'PAYLOAD_TOO_LARGE';
  }

  if (responseStatus === 429) {
    return 'RATE_LIMITED';
  }

  if (responseStatus >= 500) {
    return 'SERVER_UNAVAILABLE';
  }

  return 'REQUEST_FAILED';
};

const fetchMedicineRequest = async (
  requestUrl: string,
  requestInit: RequestInit,
): Promise<Response> => {
  try {
    return await fetch(requestUrl, requestInit);
  } catch (error) {
    throw new MedicineApiError(
      error instanceof Error ? error.message : 'Network request failed',
      'NETWORK_FAILED',
    );
  }
};

const parseMedicineJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    throw new MedicineApiError(
      error instanceof Error ? error.message : 'Invalid JSON response',
      'INVALID_RESPONSE',
    );
  }
};

const throwMedicineResponseError = (
  operation: string,
  responseStatus: number,
): never => {
  throw new MedicineApiError(
    `${operation} 실패: ${responseStatus}`,
    getMedicineApiErrorCode(responseStatus),
  );
};

export const getVisibleMedicineErrorMessage = (
  error: unknown,
  action: MedicineErrorAction,
): string => {
  if (!(error instanceof MedicineApiError)) {
    return getDefaultMedicineErrorMessage(action);
  }

  if (error.code === 'NETWORK_FAILED') {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  if (error.code === 'RATE_LIMITED') {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'SERVER_UNAVAILABLE') {
    return '서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (error.code === 'INVALID_RESPONSE' || error.code === 'CONFIG_MISSING') {
    return getDefaultMedicineErrorMessage(action);
  }

  if (error.code === 'PAYLOAD_TOO_LARGE') {
    return '사진 용량이 너무 큽니다. 더 작게 촬영해서 다시 시도해 주세요.';
  }

  if (error.code === 'NOT_FOUND') {
    return action === 'delete'
      ? '이미 삭제된 약품입니다. 목록을 새로고침해 주세요.'
      : '약품 정보를 찾지 못했습니다. 목록을 새로고침해 주세요.';
  }

  if (error.code === 'VALIDATION_FAILED') {
    return getValidationMedicineErrorMessage(action);
  }

  return getDefaultMedicineErrorMessage(action);
};

const getDefaultMedicineErrorMessage = (action: MedicineErrorAction): string => {
  switch (action) {
    case 'load':
      return '약품 목록을 불러오지 못했습니다.';
    case 'vision':
      return '사진으로 약품을 등록하지 못했습니다. 직접 입력을 이용해 주세요.';
    case 'manualCreate':
      return '약품을 등록하지 못했습니다. 입력 내용을 확인해 주세요.';
    case 'update':
      return '약품을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    case 'delete':
      return '약품을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
};

const getValidationMedicineErrorMessage = (
  action: MedicineErrorAction,
): string => {
  switch (action) {
    case 'vision':
      return '사진에서 약품 정보를 확인하지 못했습니다. 직접 입력해 주세요.';
    case 'manualCreate':
      return '입력한 약품 정보를 다시 확인해 주세요.';
    case 'update':
      return '수정할 약품 정보를 다시 확인해 주세요.';
    default:
      return getDefaultMedicineErrorMessage(action);
  }
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

const isRecord = (value: unknown): value is MedicineListResponseBody => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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
  console.log('[medicineApi] fetchMedicines request', { url });

  const response = await fetchMedicineRequest(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  console.log('[medicineApi] fetchMedicines response', {
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    throwMedicineResponseError('약품 조회', response.status);
  }

  const payload = await parseMedicineJson(response);
  const payloadRecord = isRecord(payload) ? payload : null;

  console.log('[medicineApi] fetchMedicines payload shape', {
    isArray: Array.isArray(payload),
    dataIsArray: Array.isArray(payloadRecord?.data),
    keys: payloadRecord ? Object.keys(payloadRecord) : [],
  });

  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payloadRecord?.data)
    ? payloadRecord.data
    : [];

  console.log('[medicineApi] fetchMedicines normalized count', {
    count: records.length,
  });

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

  const response = await fetchMedicineRequest(
    buildUrl('/api/medicines/vision'),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: params.imageBase64,
        quantityToAdd: params.quantityToAdd ?? 1,
      }),
    },
  );

  console.log('[medicineApi] postMedicineVision response', {
    ok: response.ok,
    status: response.status,
  });

  if (!response.ok) {
    throwMedicineResponseError('의약품 비전 업로드', response.status);
  }

  const payload = (await parseMedicineJson(
    response,
  )) as MedicineVisionUploadResult;
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

  const response = await fetchMedicineRequest(
    buildUrl('/api/medicines/manual'),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  console.log('[medicineApi] postMedicineManual response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = (await parseMedicineJson(
    response,
  )) as MedicineManualCreateResult;
  console.log(
    '[medicineApi] postMedicineManual full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throwMedicineResponseError('약품 수동 등록', response.status);
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

  console.log('[medicineApi] updateMedicine request', { id, body });

  const response = await fetchMedicineRequest(
    buildUrl(`/api/medicines/${id}`),
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );

  console.log('[medicineApi] updateMedicine response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = (await parseMedicineJson(response)) as MedicineMutationResult;
  console.log(
    '[medicineApi] updateMedicine full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throwMedicineResponseError('약품 수정', response.status);
  }

  return payload as MedicineMutationResult;
}

export async function deleteMedicine(
  id: string,
): Promise<MedicineMutationResult> {
  console.log('[medicineApi] deleteMedicine request', { id });

  const response = await fetchMedicineRequest(
    buildUrl(`/api/medicines/${id}`),
    {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  console.log('[medicineApi] deleteMedicine response', {
    ok: response.ok,
    status: response.status,
  });

  const payload = (await parseMedicineJson(response)) as MedicineMutationResult;
  console.log(
    '[medicineApi] deleteMedicine full response body',
    JSON.stringify(payload),
  );

  if (!response.ok) {
    throwMedicineResponseError('약품 삭제', response.status);
  }

  return payload as MedicineMutationResult;
}
