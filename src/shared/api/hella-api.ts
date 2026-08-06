import type { AttackRange, Operator, OperatorId, OperatorSkillDetail, UnlockCondition } from '../types';

const BASE_URL = 'https://awedtan.ca/api';
export const IMAGE_BASE = 'https://cdn.jsdelivr.net/gh/PuppiizSunniiz/Arknight-Images@main';

// Baked at build time by build-operator-index.mjs — one JSON file per operator, every
// operator, not just CN-supplement ones (see buildOperatorDetails there): full Operator
// objects, CN ones already shape-normalized and translated. Same-origin static file, no
// third-party API round trip — this is the fast path for every detail view. The live
// fetch below only runs for an id this build doesn't know about yet (the gap before the
// next rebuild picks up a brand-new operator).
async function fetchBakedOperator(id: OperatorId): Promise<Operator | null> {
  try {
    const res = await fetch(`operator-details/${encodeURIComponent(id)}.json`);
    if (!res.ok) return null;
    return await res.json() as Operator;
  } catch {
    return null;
  }
}

interface HellaEnvelope<T> {
  value: T;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`HellaAPI ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// /cn/operator returns `skills` as bare excel objects (no `deploy` wrapper) whenever an
// operator actually has skills — unlike /operator, which nests each as `{ deploy, excel }`.
// detail.ts's tab list is built from op.skills at mount time, unconditionally, so a raw
// entry's missing `.excel` throws synchronously inside an unawaited render path and the
// detail view hangs on its loading spinner forever with no error surfaced. `unlockCond`
// for the synthesized `deploy` comes from the matching entry in `data.skills`, which
// carries it under both endpoints alike.
function normalizeCnSkills(op: Operator): OperatorSkillDetail[] {
  const raw = (op.skills ?? []) as unknown as (OperatorSkillDetail | OperatorSkillDetail['excel'])[];
  return raw.map(entry => {
    if ('excel' in entry) return entry;
    const ref = op.data.skills?.find(r => r.skillId === entry.skillId) as
      { unlockCond?: UnlockCondition } | undefined;
    return {
      deploy: { skillId: entry.skillId, unlockCond: ref?.unlockCond ?? { phase: 'PHASE_0', level: 1 } },
      excel: entry,
    };
  });
}

export async function fetchOperator(id: OperatorId): Promise<Operator> {
  const baked = await fetchBakedOperator(id);
  if (baked) return baked;

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
  return {
    ...op,
    data: { ...op.data, name: op.data.appellation },
    skills: normalizeCnSkills(op),
  };
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
