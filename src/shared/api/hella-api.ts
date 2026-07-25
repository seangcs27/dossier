import type { AttackRange, Operator, OperatorId, OperatorSlim } from '../types';

const BASE_URL = 'https://awedtan.ca/api';
export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';

interface HellaEnvelope<T> {
  value: T;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HellaAPI ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchAllOperators(): Promise<Operator[]> {
  const envelopes = await apiFetch<HellaEnvelope<Operator>[]>('/operator');
  return envelopes.map(e => e.value);
}

export async function fetchOperator(id: OperatorId): Promise<Operator> {
  const envelope = await apiFetch<HellaEnvelope<Operator>>(`/operator/${encodeURIComponent(id)}`);
  return envelope.value;
}

export async function fetchRange(id: string): Promise<AttackRange> {
  const envelope = await apiFetch<HellaEnvelope<AttackRange>>(`/range/${encodeURIComponent(id)}`);
  return envelope.value;
}

export function operatorAvatarUrl(id: OperatorId): string {
  return `${IMAGE_BASE}/avatars/${id}.png`;
}

export function skillIconUrl(skillId: string): string {
  return `${IMAGE_BASE}/skills/skill_icon_${encodeURIComponent(skillId)}.png`;
}

interface SlimEnvelope {
  canon: OperatorId; // with include=data.*, the id only exists here
  value: { data: Omit<OperatorSlim, 'id'> };
}

// Grid-sized operator list (~200 KB vs ~29 MB full). Detail data still comes from fetchOperator().
export async function fetchOperatorIndex(): Promise<OperatorSlim[]> {
  const envelopes = await apiFetch<SlimEnvelope[]>(
    '/operator?include=data.name&include=data.appellation&include=data.rarity' +
    '&include=data.profession&include=data.subProfessionId',
  );
  return envelopes.map(e => ({ id: e.canon, ...e.value.data }));
}
