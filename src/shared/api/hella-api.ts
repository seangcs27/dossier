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
  if (envelope?.value) return envelope.value;

  // HellaAPI returns HTTP 200 with `{}` for an id it knows about but hasn't ingested
  // *global* (translated) data for yet — recently-added CN operators. Its separate
  // /cn/operator endpoint carries the same shape straight from CN game data: skills,
  // talents, modules, bases all present, just untranslated. `appellation` is already
  // English (the game's own pre-romanized name — same field build-operator-index.mjs
  // uses for these operators in the grid), so it's swapped in for `data.name`, which
  // every view treats as the display name.
  const cnEnvelope = await apiFetch<HellaEnvelope<Operator>>(`/cn/operator/${encodeURIComponent(id)}`);
  if (!cnEnvelope?.value) throw new Error(`HellaAPI 404: no data for ${id}`);
  const op = cnEnvelope.value;
  return { ...op, data: { ...op.data, name: op.data.appellation } };
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
