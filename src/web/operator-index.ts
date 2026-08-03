import type { OperatorIndexEntry, Profession } from '../shared/types';
import { rarityNum } from './format';
import bundled from '../shared/generated/operators.json';

// Rarity and class are filter dimensions, so sorting by them would be redundant —
// these are the orderings that say something the filters can't.
export type SortKey =
  | 'release-desc' | 'release-asc'
  | 'name-asc' | 'name-desc';

// Baked in at build time by scripts/build-operator-index.mjs — no runtime fetch.
const entries = bundled as unknown as OperatorIndexEntry[];

export function getOperators(): OperatorIndexEntry[] {
  return entries;
}

// 'any' matches operators carrying at least one selected tag, 'all' requires every
// one. Only tags need the distinction — an operator has exactly one class, subclass
// and rarity, so those can only ever be OR-ed.
export type TagMode = 'any' | 'all';

export interface OperatorFilter {
  query: string;
  classes: ReadonlySet<Profession>;
  rarities: ReadonlySet<number>;
  subclass: string; // subProfessionId, '' for any
  tags: ReadonlySet<string>;
  tagMode: TagMode;
}

export function filterOps(ops: OperatorIndexEntry[], f: OperatorFilter): OperatorIndexEntry[] {
  const q = f.query.toLowerCase().trim();
  return ops.filter(op => {
    if (f.classes.size && !f.classes.has(op.profession)) return false;
    if (f.rarities.size && !f.rarities.has(rarityNum(op.rarity))) return false;
    if (f.subclass && op.subProfessionId !== f.subclass) return false;
    if (f.tags.size) {
      const hit = [...f.tags].filter(t => op.tags.includes(t)).length;
      if (f.tagMode === 'all' ? hit < f.tags.size : hit === 0) return false;
    }
    if (q && !op.name.toLowerCase().includes(q) && !op.appellation.toLowerCase().includes(q)) return false;
    return true;
  });
}

// Subclasses present in the roster, restricted to the selected classes so the picker
// stays short — all 71 at once is unusable.
export function subclassesFor(
  ops: OperatorIndexEntry[], classes: ReadonlySet<Profession>,
): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const op of ops) {
    if (classes.size && !classes.has(op.profession)) continue;
    if (!seen.has(op.subProfessionId)) seen.set(op.subProfessionId, op.archetype || op.subProfessionId);
  }
  return [...seen].map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function allTags(ops: OperatorIndexEntry[]): string[] {
  return [...new Set(ops.flatMap(op => op.tags))].sort();
}

const byName = (a: OperatorIndexEntry, b: OperatorIndexEntry) => a.name.localeCompare(b.name);

// releaseOrder (Sanity Gone's PRTS-scraped ordinal) covers almost everything and is
// verified accurate even for operators our own wiki pipeline can't date at all, so it's
// the preferred signal. releaseDate is the fallback for the rare operator neither we
// nor Sanity Gone can place yet; fully-undated pairs sort last, by name.
function byRelease(a: OperatorIndexEntry, b: OperatorIndexEntry, dir: 1 | -1): number {
  if (a.releaseOrder != null && b.releaseOrder != null) {
    return dir * (a.releaseOrder - b.releaseOrder) || byName(a, b);
  }
  if (!a.releaseDate || !b.releaseDate) {
    if (a.releaseDate) return -1;
    if (b.releaseDate) return 1;
    return byName(a, b);
  }
  return dir * a.releaseDate.localeCompare(b.releaseDate) || byName(a, b);
}

function within(key: SortKey): (a: OperatorIndexEntry, b: OperatorIndexEntry) => number {
  switch (key) {
    case 'release-desc': return (a, b) => byRelease(a, b, -1);
    case 'release-asc':  return (a, b) => byRelease(a, b, 1);
    case 'name-asc':     return byName;
    case 'name-desc':    return (a, b) => byName(b, a);
  }
}

// Rarity always groups first — 6★ together, then 5★, and so on — with the chosen sort
// applied inside each band. Mixing rarities into one flat list buries the operators
// people are usually looking for.
export function sortOps(ops: OperatorIndexEntry[], key: SortKey): OperatorIndexEntry[] {
  const compare = within(key);
  return [...ops].sort((a, b) =>
    rarityNum(b.rarity) - rarityNum(a.rarity) || compare(a, b));
}
