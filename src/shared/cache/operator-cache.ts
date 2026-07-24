import type { Operator, OperatorId } from '../types';
import { fetchOperator, fetchAllOperators } from '../api/hella-api';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: Operator;
  fetchedAt: number;
}

const cache = new Map<OperatorId, CacheEntry>();
let allCache: { data: Operator[]; fetchedAt: number } | null = null;

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

export async function getAllOperators(): Promise<Operator[]> {
  if (allCache && !isStale(allCache.fetchedAt)) return allCache.data;
  const data = await fetchAllOperators();
  allCache = { data, fetchedAt: Date.now() };
  return data;
}

export function clearCache(): void {
  cache.clear();
  allCache = null;
}
