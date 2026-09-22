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
import { mountCardSpin } from '../card-spin';

const state = {
  query: '',
  sort: 'release-desc' as SortKey,
  classes: new Set<Profession>(),
  rarities: new Set<number>(),
  subclasses: new Set<string>(),
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
  //
  // The branch glyph leads that line rather than sitting in the class row, so each glyph is
  // beside the name it stands for. In the class row it read as a second class icon.
  // .op-shade and .op-light are the card's lighting, and .op-card-back is the plate seen
  // from behind once it turns past a quarter. All three are inert until src/web/card-spin.ts
  // mounts: the back face is display:none and both light layers are transparent, so a card
  // nobody is touching carries no extra cost.
  return `
    <a class="op-card r${n}" href="#/op/${encodeURIComponent(op.id)}">
      <div class="op-plate">
      <div class="op-card-body">
        <img class="op-avatar" src="${portrait1}" data-fallback="${fallbacks}" alt="${escHtml(op.name)}" loading="lazy"
             onerror="const l=(this.dataset.fallback||'').split('|').filter(Boolean);if(l.length){this.src=l.shift();this.dataset.fallback=l.join('|')}else{this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'}">
        <div class="op-shade" aria-hidden="true"></div>
        <div class="op-overlay">
          <span class="visually-hidden">Rarity: ${n}</span>
          <div class="op-info">
            <div class="op-name" title="${escHtml(op.name)}">${escHtml(base)}</div>
            <div class="op-epithet"${epithet ? ` title="${escHtml(op.name)}"` : ''}>${epithet ? escHtml(epithet) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <img class="op-meta-icon" src="${classIconUrl(cls)}" alt="" title="${label}" loading="lazy">
              <span class="op-class-label" title="${label} · ${escHtml(op.archetype)}">${label}</span>
            </div>
            <div class="op-serial" title="${escHtml(op.archetype)} · ${escHtml(op.id)}">
              <img class="op-serial-icon" src="${archetypeIconUrl(op.subProfessionId)}" alt="" loading="lazy" onerror="this.remove()">
              <span class="op-serial-text">${escHtml(op.archetype)}</span>
            </div>
          </div>
          <span class="op-cta">View operator</span>
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
        <div class="op-light" aria-hidden="true"></div>
      </div>
      <div class="op-card-back" aria-hidden="true">
        <img class="op-avatar op-avatar-ghost" data-src="${portrait1}" data-fallback="${fallbacks}" alt=""
             onerror="const l=(this.dataset.fallback||'').split('|').filter(Boolean);if(l.length){this.src=l.shift();this.dataset.fallback=l.join('|')}else{this.remove()}">
        <div class="op-shade"></div>
        <div class="op-back-frost"></div>
        <div class="op-back-print">
          <div class="bk-head"><span class="bk-brand">Dossier</span><span class="bk-serial">${escHtml(op.id)}</span></div>
          <div class="bk-mid">
            <img class="bk-glyph" src="${classIconUrl(cls)}" alt="" loading="lazy">
            <div class="bk-name">${escHtml(op.name)}</div>
            <div class="bk-arch">${label} · ${escHtml(op.archetype)}</div>
          </div>
          <div class="bk-foot">
            <div class="bk-tags">${op.tags.map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('')}</div>
            <div class="bk-nation">${escHtml(edgeWord)}</div>
          </div>
        </div>
        <div class="op-edge op-edge-back">${escHtml(edgeText)}</div>
        <div class="op-light"></div>
      </div>
      <div class="op-side op-side-l" aria-hidden="true"></div>
      <div class="op-side op-side-r" aria-hidden="true"></div>
      <div class="op-stars r${n}" aria-hidden="true">
        <div class="op-tab-slice op-tab-front"></div>
        <div class="op-tab-slice op-tab-back"></div>
        <div class="op-tab-edge op-tab-edge-top"></div>
        <div class="op-tab-edge op-tab-edge-right"></div>
        <div class="op-tab-edge op-tab-edge-taper"></div>
        <div class="op-tab-edge op-tab-edge-bottom"></div>
        ${stars.split('').map(s => `<span>${s}</span>`).join('')}
      </div>
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
  mountCardSpin(container);
}

function activeCount(): number {
  return state.classes.size + state.rarities.size + state.tags.size + state.collabs.size
    + state.subclasses.size;
}

// ── Filter popover: every dimension in one panel, opened from the topbar ──

// Class order matches the in-game roster screen rather than the enum's alphabetical
// order, so the row reads the way people are used to seeing it.
const CLASS_ORDER: Profession[] = [
  'PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL',
];

// A selector that finds the same control again after renderMore() rebuilds the panel.
// Every panel control is identified by its id or by its data-* attributes.
function focusSelector(el: HTMLElement): string | null {
  const control = el.closest<HTMLElement>('button');
  if (!control) return null;
  if (control.id) return `#${CSS.escape(control.id)}`;
  const attrs = Object.entries(control.dataset)
    .map(([k, v]) => `[data-${k}="${CSS.escape(v ?? '')}"]`).join('');
  return attrs ? `button${attrs}` : null;
}

