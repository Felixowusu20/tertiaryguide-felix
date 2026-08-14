type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __tgOtpMemory?: Map<string, MemoryEntry>;
};

function store(): Map<string, MemoryEntry> {
  if (!globalStore.__tgOtpMemory) {
    globalStore.__tgOtpMemory = new Map();
  }
  return globalStore.__tgOtpMemory;
}

function purgeExpired(map: Map<string, MemoryEntry>, key: string) {
  const entry = map.get(key);
  if (!entry) return;
  if (entry.expiresAt <= Date.now()) {
    map.delete(key);
  }
}

export function setMemoryOtp(
  key: string,
  value: string,
  ttlSeconds: number,
): void {
  const map = store();
  map.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function getMemoryOtp(key: string): string | null {
  const map = store();
  purgeExpired(map, key);
  return map.get(key)?.value ?? null;
}

export function deleteMemoryOtp(key: string): void {
  store().delete(key);
}
