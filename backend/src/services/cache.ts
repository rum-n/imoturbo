import crypto from "node:crypto";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export class TtlCache<T> {
  private entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    });
  }
}

export function analysisCacheKey(url: string, price?: number, sqm?: number): string {
  return crypto
    .createHash("sha256")
    .update(`${url}:${price ?? "unknown"}:${sqm ?? "unknown"}`)
    .digest("hex");
}
