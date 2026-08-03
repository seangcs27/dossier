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

export async function fetchOperator(id: OperatorId): Promise<Operator> {
  const envelope = await apiFetch<HellaEnvelope<Operator>>(`/operator/${encodeURIComponent(id)}`);
  // HellaAPI returns HTTP 200 with `{}` for an id it knows about but hasn't ingested
  // data for yet (recently-added CN operators), rather than a 404. Treat that the same
  // as not-found — the "404" substring is what detail.ts's error handling keys on.
  if (!envelope?.value) throw new Error(`HellaAPI 404: no data for ${id}`);
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

// White monochrome glyph on transparency. Takes the CSS slug ('defender', 'vanguard'),
// not the game enum — there are only eight, so they cache across the whole grid.
export function classIconUrl(slug: string): string {
  return `${IMAGE_BASE}/classes/class_${encodeURIComponent(slug)}.png`;
}
