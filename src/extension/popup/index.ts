import './popup.scss';
import type { OperatorId, OperatorIndexEntry, PopupOperator, Rarity } from '../../shared/types';
import bundled from '../../shared/generated/operators.json';
import bundledDetails from '../../shared/generated/operator-popup.json';
import { renderError, renderGrid, renderDetail } from './render';

const search = document.getElementById('search') as HTMLInputElement;
const count  = document.getElementById('count')!;
const view   = document.getElementById('view')!;

let currentView: 'grid' | 'detail' = 'grid';

function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

// Both baked in at build time, so the popup makes no requests at all — not on open, and
// not on opening an operator either. The detail projection is ~200KB for all 427 (see
// PopupOperator), against the 30.5MB of full payloads the extension used to ship to read
// nine fields out of.
const details = bundledDetails as unknown as Record<string, PopupOperator>;

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

function showDetail(id: OperatorId): void {
  currentView = 'detail';
  search.style.display = 'none';
  count.textContent = '';
  const op = details[id];
  // Only reachable for an id in the grid index but not the detail map, which means the
  // build wrote one and not the other — worth saying rather than rendering an empty page.
  if (!op) {
    renderError(view, 'No details were baked for this operator.');
    return;
  }
  renderDetail(view, op);
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
