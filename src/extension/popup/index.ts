import { getAllOperators, getOperator } from '../../shared/cache/operator-cache';
import type { Operator, OperatorId, Rarity } from '../../shared/types';
import { renderLoading, renderError, renderGrid, renderDetail } from './render';

const search = document.getElementById('search') as HTMLInputElement;
const count  = document.getElementById('count')!;
const view   = document.getElementById('view')!;

let allOps: Operator[] = [];
let currentView: 'grid' | 'detail' = 'grid';

function rarityNum(r: Rarity): number {
  return parseInt(r.replace('TIER_', ''), 10);
}

function filterOps(query: string): Operator[] {
  const q = query.toLowerCase().trim();
  if (!q) return allOps;
  return allOps.filter(op =>
    op.data.name.toLowerCase().includes(q) ||
    op.data.appellation.toLowerCase().includes(q),
  );
}

function showGrid(ops: Operator[]): void {
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

async function init(): Promise<void> {
  renderLoading(view);
  try {
    allOps = await getAllOperators();
    allOps.sort((a, b) => {
      const rd = rarityNum(b.data.rarity) - rarityNum(a.data.rarity);
      return rd !== 0 ? rd : a.data.name.localeCompare(b.data.name);
    });
    showGrid(allOps);
  } catch {
    renderError(view, 'Check your connection and reopen the popup.');
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

init();
