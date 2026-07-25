import type { AttackRange, Operator, OperatorId } from '../types';
import { fetchOperator, fetchRange } from '../api/hella-api';

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
