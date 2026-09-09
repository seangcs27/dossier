import { operatorAvatarUrl, operatorPortraitUrl, classIconUrl, archetypeIconUrl } from '../../shared/api/hella-api';
import type { OperatorIndexEntry, Profession } from '../../shared/types';
import {
  getOperators,
  filterOps,
  sortOps,
  subclassesFor,
  allTags,
  allCollabs,
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
  collabs: new Set<string>(),
  moreOpen: false,
  // Tags and sort live behind a disclosure. They're the least-reached-for controls and
  // the tag list alone is longer than everything above it put together.
  advancedOpen: false,
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

  // The edge strip runs where the operator is from, repeated down the plate. Nation
  // first, then the crossover: collab characters have no nation because they aren't from
  // Terra, so the crossover answers the same question for them. The order matters —
  // Monster Hunter operators are Terra natives in costume and keep their real nation, so
  // they must not fall through to the collab. The project name is the last resort, for
  // the handful with neither, and keeps the strip from reading as a broken element.
  //
  // The repeat count is derived rather than fixed, so density stays even: a flat 4 left
  // "Yan" as mostly empty strip while overflowing "Rim Billiton". ~55 characters is what
  // fills the card's height at 8px with the strip's tracking; the strip crops what's left
  // over, which is what the real tags do at their ends anyway.
  const edgeWord = op.nation || op.collab || 'Dossier';
  const edgeText = Array(Math.max(2, Math.round(55 / (edgeWord.length + 3))))
    .fill(edgeWord).join(' · ');

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
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
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
  return state.classes.size + state.rarities.size + state.tags.size + state.collabs.size
    + (state.subclass ? 1 : 0);
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
  const collabs = allCollabs(getOperators());
  // A subclass from a now-deselected class would filter everything out.
  if (state.subclass && !subs.some(s => s.id === state.subclass)) state.subclass = '';

  // release-desc/asc and name-asc/desc collapse to a field plus a direction, which is what
  // the control actually offers: pick a field, click it again to flip. Newest-first and
  // A-Z are each their own key's "natural" first press.
  const sortField = state.sort.startsWith('release') ? 'release' : 'name';
  const sortDesc = state.sort === 'release-desc' || state.sort === 'name-desc';

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
      <div class="filter-label">Archetype / Subclass</div>
      ${state.classes.size
        ? `<div class="branch-row">
            ${subs.map(s => `
              <button class="chip chip-icon-label${s.id === state.subclass ? ' active' : ''}" data-sub="${escHtml(s.id)}">
                <img src="${archetypeIconUrl(s.id)}" alt="" loading="lazy" onerror="this.remove()">
                ${escHtml(s.label)}
              </button>
            `).join('')}
          </div>`
        : '<div class="filter-empty">Select a class</div>'}
    </div>

    <div class="filter-group">
      <div class="filter-label">Rarity</div>
      <div class="rarity-row">
        ${[1, 2, 3, 4, 5, 6].map(r => `
          <button class="rarity-btn r${r}${state.rarities.has(r) ? ' on' : ''}"
                  data-kind="rarity" data-value="${r}" aria-pressed="${state.rarities.has(r)}">
            ${r}<span class="rarity-star">★</span>
          </button>
        `).join('')}
      </div>
    </div>

    ${collabs.length ? `
      <div class="filter-group">
        <div class="filter-label">Collab</div>
        <div class="collab-row">
          ${collabs.map(c => `
            <button class="chip${state.collabs.has(c) ? ' active' : ''}" data-collab="${escHtml(c)}">
              ${escHtml(c)}
            </button>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <button class="filter-disclosure${state.advancedOpen ? ' open' : ''}" id="advanced-toggle"
            aria-expanded="${state.advancedOpen}" aria-controls="advanced-options">
      Advanced options
      <svg class="disclosure-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5 8 10.5l4-4"></path></svg>
    </button>

    <div class="filter-advanced" id="advanced-options"${state.advancedOpen ? '' : ' hidden'}>
      <div class="filter-group">
        <div class="filter-label">Sort</div>
        <div class="sort-row">
          ${[{ id: 'release', label: 'Release order' }, { id: 'name', label: 'Name' }].map(o => `
            <button class="chip sort-btn${sortField === o.id ? ' active' : ''}" data-sort="${o.id}"
                    title="${sortField === o.id ? 'Click again to reverse' : ''}">
              ${o.label}
              ${sortField === o.id ? `
                <svg class="sort-dir${sortDesc ? ' desc' : ''}" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 3v10M4.5 9.5 8 13l3.5-3.5"></path>
                </svg>` : ''}
            </button>
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
    </div>

    <button class="filter-clear" id="clear-filters"${activeCount() ? '' : ' disabled'}>Clear Filters</button>
  `;
}

function syncChips(): void {
  const more = document.getElementById('more-toggle');
  if (!more) return;
  const n = activeCount();
  // Write to the label span, not the button. The button also holds an inline <svg>, and
  // setting textContent on it replaces every child node — which silently deleted the icon
  // on the first mount, before it was ever painted.
  const label = document.getElementById('more-label');
  if (label) label.textContent = n ? `Filters · ${n}` : 'Filters';
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
  state.collabs.clear();
  state.subclass = '';
}

export function mountGrid(container: HTMLElement): void {
  const search  = document.getElementById('search') as HTMLInputElement;
  const actions = document.querySelector<HTMLElement>('.topbar-actions')!;
  const wrap    = document.querySelector<HTMLElement>('.search-wrap')!;
  wrap.style.display = '';
  actions.style.display = '';

  search.value = state.query;
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
    if (el.id === 'advanced-toggle') { state.advancedOpen = !state.advancedOpen; refreshChrome(); return; }
    const sortField = el.dataset.sort;
    if (sortField) {
      // Selecting the field already in use reverses it; switching fields starts at that
      // field's natural direction — newest first for release, A-Z for name.
      const active = state.sort.startsWith(sortField);
      const desc = state.sort === 'release-desc' || state.sort === 'name-desc';
      const next = active ? !desc : sortField === 'release';
      state.sort = `${sortField}-${next ? 'desc' : 'asc'}` as SortKey;
      refresh();
      return;
    }
    if (el.dataset.mode) { state.tagMode = el.dataset.mode as TagMode; refresh(); return; }
    if (el.dataset.kind) { toggleChip(el); refresh(); return; }
    const sub = el.dataset.sub;
    if (sub !== undefined) {
      // Branch is single-select — clicking the active one clears it.
      state.subclass = state.subclass === sub ? '' : sub;
      refresh();
      return;
    }
    const collab = el.dataset.collab;
    if (collab) {
      if (state.collabs.has(collab)) state.collabs.delete(collab); else state.collabs.add(collab);
      refresh();
      return;
    }
    const tag = el.dataset.tag;
    if (tag) {
      if (state.tags.has(tag)) state.tags.delete(tag); else state.tags.add(tag);
      refresh();
    }
  };

  // No click-away close. Filtering is a back-and-forth between the panel and the grid —
  // pick a class, look, narrow it, look again — and dismissing the panel on the first
  // glance at the results meant reopening it every time. It closes on the toggle, or on
  // Escape, and otherwise stays where it was put.
  document.onkeydown = (ev) => {
    if (ev.key !== 'Escape' || !state.moreOpen) return;
    state.moreOpen = false;
    refreshChrome();
    document.getElementById('more-toggle')?.focus();
  };
}
