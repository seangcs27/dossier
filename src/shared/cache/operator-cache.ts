import type { AttackRange, Operator, OperatorId } from '../types';
import { fetchOperator, fetchRange } from '../api/hella-api';
import bundledRanges from '../generated/ranges.json';

// Baked in at build time by scripts/build-range-index.mjs — covers every range in use
// as of the last build, so the grid in the detail view needs no network call for it.
// Anything missing (a brand-new operator's range, added after the last build) falls
// through to a live fetch below.
const rangeBundle = bundledRanges as unknown as Record<string, AttackRange>;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache = new Map<OperatorId, CacheEntry<Operator>>();
const rangeCache = new Map<string, CacheEntry<AttackRange>>();

function isStale(fetchedAt: number): boolean {
  return Date.now() - fetchedAt > CACHE_TTL_MS;
}

export async function getOperator(id: OperatorId): Promise<Operator> {
  const entry = cache.get(id);
  if (entry && !isStale(entry.fetchedAt)) return entry.data;
  const data = await fetchOperator(id);
  cache.set(id, { data, fetchedAt: Date.now() });
  return data;
}

export async function getRange(id: string): Promise<AttackRange> {
  const bundled = rangeBundle[id];
  if (bundled) return bundled;

  const entry = rangeCache.get(id);
  if (entry && !isStale(entry.fetchedAt)) return entry.data;
  const data = await fetchRange(id);
  rangeCache.set(id, { data, fetchedAt: Date.now() });
  return data;
}

export function clearCache(): void {
  cache.clear();
  rangeCache.clear();
}
