import { operatorAvatarUrl, operatorPortraitUrl, classIconUrl, archetypeIconUrl } from '../../shared/api/hella-api';
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

  // The text block is an overlay on the art, not a panel beneath it — Sanity Gone's
  // treatment: the card is one uninterrupted illustration and the name/class/rarity ride
  // a transparent-to-black gradient over its lower half, so nothing reads as a grey shelf.
  //
  // .op-serial and .op-edge come from Arknights' own SP Key Tag merch, which the card's
  // proportions already match almost exactly (the acrylic plate is 4.9x9.9cm; this card is
  // 1:2). The tags carry a micro line under the operator name and the issuing body
  // repeated up the plate's left edge.
  //
  // The micro line is the branch ("Primal Protector"), which the card otherwise only
  // exposes as a tooltip on the class glyph — the char id that sat here first looked the
  // part but told you nothing you'd want to know. The id stays as the line's `title`.
  return `
    <a class="op-card r${n}" href="#/op/${encodeURIComponent(op.id)}">
      <div class="op-card-body">
        <img class="op-avatar" src="${portrait1}" data-fallback="${fallbacks}" alt="${escHtml(op.name)}" loading="lazy"
             onerror="const l=(this.dataset.fallback||'').split('|').filter(Boolean);if(l.length){this.src=l.shift();this.dataset.fallback=l.join('|')}else{this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'}">
        <div class="op-overlay">
          <span class="visually-hidden">Rarity: ${n}</span>
          <div class="op-info">
            <div class="op-name" title="${escHtml(op.name)}">${escHtml(base)}</div>
            <div class="op-epithet"${epithet ? ` title="${escHtml(op.name)}"` : ''}>${epithet ? escHtml(epithet) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <img class="op-meta-icon" src="${classIconUrl(cls)}" alt="" title="${label}" loading="lazy">
              <img class="op-meta-icon op-meta-icon-sub" src="${archetypeIconUrl(op.subProfessionId)}"
                   alt="" title="${escHtml(op.archetype)}" loading="lazy" onerror="this.remove()">
              <span class="op-class-label" title="${label} · ${escHtml(op.archetype)}">${label}</span>
            </div>
            <div class="op-serial" title="${escHtml(op.archetype)} · ${escHtml(op.id)}">${escHtml(op.archetype)}</div>
          </div>
          <span class="op-cta">View operator</span>
        </div>
        <div class="op-edge" aria-hidden="true">Dossier · Dossier · Dossier · Dossier</div>
      </div>
      <div class="op-stars r${n}" aria-hidden="true">${stars.split('').map(s => `<span>${s}</span>`).join('')}</div>
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

// ── Filter popover: every dimension in one panel, opened from the topbar ──

// Class order matches the in-game roster screen rather than the enum's alphabetical
// order, so the row reads the way people are used to seeing it.
const CLASS_ORDER: Profession[] = [
  'PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL',
];

function renderMore(): void {
  const panel = document.getElementById('more-filters')!;
  panel.hidden = !state.moreOpen;
  if (!state.moreOpen) return;

  const subs = subclassesFor(getOperators(), state.classes);
  // A subclass from a now-deselected class would filter everything out.
  if (state.subclass && !subs.some(s => s.id === state.subclass)) state.subclass = '';

  panel.innerHTML = `
    <div class="filter-group">
      <div class="filter-label">Class</div>
      <div class="class-row">
        ${CLASS_ORDER.map(p => `
          <button class="class-btn${state.classes.has(p) ? ' on' : ''}"
                  data-kind="class" data-value="${p}" title="${PROFESSION_LABEL[p]}"
                  aria-pressed="${state.classes.has(p)}">
            <img src="${classIconUrl(PROFESSION_CSS[p])}" alt="${PROFESSION_LABEL[p]}">
          </button>
        `).join('')}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Branch${state.classes.size ? '' : ' <span class="filter-hint">— pick a class first</span>'}</div>
      <div class="branch-row">
        ${subs.length
          ? subs.map(s => `
              <button class="chip${s.id === state.subclass ? ' active' : ''}" data-sub="${escHtml(s.id)}">
                ${escHtml(s.label)}
              </button>
            `).join('')
          : '<span class="filter-hint">All branches</span>'}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Rarity</div>
      <div class="rarity-row">
        ${[6, 5, 4, 3, 2, 1].map(r => `
          <button class="chip r${r}${state.rarities.has(r) ? ' active' : ''}"
                  data-kind="rarity" data-value="${r}">${r}★</button>
        `).join('')}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">
        Tags
        <span class="seg" id="tag-mode">
          <button class="seg-btn${state.tagMode === 'any' ? ' on' : ''}" data-mode="any">Any</button>
          <button class="seg-btn${state.tagMode === 'all' ? ' on' : ''}" data-mode="all">All</button>
        </span>
      </div>
      <div class="tag-chips">
        ${allTags(getOperators()).map(t => `
          <button class="chip${state.tags.has(t) ? ' active' : ''}" data-tag="${escHtml(t)}">${escHtml(t)}</button>
        `).join('')}
      </div>
    </div>

    <button class="filter-clear" id="clear-filters"${activeCount() ? '' : ' disabled'}>Clear Filters</button>
  `;
}

function syncChips(): void {
  const more = document.getElementById('more-toggle');
  if (!more) return;
  const n = activeCount();
  more.textContent = n ? `Filters · ${n}` : 'Filters';
  more.classList.toggle('active', state.moreOpen || n > 0);
  more.setAttribute('aria-expanded', String(state.moreOpen));
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
  const search  = document.getElementById('search') as HTMLInputElement;
  const sort    = document.getElementById('sort') as HTMLSelectElement;
  const actions = document.querySelector<HTMLElement>('.topbar-actions')!;
  const wrap    = document.querySelector<HTMLElement>('.search-wrap')!;
  wrap.style.display = '';
  actions.style.display = '';

  search.value = state.query;
  sort.value = state.sort;
  syncChips();
  renderMore();
  render(container);

  // Two levels of refresh. `refresh` rebuilds the grid too and is for anything that
  // changes which operators match; `refreshChrome` leaves it alone. Opening the popover
  // used to call the full one, which re-serialised all 427 cards into innerHTML and threw
  // away every <img> in them — the whole grid visibly reloaded just to show a panel.
  const refreshChrome = () => { syncChips(); renderMore(); };
  const refresh = () => { refreshChrome(); render(container); };

  search.oninput = () => { state.query = search.value; render(container); };
  sort.onchange  = () => { state.sort = sort.value as SortKey; render(container); };

  actions.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('#more-toggle');
    if (!el) return;
    state.moreOpen = !state.moreOpen;
    refreshChrome();
  };

  const panel = document.getElementById('more-filters')!;
  panel.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!el) return;
    if (el.id === 'clear-filters') { clearAll(); refresh(); return; }
    if (el.dataset.mode) { state.tagMode = el.dataset.mode as TagMode; refresh(); return; }
    if (el.dataset.kind) { toggleChip(el); refresh(); return; }
    const sub = el.dataset.sub;
    if (sub !== undefined) {
      // Branch is single-select — clicking the active one clears it.
      state.subclass = state.subclass === sub ? '' : sub;
      refresh();
      return;
    }
    const tag = el.dataset.tag;
    if (tag) {
      if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
      refresh();
    }
  };

  // Click-away close, matching how the reference popover behaves. Registered on the
  // document rather than the panel so it also catches clicks on the grid below.
  document.onclick = (ev) => {
    if (!state.moreOpen) return;
    const t = ev.target as HTMLElement;
    if (t.closest('#more-filters') || t.closest('#more-toggle')) return;
    state.moreOpen = false;
    syncChips();
    renderMore();
  };
}
