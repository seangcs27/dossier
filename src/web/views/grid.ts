import { operatorAvatarUrl, operatorPortraitUrl, classIconUrl } from '../../shared/api/hella-api';
import type { OperatorIndexEntry, Profession } from '../../shared/types';
import {
  getOperators,
  filterOps,
  sortOps,
  subclassesFor,
  allTags,
  type SortKey,
  type TagMode,
} from '../operator-index';
import { PROFESSION_LABEL, PROFESSION_CSS, rarityNum, escHtml, splitAlterName } from '../format';

const state = {
  query: '',
  sort: 'release-desc' as SortKey,
  classes: new Set<Profession>(),
  rarities: new Set<number>(),
  subclass: '',
  tags: new Set<string>(),
  tagMode: 'any' as TagMode,
  moreOpen: false,
};

function buildCard(op: OperatorIndexEntry): string {
  const n      = rarityNum(op.rarity);
  const stars  = '★'.repeat(n);
  const cls    = PROFESSION_CSS[op.profession];
  const label  = PROFESSION_LABEL[op.profession];
  const { base, epithet } = splitAlterName(op.name);
  // Full character art reads better in the grid than the small square avatar (closer
  // to how sites like Sanity Gone present it), but not every id has both elite-art
  // suffixes — a couple of alter forms only ship `_2`. This chain tries `_1`, then
  // `_2`, then falls back to the avatar crop, before giving up on a placeholder.
  const portrait1 = operatorPortraitUrl(op.id, '1');
  const fallbacks = [operatorPortraitUrl(op.id, '2'), operatorAvatarUrl(op.id)].join('|');

  return `
    <a class="op-card r${n}" href="#/op/${encodeURIComponent(op.id)}">
      <img class="op-avatar" src="${portrait1}" data-fallback="${fallbacks}" alt="${escHtml(op.name)}" loading="lazy"
           onerror="const l=(this.dataset.fallback||'').split('|').filter(Boolean);if(l.length){this.src=l.shift();this.dataset.fallback=l.join('|')}else{this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'}">
      <div class="op-info">
        <div class="op-name" title="${escHtml(op.name)}">${escHtml(base)}</div>
        <div class="op-epithet"${epithet ? ` title="${escHtml(op.name)}"` : ''}>${epithet ? escHtml(epithet) : '&nbsp;'}</div>
        <div class="op-class-row">
          <img class="op-class-icon" src="${classIconUrl(cls)}" alt="" loading="lazy">
          <span class="op-class-label">${label}</span>
        </div>
        <span class="op-rarity r${n}">${stars}</span>
      </div>
    </a>
  `;
}

function render(container: HTMLElement): void {
  const ops = sortOps(filterOps(getOperators(), state), state.sort);
  document.getElementById('count')!.textContent = `${ops.length} operators`;
  if (ops.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No results</div>Try a different name or filter.</div>`;
    return;
  }
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
}

function activeCount(): number {
  return state.classes.size + state.rarities.size + state.tags.size + (state.subclass ? 1 : 0);
}

// ── Secondary filter panel (subclass + tags), built from the data ──

function renderMore(): void {
  const panel = document.getElementById('more-filters')!;
  panel.hidden = !state.moreOpen;
  if (!state.moreOpen) return;

  const subs = subclassesFor(getOperators(), state.classes);
  // A subclass from a now-deselected class would filter everything out.
  if (state.subclass && !subs.some(s => s.id === state.subclass)) state.subclass = '';

  panel.innerHTML = `
    <div class="filter-row">
      <label class="filter-label" for="subclass">Subclass</label>
      <select id="subclass">
        <option value="">Any</option>
        ${subs.map(s => `
          <option value="${escHtml(s.id)}"${s.id === state.subclass ? ' selected' : ''}>${escHtml(s.label)}</option>
        `).join('')}
      </select>
      <span class="filter-hint">${subs.length} in scope</span>
    </div>
    <div class="filter-row">
      <span class="filter-label">Tags</span>
      <div class="seg" id="tag-mode">
        <button class="seg-btn${state.tagMode === 'any' ? ' on' : ''}" data-mode="any">Any</button>
        <button class="seg-btn${state.tagMode === 'all' ? ' on' : ''}" data-mode="all">All</button>
      </div>
      <div class="tag-chips">
        ${allTags(getOperators()).map(t => `
          <button class="chip${state.tags.has(t) ? ' active' : ''}" data-tag="${escHtml(t)}">${escHtml(t)}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function syncChips(): void {
  document.querySelectorAll<HTMLButtonElement>('#chips .chip[data-kind]').forEach(chip => {
    const { kind, value } = chip.dataset;
    const active = kind === 'class'
      ? state.classes.has(value as Profession)
      : state.rarities.has(Number(value));
    chip.classList.toggle('active', active);
  });
  const more = document.getElementById('more-toggle');
  if (more) {
    const n = activeCount();
    more.textContent = n ? `Filters · ${n}` : 'Filters';
    more.classList.toggle('active', state.moreOpen);
  }
  const clear = document.getElementById('clear-filters') as HTMLButtonElement | null;
  if (clear) clear.hidden = activeCount() === 0;
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

function clearAll(): void {
  state.classes.clear();
  state.rarities.clear();
  state.tags.clear();
  state.subclass = '';
}

export function mountGrid(container: HTMLElement): void {
  const search = document.getElementById('search') as HTMLInputElement;
  const sort   = document.getElementById('sort') as HTMLSelectElement;
  const chips  = document.getElementById('chips')!;
  search.style.display = '';
  sort.style.display = '';
  chips.style.display = '';
  document.getElementById('more-filters')!.style.display = '';

  search.value = state.query;
  sort.value = state.sort;
  syncChips();
  renderMore();
  render(container);

  const refresh = () => { syncChips(); renderMore(); render(container); };

  search.oninput = () => { state.query = search.value; render(container); };
  sort.onchange  = () => { state.sort = sort.value as SortKey; render(container); };

  chips.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el) return;
    if (el.id === 'more-toggle') { state.moreOpen = !state.moreOpen; refresh(); return; }
    if (el.id === 'clear-filters') { clearAll(); refresh(); return; }
    if (el.dataset.kind) { toggleChip(el); refresh(); }
  };

  const panel = document.getElementById('more-filters')!;
  panel.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el) return;
    if (el.dataset.mode) { state.tagMode = el.dataset.mode as TagMode; refresh(); return; }
    const tag = el.dataset.tag;
    if (tag) {
      if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
      refresh();
    }
  };
  panel.onchange = (ev) => {
    const el = ev.target as HTMLSelectElement;
    if (el.id !== 'subclass') return;
    state.subclass = el.value;
    syncChips();
    render(container);
  };
}
