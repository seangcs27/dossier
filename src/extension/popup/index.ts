import { getOperator } from '../../shared/cache/operator-cache';
import type { OperatorId, OperatorIndexEntry, Rarity } from '../../shared/types';
import bundled from '../../shared/generated/operators.json';
import { renderLoading, renderError, renderGrid, renderDetail } from './render';

const search = document.getElementById('search') as HTMLInputElement;
const count  = document.getElementById('count')!;
const view   = document.getElementById('view')!;

let currentView: 'grid' | 'detail' = 'grid';

function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

// Baked in at build time — the popup opens without a network round-trip.
const allOps = (bundled as unknown as OperatorIndexEntry[])
  .slice()
  .sort((a, b) =>
    rarityNum(b.rarity) - rarityNum(a.rarity) || a.name.localeCompare(b.name));

function filterOps(query: string): OperatorIndexEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return allOps;
  return allOps.filter(op =>
    op.name.toLowerCase().includes(q) ||
    op.appellation.toLowerCase().includes(q),
  );
}

function showGrid(ops: OperatorIndexEntry[]): void {
  currentView = 'grid';
  search.style.display = '';
  count.textContent = `${ops.length} operators`;
  renderGrid(view, ops);
}

async function showDetail(id: OperatorId): Promise<void> {
  currentView = 'detail';
  search.style.display = 'none';
  count.textContent = '';
  renderLoading(view);
  try {
    const op = await getOperator(id);
    renderDetail(view, op);
  } catch {
    renderError(view, 'Could not load operator details.');
  }
}

search.addEventListener('input', () => showGrid(filterOps(search.value)));

view.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;

  if (target.id === 'btnBack') {
    showGrid(filterOps(search.value));
    return;
  }

  const card = target.closest<HTMLElement>('.op-card[data-id]');
  if (card && currentView === 'grid') {
    showDetail(card.dataset.id!);
  }
});

showGrid(allOps);
