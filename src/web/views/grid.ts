import { operatorAvatarUrl } from '../../shared/api/hella-api';
import type { OperatorIndexEntry, Profession } from '../../shared/types';
import {
  getOperators,
  filterOps,
  sortOps,
  type SortKey,
} from '../operator-index';
import { PROFESSION_LABEL, PROFESSION_CSS, rarityNum, escHtml } from '../format';

const state = {
  query: '',
  sort: 'release-desc' as SortKey,
  classes: new Set<Profession>(),
  rarities: new Set<number>(),
};

function buildCard(op: OperatorIndexEntry): string {
  const n      = rarityNum(op.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[op.profession];
  const label  = PROFESSION_LABEL[op.profession];
  const avatar = operatorAvatarUrl(op.id);
  const name   = escHtml(op.name);

  return `
    <a class="op-card" href="#/op/${encodeURIComponent(op.id)}">
      <img class="op-avatar" src="${avatar}" alt="${name}" loading="lazy"
           onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
      <div class="op-info">
        <div class="op-name" title="${name}">${name}</div>
        <div class="op-meta">
          <span class="op-class ${cls}">${label}</span>
          <span class="op-rarity r${n}">${stars}</span>
        </div>
      </div>
    </a>
  `;
}

function render(container: HTMLElement): void {
  const ops = sortOps(
    filterOps(getOperators(), state.query, state.classes, state.rarities),
    state.sort,
  );
  document.getElementById('count')!.textContent = `${ops.length} operators`;
  if (ops.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No results</div>Try a different name or filter.</div>`;
    return;
  }
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
}

function syncChips(): void {
  document.querySelectorAll<HTMLButtonElement>('#chips .chip').forEach(chip => {
    const { kind, value } = chip.dataset;
    const active = kind === 'class'
      ? state.classes.has(value as Profession)
      : state.rarities.has(Number(value));
    chip.classList.toggle('active', active);
  });
}

function toggleChip(chip: HTMLButtonElement): void {
  const { kind, value } = chip.dataset;
  if (kind === 'class') {
    const p = value as Profession;
    if (state.classes.has(p)) state.classes.delete(p); else state.classes.add(p);
  } else {
    const r = Number(value);
    if (state.rarities.has(r)) state.rarities.delete(r); else state.rarities.add(r);
  }
}

export function mountGrid(container: HTMLElement): void {
  const search = document.getElementById('search') as HTMLInputElement;
  const sort   = document.getElementById('sort') as HTMLSelectElement;
  const chips  = document.getElementById('chips')!;
  search.style.display = '';
  sort.style.display = '';
  chips.style.display = '';

  search.value = state.query;
  sort.value = state.sort;
  syncChips();
  render(container);

  search.oninput = () => { state.query = search.value; render(container); };
  sort.onchange  = () => { state.sort = sort.value as SortKey; render(container); };
  chips.querySelectorAll<HTMLButtonElement>('.chip').forEach(chip => {
    chip.onclick = () => { toggleChip(chip); syncChips(); render(container); };
  });
}
