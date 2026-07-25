import type { OperatorIndexEntry, Profession } from '../shared/types';
import { rarityNum } from './format';
import bundled from '../shared/generated/operators.json';

export type SortKey =
  | 'release-desc' | 'release-asc'
  | 'name-asc' | 'name-desc'
  | 'rarity-desc' | 'rarity-asc'
  | 'class';

// Display order for the 'class' sort and chip row: Vanguard, Guard, Defender,
// Sniper, Caster, Medic, Supporter, Specialist.
const CLASS_ORDER: Profession[] = [
  'PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL',
];

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

export function sortOps(ops: OperatorIndexEntry[], key: SortKey): OperatorIndexEntry[] {
  const sorted = [...ops];
  switch (key) {
    case 'release-desc': return sorted.sort((a, b) => byRelease(a, b, -1));
    case 'release-asc':  return sorted.sort((a, b) => byRelease(a, b, 1));
    case 'name-asc':     return sorted.sort(byName);
    case 'name-desc':    return sorted.sort((a, b) => byName(b, a));
    case 'rarity-desc':  return sorted.sort((a, b) => rarityNum(b.rarity) - rarityNum(a.rarity) || byName(a, b));
    case 'rarity-asc':   return sorted.sort((a, b) => rarityNum(a.rarity) - rarityNum(b.rarity) || byName(a, b));
    case 'class':        return sorted.sort((a, b) =>
      CLASS_ORDER.indexOf(a.profession) - CLASS_ORDER.indexOf(b.profession) || byName(a, b));
  }
}
