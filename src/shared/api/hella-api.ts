import type { AttackRange, Operator, OperatorId } from '../types';

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
