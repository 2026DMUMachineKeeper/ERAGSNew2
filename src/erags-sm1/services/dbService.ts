import { SessionError } from '../machine/types';

export const DEFAULT_DATABASE_API_BASE_URL = 'http://REDACTED_HOST:4000';

export type InventoryUseRequest = {
  itemId: number;
  slotId?: number | null;
  amount?: number;
};

export interface InventoryPort {
  decreaseQuantity(id: number, amount?: number): Promise<void>;
  decreaseRequiredItem?(request: InventoryUseRequest): Promise<number>;
  canUseRequiredItem?(request: InventoryUseRequest): Promise<boolean>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type MedicineInventoryRecord = {
  id?: unknown;
  itemId?: unknown;
  item_id?: unknown;
  medicineItemId?: unknown;
  medicine_item_id?: unknown;
  requiredItemId?: unknown;
  required_item_id?: unknown;
  qty?: unknown;
  quantity?: unknown;
  count?: unknown;
  stock?: unknown;
};

const readPositiveInteger = (value: unknown): number | null => {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
      ? Number(value)
      : NaN;

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const readQuantity = (record: MedicineInventoryRecord): number => {
  const value =
    record.qty ?? record.quantity ?? record.count ?? record.stock ?? 0;
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const readRecordItemId = (record: MedicineInventoryRecord): number | null =>
  readPositiveInteger(
    record.itemId ??
      record.item_id ??
      record.medicineItemId ??
      record.medicine_item_id ??
      record.requiredItemId ??
      record.required_item_id,
  );

export class ServerInventoryService implements InventoryPort {
  constructor(
    private readonly baseUrl: string = DEFAULT_DATABASE_API_BASE_URL,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async decreaseQuantity(id: number, amount = 1): Promise<void> {
    if (
      !Number.isInteger(id) ||
      id < 1 ||
      !Number.isInteger(amount) ||
      amount < 1
    ) {
      throw new SessionError(
        'INVALID_RESPONSE',
        'Medicine id and quantity must be positive integers',
      );
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/medicines/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantityToUse: amount }),
      });
    } catch {
      throw new SessionError(
        'SERVER_UNAVAILABLE',
        'Could not connect to inventory server',
      );
    }

    if (response.status === 400) {
      throw new SessionError(
        'INSUFFICIENT_QUANTITY',
        'Required medicine quantity is insufficient',
      );
    }
    if (!response.ok) {
      throw new SessionError(
        'SERVER_UNAVAILABLE',
        `Inventory request failed with HTTP ${response.status}`,
      );
    }

    try {
      const body = (await response.json()) as { success?: unknown };
      if (body.success !== true) {
        throw new Error('success was not true');
      }
    } catch {
      throw new SessionError(
        'INVALID_RESPONSE',
        'Inventory server returned an invalid response',
      );
    }
  }

  async decreaseRequiredItem({
    itemId,
    slotId,
    amount = 1,
  }: InventoryUseRequest): Promise<number> {
    const useSlotId =
      typeof slotId === 'number'
        ? slotId
        : await this.findUsableSlotId(itemId, amount);

    await this.decreaseQuantity(useSlotId, amount);

    return useSlotId;
  }

  async canUseRequiredItem(request: InventoryUseRequest): Promise<boolean> {
    try {
      await this.findUsableSlotId(request.itemId, request.amount ?? 1, request.slotId);
      return true;
    } catch (error) {
      if (
        error instanceof SessionError &&
        error.code === 'INSUFFICIENT_QUANTITY'
      ) {
        return false;
      }

      throw error;
    }
  }

  private async findUsableSlotId(
    itemId: number,
    amount: number,
    slotId?: number | null,
  ): Promise<number> {
    if (
      !Number.isInteger(itemId) ||
      itemId < 1 ||
      !Number.isInteger(amount) ||
      amount < 1
    ) {
      throw new SessionError(
        'INVALID_RESPONSE',
        'Medicine item id and quantity must be positive integers',
      );
    }

    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/api/medicines`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new SessionError(
        'SERVER_UNAVAILABLE',
        'Could not connect to inventory server',
      );
    }

    if (!response.ok) {
      throw new SessionError(
        'SERVER_UNAVAILABLE',
        `Inventory lookup failed with HTTP ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new SessionError(
        'INVALID_RESPONSE',
        'Inventory server returned an invalid response',
      );
    }

    const records = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as any)?.data)
      ? (payload as any).data
      : [];

    const usableRecord = records.find((record: MedicineInventoryRecord) => {
      const recordSlotId = readPositiveInteger(record.id);
      const recordItemId = readRecordItemId(record);

      if (typeof slotId === 'number') {
        return recordSlotId === slotId && readQuantity(record) >= amount;
      }

      return recordItemId === itemId && readQuantity(record) >= amount;
    }) as MedicineInventoryRecord | undefined;

    const usableSlotId = readPositiveInteger(usableRecord?.id);
    if (!usableSlotId) {
      throw new SessionError(
        'INSUFFICIENT_QUANTITY',
        'Required medicine quantity is insufficient',
      );
    }

    return usableSlotId;
  }
}
