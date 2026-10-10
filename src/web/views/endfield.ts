import { endfieldIconUrl, endfieldPortraitUrl } from '../../shared/api/hella-api';
import { getEndfieldOperators, type EndfieldOperator } from '../endfield-index';
import { escHtml } from '../format';
import { mountCardSpin } from '../card-spin';
import { focusSelector, watchFilterTab } from './grid';

// This page's own search and picks. The box in the topbar and the panel under it are the
// Arknights grid's too, and whichever grid mounted last has them; each keeps its state to
// itself, so one game's search never turns up in the other's box.
const state = {
  query: '',
  // What is picked in each of the panel's groups, under the name of the operator's field
  // that the group filters on. Rarities are held as text like the rest, which is how a pick
  // comes back off its button.
  picks: {
    class: new Set<string>(),
    element: new Set<string>(),
    weapon: new Set<string>(),
    rarity: new Set<string>(),
    faction: new Set<string>(),
  },
  moreOpen: false,
};

type Group = keyof typeof state.picks;

// The plate the Arknights grid deals (grid.ts has the reasoning behind each layer), with an
// Endfield operator's own lines on it: class where the class sits, element and weapon where
// the branch does, faction up the edge, tags on the back. It opens the operator's dossier,
// and has a glyph where the Arknights card has each of its two: the class's beside the
// class, the element's at the head of the element and weapon line. A value the build has no
// glyph for goes without one.
function buildCard(op: EndfieldOperator): string {
  const portrait = endfieldPortraitUrl(op.id);
  // As many repeats as fill the strip, the same sum as the Arknights card's.
  const edgeText = Array(Math.max(2, Math.round(55 / (op.faction.length + 3))))
    .fill(op.faction).join(' · ');
  return `
    <a class="op-card r${op.rarity}" href="#/endfield/op/${encodeURIComponent(op.id)}">
      <div class="op-plate">
      <div class="op-card-body">
        <img class="op-avatar" src="${portrait}" alt="${escHtml(op.name)}" loading="lazy"
             onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">
        <div class="op-shade" aria-hidden="true"></div>
        <div class="op-overlay">
          <span class="visually-hidden">Rarity: ${op.rarity}</span>
          <div class="op-info">
            <div class="op-name">${escHtml(op.name)}</div>
            <div class="op-epithet">${op.variant ? escHtml(op.variant) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <img class="op-meta-icon" src="${endfieldIconUrl('class', op.class)}" alt="" data-tip="${escHtml(op.class)}" loading="lazy" onerror="this.remove()">
              <span class="op-class-label">${escHtml(op.class)}</span>
            </div>
            <div class="op-serial" data-tip="${escHtml(op.id)}">
              <img class="op-serial-icon" src="${endfieldIconUrl('element', op.element)}" alt="" loading="lazy" onerror="this.remove()">
              <span class="op-serial-text">${escHtml(op.element)} · ${escHtml(op.weapon)}</span>
            </div>
          </div>
          <span class="op-cta">View operator</span>
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
        <div class="op-light" aria-hidden="true"></div>
      </div>
      <div class="op-card-back" aria-hidden="true">
        <img class="op-avatar op-avatar-ghost" data-src="${portrait}" alt="" onerror="this.remove()">
        <div class="op-shade"></div>
        <div class="op-back-frost"></div>
        <div class="op-back-print">
          <div class="bk-head"><span class="bk-serial">${escHtml(op.id)}</span></div>
          <div class="bk-mid"></div>
          <div class="bk-foot">
            <div class="bk-tags">${op.tags.map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="op-edge op-edge-back">${escHtml(edgeText)}</div>
        <div class="op-light"></div>
      </div>
      <div class="op-side op-side-l" aria-hidden="true"></div>
      <div class="op-side op-side-r" aria-hidden="true"></div>
      <div class="op-stars r${op.rarity}" aria-hidden="true">
        <div class="op-tab-slice op-tab-front"></div>
        <div class="op-tab-slice op-tab-back"></div>
        <div class="op-tab-edge op-tab-edge-top"></div>
        <div class="op-tab-edge op-tab-edge-right"></div>
        <div class="op-tab-edge op-tab-edge-taper"></div>
        <div class="op-tab-edge op-tab-edge-bottom"></div>
        ${'<span>★</span>'.repeat(op.rarity)}
      </div>
      </div>
    </a>
  `;
}

