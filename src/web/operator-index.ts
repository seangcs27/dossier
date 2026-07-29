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

export function filterOps(
  ops: OperatorIndexEntry[],
  query: string,
  classes: ReadonlySet<Profession>,
  rarities: ReadonlySet<number>,
): OperatorIndexEntry[] {
  const q = query.toLowerCase().trim();
  return ops.filter(op =>
    (classes.size === 0 || classes.has(op.profession)) &&
    (rarities.size === 0 || rarities.has(rarityNum(op.rarity))) &&
    (!q || op.name.toLowerCase().includes(q) || op.appellation.toLowerCase().includes(q)));
}

const byName = (a: OperatorIndexEntry, b: OperatorIndexEntry) => a.name.localeCompare(b.name);

// Undated units (tutorial / Integrated Strategies trainers) have no release to order
// by, so they sort last whichever direction the dated ones run in.
function byRelease(a: OperatorIndexEntry, b: OperatorIndexEntry, dir: 1 | -1): number {
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
