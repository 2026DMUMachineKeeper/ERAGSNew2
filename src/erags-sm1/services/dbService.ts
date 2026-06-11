export const DEFAULT_DATABASE_API_BASE_URL = 'http://13.125.213.48:4000';

export interface InventoryPort {
  decreaseQuantity(id: number, amount?: number): Promise<void>;
}

type InventoryErrorCode =
  | 'SERVER_UNAVAILABLE'
  | 'INVALID_RESPONSE'
  | 'INSUFFICIENT_QUANTITY';

export class InventoryError extends Error {
  constructor(public readonly code: InventoryErrorCode, message: string) {
    super(message);
    this.name = 'InventoryError';
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

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
      throw new InventoryError(
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
      throw new InventoryError(
        'SERVER_UNAVAILABLE',
        'Could not connect to inventory server',
      );
    }

    if (response.status === 400) {
      throw new InventoryError(
        'INSUFFICIENT_QUANTITY',
        'Required medicine quantity is insufficient',
      );
    }
    if (!response.ok) {
      throw new InventoryError(
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
      throw new InventoryError(
        'INVALID_RESPONSE',
        'Inventory server returned an invalid response',
      );
    }
  }
}