// What the search and the picks leave of the roster. Within a group any one pick will do;
// across groups an operator has to pass every group that has a pick. The roster is baked
// highest rarity first and then by name, and this keeps its order.
function filteredOps(): EndfieldOperator[] {
  const q = state.query.toLowerCase().trim();
  const groups = Object.entries(state.picks) as [Group, Set<string>][];
  return getEndfieldOperators().filter(op =>
    op.name.toLowerCase().includes(q)
    && groups.every(([group, picked]) => !picked.size || picked.has(String(op[group]))));
}

function render(container: HTMLElement): void {
  const ops = filteredOps();
  document.getElementById('count')!.textContent = `${ops.length} operators`;
  document.getElementById('search-count')!.textContent = String(ops.length);
  if (ops.length === 0) {
    // With no roster at all it is the build that came back empty, not the filters.
    container.innerHTML = getEndfieldOperators().length
      ? `<div class="state-msg"><div class="label">No results</div>Try a different name or filter.</div>`
      : `<div class="state-msg"><div class="label">No operators</div>The last build could not reach the Endfield wiki.</div>`;
    return;
  }
  // In one pass, with none of the Arknights grid's batching: that is there for a roster of
  // hundreds, and this one is a few dozen.
  container.innerHTML = `<div id="grid">${ops.map(buildCard).join('')}</div>`;
  mountCardSpin(container);
}

// ── Filter popover: the Arknights grid's panel, with this game's groups in it ──

// The three groups whose values are tiles, each written out in the order its tiles stand
// in. Not read off the roster: that would put them in whatever order its first operators
// happen to bring them, and move them when one is added.
const CLASSES = ['Guard', 'Vanguard', 'Caster', 'Defender', 'Supporter', 'Striker'];
const ELEMENTS = ['Physical', 'Heat', 'Cryo', 'Electric', 'Nature'];
const WEAPONS = ['Sword', 'Great Sword', 'Polearm', 'Handcannon', 'Arts Unit'];

// One tile of the Class, Element or Weapon group: the glyph over the name, the Arknights
// panel's class tile. A value the build has no glyph for is its name alone.
//
// The pick is under data-group where that panel has data-kind, so that neither grid's
// handler takes the other's buttons for its own. Leave one grid for the other with the
// panel open, and the old buttons are still in it, out of sight but within reach, for the
// half second .filter-pop takes to hide (styles.scss); a press there would otherwise file
// a pick under a game that has no such value.
function tile(group: 'class' | 'element' | 'weapon', value: string): string {
  const on = state.picks[group].has(value);
  return `
    <button class="class-btn${on ? ' on' : ''}" data-group="${group}" data-value="${escHtml(value)}" aria-pressed="${on}">
      <img src="${endfieldIconUrl(group, value)}" alt="" onerror="this.remove()">
      <span>${escHtml(value)}</span>
    </button>`;
}

