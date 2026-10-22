import { endfieldIconUrl, endfieldPortraitUrl, endfieldSplashUrl } from '../../shared/api/hella-api';
import { getEndfieldOperators, type EndfieldOperator } from '../endfield-index';
import { escHtml } from '../format';
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
  // The operator the showcase has up, by id; '' until the page is first drawn.
  featured: '',
};

type Group = keyof typeof state.picks;

// The roster is a showcase (the owner's pick of three directions, 22 October 2026): one
// operator at a time, their splash art at full size on a drafting grid with their element
// written out behind it, their file on a plate beside it, and every operator the search and
// the picks leave in a filmstrip underneath, grouped by rarity. A frame in the strip, or
// the arrows, puts its operator up; the plate's link opens their dossier. Only the feature
// is redrawn on a change, so the strip keeps its scroll.

const pad = (n: number): string => String(n).padStart(2, '0');

function featureHtml(op: EndfieldOperator, at: number, of: number): string {
  const href = `#/endfield/op/${encodeURIComponent(op.id)}`;
  const index = `${pad(at + 1)} / ${pad(of)}`;
  // The id's number is the game's own file number: 'chr_0026_lastrite' is 0026.
  const file = /^chr_(\d+)/.exec(op.id)?.[1] ?? op.id;
  const specs = (['class', 'element', 'weapon'] as const).map(kind => `
    <div>
      <dt>${kind[0].toUpperCase() + kind.slice(1)}</dt>
      <dd><img src="${endfieldIconUrl(kind, op[kind])}" alt="" onerror="this.remove()">${escHtml(op[kind])}</dd>
    </div>`).join('');
  return `
    <div class="ef-feature" data-element="${escHtml(op.element.toLowerCase())}">
      <div class="ef-stage">
        <span class="ef-ghost" aria-hidden="true">${escHtml(op.element)}</span>
        <span class="ef-ruler" aria-hidden="true"></span>
        <span class="ef-code" aria-hidden="true">EF-${escHtml(file)} · ${escHtml(op.class)} · ${escHtml(op.element)}</span>
        <span class="ef-index" aria-hidden="true">${index}</span>
        <a class="ef-splash-link" href="${href}" tabindex="-1">
          <img class="ef-splash" src="${endfieldSplashUrl(op.id)}" alt="${escHtml(op.name)}"
               onerror="this.src='${endfieldPortraitUrl(op.id)}'; this.onerror=null">
        </a>
      </div>
      <div class="ef-plate">
        <div class="ef-plate-top">
          <span>File ${index}</span>
          <span class="ef-steps">
            <button type="button" class="ef-step" data-step="-1" aria-label="Previous operator">←</button>
            <button type="button" class="ef-step" data-step="1" aria-label="Next operator">→</button>
          </span>
        </div>
        <div>
          <span class="ef-ticks r${op.rarity}" role="img" aria-label="Rarity: ${op.rarity}">${'<span></span>'.repeat(op.rarity)}</span>
          <h2 class="ef-name">${escHtml(op.name)}${op.variant ? `<span class="ef-variant">${escHtml(op.variant)}</span>` : ''}</h2>
          <div class="ef-faction">${escHtml(op.faction)}</div>
        </div>
        <dl class="ef-specs">${specs}</dl>
        ${op.quote ? `<blockquote class="ef-quote">${escHtml(op.quote)}</blockquote>` : ''}
        ${op.tags.length ? `<div class="ef-tags">${op.tags.map(t => `<span>${escHtml(t)}</span>`).join('')}</div>` : ''}
        <a class="ef-open" href="${href}">Open dossier<span aria-hidden="true">→</span></a>
      </div>
    </div>
  `;
}

// The strip, a group to each rarity there is, highest first as the roster is baked. A frame
// is the bust from the card, with the name's first letter under it for an operator the
// build has no bust of (Si, today).
function stripHtml(ops: EndfieldOperator[], current: string): string {
  const rarities = [...new Set(ops.map(op => op.rarity))].sort((a, b) => b - a);
  return rarities.map((r) => {
    const group = ops.filter(op => op.rarity === r);
    return `
      <div class="ef-strip-group">
        <div class="ef-strip-label r${r}">${r}★ · ${pad(group.length)}</div>
        <div class="ef-strip-row">
          ${group.map(op => `
            <button type="button" class="ef-thumb" data-id="${escHtml(op.id)}" aria-pressed="${op.id === current}"
                    data-tip="${escHtml(op.name + (op.variant ? ` (${op.variant})` : ''))}"
                    aria-label="${escHtml(op.name + (op.variant ? ` (${op.variant})` : ''))}">
              <span class="ef-thumb-letter" aria-hidden="true">${escHtml(op.name[0])}</span>
              <img src="${endfieldPortraitUrl(op.id)}" alt="" loading="lazy" onerror="this.remove()">
            </button>`).join('')}
        </div>
      </div>`;
  }).join('');
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
  // The operator up stays up through a search that keeps them, and across visits.
  let at = Math.max(0, ops.findIndex(op => op.id === state.featured));
  state.featured = ops[at].id;
  container.innerHTML = `
    <div class="ef-show">
      <section class="ef-feature-slot" aria-label="Featured operator" aria-live="polite">${featureHtml(ops[at], at, ops.length)}</section>
      <nav class="ef-strip" aria-label="Operators">${stripHtml(ops, state.featured)}</nav>
    </div>
  `;
  const show = container.querySelector<HTMLElement>('.ef-show')!;
  const slot = show.querySelector<HTMLElement>('.ef-feature-slot')!;

  const feature = (next: number, focusStep?: string): void => {
    at = (next + ops.length) % ops.length;
    state.featured = ops[at].id;
    slot.innerHTML = featureHtml(ops[at], at, ops.length);
    show.querySelectorAll<HTMLElement>('.ef-thumb').forEach((thumb) => {
      const on = thumb.dataset.id === state.featured;
      thumb.setAttribute('aria-pressed', String(on));
      if (on) thumb.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    // The arrow pressed was rebuilt with the plate; the focus goes to its replacement.
    if (focusStep) slot.querySelector<HTMLElement>(`[data-step="${focusStep}"]`)?.focus();
  };

  show.onclick = (ev) => {
    const el = (ev.target as Element).closest<HTMLElement>('[data-step], .ef-thumb');
    if (!el) return;
    if (el.dataset.step) feature(at + Number(el.dataset.step), el.dataset.step);
    else feature(ops.findIndex(op => op.id === el.dataset.id));
  };
  // The arrow keys step through the strip from anywhere in the showcase.
  show.onkeydown = (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    const step = ev.key === 'ArrowLeft' ? -1 : 1;
    const fromThumb = (ev.target as Element).closest('.ef-thumb');
    feature(at + step, fromThumb ? undefined : String(step));
    if (fromThumb) show.querySelector<HTMLElement>(`.ef-thumb[data-id="${CSS.escape(state.featured)}"]`)?.focus();
  };
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

  // Another game's roster words the box for its own cast (card.ts).
  search.placeholder = 'Search operators…';
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