// One picked class's branches, as tiles under a header. "1 of 9" in the header is the cue
// that a pick narrows this class only; "All branches" says nothing narrows it yet. Labels drop
// the class word the header already carries ("Mech-accord", not "Mech-accord Caster"), so the
// full name goes in the tooltip and the accessible name, with the operator count. A branch at
// zero under the other active filters dims rather than disabling: loosening another filter
// can bring it back.
function branchGroup(cls: Profession, counts: ReadonlyMap<string, number>): string {
  const subs = subclassesFor(getOperators(), new Set([cls]));
  const picked = subs.filter(s => state.subclasses.has(s.id)).length;
  const classWord = new RegExp(`\\s${PROFESSION_LABEL[cls]}$`);
  return `
    <div class="branch-group">
      <div class="branch-head">
        <img src="${classIconUrl(PROFESSION_CSS[cls])}" alt="">${PROFESSION_LABEL[cls]}
        <span>${picked ? `${picked} of ${subs.length}` : 'All branches'}</span>
      </div>
      <div class="branch-tiles">
        ${subs.map(s => {
          const n = counts.get(s.id) ?? 0;
          const on = state.subclasses.has(s.id);
          return `
            <button class="branch-tile${on ? ' on' : ''}${n ? '' : ' zero'}" data-sub="${escHtml(s.id)}"
                    aria-pressed="${on}" aria-label="${escHtml(s.label)}, ${n} operators" title="${escHtml(s.label)} · ${n}">
              <img src="${archetypeIconUrl(s.id)}" alt="" loading="lazy" onerror="this.remove()">
              <span>${escHtml(s.label.replace(classWord, ''))}</span>
            </button>`;
        }).join('')}
      </div>
    </div>`;
}