function renderMore(): void {
  const panel = document.getElementById('more-filters')!;
  panel.hidden = !state.moreOpen;
  if (!state.moreOpen) return;

  // The rebuild takes the button just pressed with it, and the keyboard's focus with the
  // button. Note which it was and put the focus on its replacement, as the Arknights panel
  // does; every button here comes back, so there always is one.
  const focused = document.activeElement as HTMLElement | null;
  const refocus = focused && panel.contains(focused) ? focusSelector(focused) : null;

  // By name: nothing dates a faction or ranks one, and its name is what gets looked for.
  const factions = [...new Set(getEndfieldOperators().map(op => op.faction))]
    .sort((a, b) => a.localeCompare(b));

  panel.innerHTML = `
    <div class="filter-group">
      <div class="filter-label">Class</div>
      <div class="class-row ef-class-row">${CLASSES.map(c => tile('class', c)).join('')}</div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Element</div>
      <div class="class-row ef-five-row">${ELEMENTS.map(e => tile('element', e)).join('')}</div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Weapon</div>
      <div class="class-row ef-five-row">${WEAPONS.map(w => tile('weapon', w)).join('')}</div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Rarity</div>
      <div class="rarity-row ef-rarity-row">
        ${['4', '5', '6'].map(r => `
          <button class="rarity-btn r${r}${state.picks.rarity.has(r) ? ' on' : ''}"
                  data-group="rarity" data-value="${r}" aria-pressed="${state.picks.rarity.has(r)}">
            ${r}<span class="rarity-star">★</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Faction</div>
      <div class="collab-row">
        ${factions.map(f => `
          <button class="chip${state.picks.faction.has(f) ? ' active' : ''}"
                  data-group="faction" data-value="${escHtml(f)}" aria-pressed="${state.picks.faction.has(f)}">
            ${escHtml(f)}
          </button>
        `).join('')}
      </div>
    </div>
  `;

  if (refocus) panel.querySelector<HTMLElement>(refocus)?.focus();
}

// The Filters button's label and lit state, the open panel's class on the cluster, and
// whether Clear has anything to clear: the Arknights grid's syncChips(), from this page's
// state.
function syncChips(): void {
  const n = Object.values(state.picks).reduce((sum, picked) => sum + picked.size, 0);
  const more = document.getElementById('more-toggle')!;
  document.getElementById('more-label')!.textContent = n ? `Filters · ${n}` : 'Filters';
  more.classList.toggle('active', state.moreOpen || n > 0);
  more.setAttribute('aria-expanded', String(state.moreOpen));
  more.closest('.topbar-actions')!.classList.toggle('filters-open', state.moreOpen);
  (document.getElementById('clear-filters') as HTMLButtonElement).disabled = !n;
}

export function mountEndfield(container: HTMLElement): void {
  const search  = document.getElementById('search') as HTMLInputElement;
  const actions = document.querySelector<HTMLElement>('.topbar-actions')!;
  const wrap    = document.querySelector<HTMLElement>('.search-wrap')!;
  const toggle  = document.getElementById('more-toggle')!;
  const panel   = document.getElementById('more-filters')!;
  wrap.style.display = '';
  actions.style.display = '';
  watchFilterTab(actions, wrap);

  search.value = state.query;
  syncChips();
  renderMore();
  render(container);

  // The cards are rebuilt only by what changes which operators match; opening or closing
  // the panel leaves them alone.
  const refreshChrome = (): void => { syncChips(); renderMore(); };
  const refresh = (): void => { refreshChrome(); render(container); };

  // From here down it is the Arknights grid's handling of the box and the panel (grid.ts
  // has the reasoning behind each rule), on this page's state. Every handler is assigned,
  // not added, as it is there: the two grids work the same elements, and whichever mounted
  // last has to be the only one listening.
  const clear = document.getElementById('search-clear') as HTMLButtonElement;
  const syncQuery = (): void => { state.query = search.value; clear.disabled = !state.query; render(container); };
  clear.disabled = !state.query;
  search.oninput = syncQuery;
  clear.onclick = () => { search.value = ''; syncQuery(); search.focus(); };

  actions.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('#more-toggle, #clear-filters, #close-filters');
    if (!el) return;
    if (el.id === 'clear-filters') {
      for (const picked of Object.values(state.picks)) picked.clear();
      refresh();
    } else {
      // The close button only closes.
      state.moreOpen = el === toggle && !state.moreOpen;
      refreshChrome();
    }
    // Clear has just disabled itself and the close button has folded away, and neither can
    // hold the focus then, so it goes to the toggle.
    if (el !== toggle) toggle.focus();
  };

  panel.onclick = (ev) => {
    // This page's buttons only (see tile() above).
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-group]');
    if (!el) return;
    const picked = state.picks[el.dataset.group as Group];
    const value = el.dataset.value!;
    if (picked.has(value)) picked.delete(value); else picked.add(value);
    refresh();
  };

  // Shut by a press anywhere outside the cluster: the search box is the panel's head, and
  // typing a name while picking filters is one job.
  document.onpointerdown = (ev) => {
    if (!state.moreOpen || panel.hidden) return;
    if ((ev.target as Element).closest('.topbar-actions')) return;
    state.moreOpen = false;
    refreshChrome();
  };

  // Escape, while the panel is on screen: the dossier hides it without resetting the state,
  // and this handler outlives the page. Never from the search box, where Escape is the
  // browser's own clear, and moving the focus under it lost the `input` event (grid.ts). The
  // focus goes back to the toggle only if it was in the panel.
  document.onkeydown = (ev) => {
    if (ev.key !== 'Escape' || panel.hidden) return;
    const target = ev.target as HTMLElement;
    if (target.id === 'search') return;
    const fromPanel = panel.contains(target);
    state.moreOpen = false;
    refreshChrome();
    if (fromPanel) toggle.focus();
  };
}
