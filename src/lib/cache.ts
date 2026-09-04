/**
 * Tiny in-memory TTL cache for repeat client-side reads.
 *
 * Several hooks (roles, aux statuses, team lists) are mounted by many
 * components at once and were re-querying the database on every mount.
 * This dedupes those reads into a single request per TTL window.
 *
 * Only active in the browser — on the server every call runs fresh so
 * nothing leaks between SSR requests.
 */

type Entry = { at: number; value: Promise<unknown> };

const store = new Map<string, Entry>();

export function cachedQuery<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return fn();
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fn().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: Date.now(), value });
  return value;
}

/** Drop every cached entry whose key starts with `prefix`. */
export function invalidateCache(prefix: string) {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const TTL = {
  short: 60_000,
  medium: 5 * 60_000,
  long: 10 * 60_000,
};