function renderMore(): void {
  const panel = document.getElementById('more-filters')!;
  panel.hidden = !state.moreOpen;
  if (!state.moreOpen) return;

  const collabs = allCollabs(getOperators());
  // Operators per branch under every other active filter — what each branch tile would yield.
  const branchCounts = new Map<string, number>();
  for (const op of filterOps(getOperators(), { ...state, subclasses: new Set() })) {
    branchCounts.set(op.subProfessionId, (branchCounts.get(op.subProfessionId) ?? 0) + 1);
  }

  // release-desc/asc and name-asc/desc collapse to a field plus a direction, which is what
  // the control actually offers: pick a field, click it again to flip. Newest-first and
  // A-Z are each their own key's "natural" first press.
  const sortField = state.sort.startsWith('release') ? 'release' : 'name';
  const sortDesc = state.sort === 'release-desc' || state.sort === 'name-desc';

  // The rebuild below detaches whatever control was just used, which drops keyboard focus
  // to <body> — on every class, rarity, sort and tag toggle, in a panel that now stays open
  // for exactly that kind of repeated use. Note the focused control and put focus back on
  // its replacement.
  const focused = document.activeElement as HTMLElement | null;
  const refocus = focused && panel.contains(focused) ? focusSelector(focused) : null;

  panel.innerHTML = `
    <div class="filter-group">
      <div class="filter-label">Class</div>
      <div class="class-row">
        ${CLASS_ORDER.map(p => `
          <button class="class-btn${state.classes.has(p) ? ' on' : ''}"
                  data-kind="class" data-value="${p}" aria-pressed="${state.classes.has(p)}">
            <img src="${classIconUrl(PROFESSION_CSS[p])}" alt="">
            <span>${PROFESSION_LABEL[p]}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Archetype / Subclass</div>
      ${state.classes.size
        ? CLASS_ORDER.filter(p => state.classes.has(p)).map(p => branchGroup(p, branchCounts)).join('')
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
          ${[
            { id: 'release', label: 'Release order', asc: 'oldest first', desc: 'newest first' },
            { id: 'name', label: 'Name', asc: 'A to Z', desc: 'Z to A' },
          ].map(o => {
            const on = sortField === o.id;
            // The arrow is aria-hidden, so the direction has to be in the name too — the
            // <select> this replaced said "Newest" or "Oldest" out loud.
            const name = on ? `${o.label}, ${sortDesc ? o.desc : o.asc}` : o.label;
            return `
              <button class="chip sort-btn${on ? ' active' : ''}" data-sort="${o.id}"
                      aria-pressed="${on}" aria-label="${name}"
                      title="${on ? 'Click again to reverse' : ''}">
                ${o.label}
                ${on ? `
                  <svg class="sort-dir${sortDesc ? ' desc' : ''}" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M8 3v10M4.5 9.5 8 13l3.5-3.5"></path>
                  </svg>` : ''}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-label">
          Tags
          <span class="seg" id="tag-mode">
            <button class="seg-btn${state.tagMode === 'any' ? ' on' : ''}" data-mode="any" aria-pressed="${state.tagMode === 'any'}">Any</button>
            <button class="seg-btn${state.tagMode === 'all' ? ' on' : ''}" data-mode="all" aria-pressed="${state.tagMode === 'all'}">All</button>
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

  if (refocus) {
    // Clear Filters disables itself once there's nothing left to clear, and a disabled
    // button can't take focus, so hand it to the toggle rather than letting it fall away.
    const target = panel.querySelector<HTMLButtonElement>(refocus);
    if (target && !target.disabled) target.focus();
    else document.getElementById('more-toggle')?.focus();
  }
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
    // Drop a subclass the class change has orphaned. It has to happen here, before the
    // refresh counts active filters, and it has to treat "no classes" as orphaning too:
    // subclassesFor() returns every subclass for an empty set, and with no class picked the
    // panel shows a prompt instead of chips — a leftover subclass would keep filtering the
    // grid with nothing on screen to turn it off.
    const live = new Set(subclassesFor(getOperators(), state.classes).map(s => s.id));
    for (const id of state.subclasses) {
      if (!state.classes.size || !live.has(id)) state.subclasses.delete(id);
    }
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
  state.subclasses.clear();
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
      if (state.subclasses.has(sub)) state.subclasses.delete(sub); else state.subclasses.add(sub);
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
  //
  // Escape acts only while the panel is actually on screen — the detail page hides it
  // without resetting state, and this handler outlives the grid. It also leaves the search
  // box alone: moving focus mid-keydown there let the native clear empty the field without
  // firing `input`, so the grid stayed filtered by text that was gone. And focus returns to
  // the toggle only when it started inside the panel, instead of being pulled from wherever
  // the user was.
  document.onkeydown = (ev) => {
    if (ev.key !== 'Escape' || document.getElementById('more-filters')!.hidden) return;
    const target = ev.target as HTMLElement;
    if (target.id === 'search') return;
    const fromPanel = !!target.closest('#more-filters');
    state.moreOpen = false;
    refreshChrome();
    if (fromPanel) document.getElementById('more-toggle')?.focus();
  };
}
