import type { OperatorIndexEntry, OperatorSlim, Profession } from '../shared/types';
import { fetchOperatorIndex } from '../shared/api/hella-api';
import { rarityNum } from './format';
import bundled from './generated/operators.json';

const STORAGE_KEY = 'dossier:operators';

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

let entries: OperatorIndexEntry[] = loadInitial();

function loadInitial(): OperatorIndexEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OperatorIndexEntry[];
  } catch { /* corrupted storage — fall through to bundle */ }
  return bundled as unknown as OperatorIndexEntry[];
}

function releaseIndexOf(id: string): number {
  const m = /^char_(\d+)_/.exec(id);
  return m ? parseInt(m[1], 10) : 999999;
}

// Same rule as the build script: char-id number tracks release order, so
// brand-new operators from live data automatically sort into place.
function withReleaseIndex(slim: OperatorSlim[]): OperatorIndexEntry[] {
  return slim.map(op => ({ ...op, releaseIndex: releaseIndexOf(op.id) }));
}

export function getOperators(): OperatorIndexEntry[] {
  return entries;
}

// Silently keeps current data on failure (offline / API down).
export async function refreshOperators(onUpdated: () => void): Promise<void> {
  try {
    const slim = await fetchOperatorIndex();
    entries = withReleaseIndex(slim);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    onUpdated();
  } catch { /* keep current data */ }
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

export function sortOps(ops: OperatorIndexEntry[], key: SortKey): OperatorIndexEntry[] {
  const byName = (a: OperatorIndexEntry, b: OperatorIndexEntry) => a.name.localeCompare(b.name);
  const sorted = [...ops];
  switch (key) {
    case 'release-desc': return sorted.sort((a, b) => b.releaseIndex - a.releaseIndex || byName(a, b));
    case 'release-asc':  return sorted.sort((a, b) => a.releaseIndex - b.releaseIndex || byName(a, b));
    case 'name-asc':     return sorted.sort(byName);
    case 'name-desc':    return sorted.sort((a, b) => byName(b, a));
    case 'rarity-desc':  return sorted.sort((a, b) => rarityNum(b.rarity) - rarityNum(a.rarity) || byName(a, b));
    case 'rarity-asc':   return sorted.sort((a, b) => rarityNum(a.rarity) - rarityNum(b.rarity) || byName(a, b));
    case 'class':        return sorted.sort((a, b) =>
      CLASS_ORDER.indexOf(a.profession) - CLASS_ORDER.indexOf(b.profession) || byName(a, b));
  }
}
