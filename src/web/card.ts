import { escHtml } from './format';
import { mountCardSpin } from './card-spin';
import { focusSelector, watchFilterTab } from './views/grid';

/**
 * One card on the roster of a game that is not Arknights or Endfield: the plate the
 * Arknights grid deals (views/grid.ts has the reasoning behind each layer), with the game's
 * own words in its slots.
 */
export interface RosterCard {
  id: string;           // printed on the back, and the micro line's tooltip
  name: string;
  epithet?: string;     // the line under the name, where an Arknights alter's epithet goes
  tier: number;         // 1 to 6, the rarity colour; 6 is the site's red, a game's highest
  // What stands on the rarity tab, a character to a line and six at most: '★★★★★', 'S'.
  marks: string;
  // The tab as a screen reader is to say it, since the tab itself is hidden from one and
  // is not a rarity on every roster: 'Rarity: 5', 'Rank S', 'Debuted in 2020'.
  marksLabel: string;
  label: string;        // the class line
  serial: string;       // the micro line under it
  edge: string;         // the word repeated up the edge strip; never empty
  tags: string[];       // on the back
  // The picture: a 1:2 bust fills the plate as the Arknights portraits do. Without one the
  // plate shows the name's first letter where the picture would be.
  art?: string;
  // The page the card opens. Without one it opens nothing, and only turns.
  href?: string;
}

/** One group of the filter panel: the values to pick among, and which of them an item has. */
export interface RosterFilter<T> {
  key: string;          // names the group in the picks and on its buttons
  label: string;
  values: string[];     // in the order their buttons stand in
  // Tiles as the Arknights classes are, a joined row as its rarities are, loose chips, or
  // badges: a button to a value with the game's own picture for it before its name.
  look: 'tiles' | 'ranks' | 'chips' | 'badges';
  across?: number;      // tiles and ranks: how many to a row, where not all of them
  tier?: (value: string) => number;   // ranks: the rarity colour a value's button takes
  of: (item: T) => string | string[];
  folded?: boolean;     // shut behind its label until asked for: a list too long to stand open
  // What a value's button says, where that is not the value itself: its name in the
  // language the page is in, the value staying what the picks are kept by.
  text?: (value: string) => string;
  icon?: (value: string) => string | undefined;   // badges: the picture's address, where there is one
  // The values in named rows, where the game sorts them into kinds: every one of `values`
  // is in some row.
  sets?: { label: string; values: string[] }[];
}

/** A switch of the page's own over the grid, beside the order's and the look's. */
export interface RosterSwitch {
  name: string;         // what it chooses, for a screen reader
  options: RosterOption[];
  on: string;           // the id of the choice that is on
  // What a press on another does. The page is the caller's to redraw: the switch may
  // change what every part of it says.
  pick: (id: string) => void;
}

/**
 * A roster's search and picks. The game's own view keeps one, so that they are still there
 * after a visit to another page, and never turn up on another game's roster.
 */
export interface RosterState {
  query: string;
  picks: Record<string, Set<string>>;   // by group; a group nobody has picked in has no entry
  open: boolean;                        // the filter panel
  unfolded: Set<string>;                // the folded groups that have been opened
  look: string;                         // which of the roster's `looks` is on; '' is the first
  order: string;                        // which of its `orders`; '' is the first
}

export function newRosterState(): RosterState {
  return { query: '', picks: {}, open: false, unfolded: new Set(), look: '', order: '' };
}

/** One choice of a switch over the grid. `tip` is its tooltip, where the label wants one. */
export interface RosterOption {
  id: string;
  label: string;
  tip?: string;
}

/** An order to deal a roster in. One without `compare` is the order its items came in. */
export interface RosterOrder<T> extends RosterOption {
  compare?: (a: T, b: T) => number;
}

export interface Roster<T> {
  items: T[];
  // `look` is the one of `looks` that is on, or '' on a roster that has none.
  toCard?: (item: T, look: string) => RosterCard;
  // A page of the game's own in place of the cards, for a game whose roster is not a grid
  // of them: handed the element to fill and the items in the order to show them, with the
  // look and the order that are on. The count, the search box, the filter panel and the
  // switches stay this file's. A roster has this or `toCard`.
  draw?: (page: HTMLElement, items: T[], look: string, order: string) => void;
  // Two or more ways to draw the same cards, with a switch over the grid to choose between
  // them: a game whose own roster shows its cast in more than one kind of picture. `name` is
  // what the switch chooses, for a screen reader, where that is not the cards' art.
  looks?: { state: RosterState; options: RosterOption[]; name?: string };
  // Two or more orders to deal the cards in, with a switch of their own beside that one.
  orders?: { state: RosterState; options: RosterOrder<T>[] };
  switches?: RosterSwitch[];
  noun: string;         // what the game calls its cast, in the plural: 'sinners'
  prompt?: string;      // the search box's placeholder, where 'Search <noun>…' is not it
  emptyNote: string;    // what the page says when the build had nothing to bake
  cta?: string;         // what a card that opens a page says under the pointer: 'View sinner'
  // With this the page has the topbar's search box and filter panel; without it, neither.
  // `text` is what the search looks in.
  find?: { state: RosterState; text: (item: T) => string; filters: RosterFilter<T>[] };
}

function buildCard(card: RosterCard, cta: string): string {
  // As many repeats as fill the strip, the same sum as the Arknights card's.
  const edgeText = Array(Math.max(2, Math.round(55 / (card.edge.length + 3))))
    .fill(card.edge).join(' · ');
  // The tab's cut edges, seen once the card is turned, are drawn for a tab of one to six
  // lines, under the class an Arknights card has for its rarity (styles.scss). Here the
  // lines and the colour are two things, a 5★ Servant being five lines in the top colour:
  // the class is the number of lines, and the colour it would also set is given by hand.
  const lines = Math.min(6, Math.max(1, [...card.marks].length));
  const tag = card.href ? 'a' : 'div';
  return `
    <${tag} class="op-card r${card.tier}"${card.href ? ` href="${escHtml(card.href)}"` : ''}>
      <div class="op-plate">
      <div class="op-card-body">
        ${card.art
          ? `<img class="op-avatar" src="${escHtml(card.art)}" alt="${escHtml(card.name)}" loading="lazy"
                  onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">`
          : `<div class="op-avatar-placeholder">${escHtml([...card.name][0] ?? '?')}</div>`}
        <div class="op-shade" aria-hidden="true"></div>
        <div class="op-overlay">
          <span class="visually-hidden">${escHtml(card.marksLabel)}</span>
          <div class="op-info">
            <div class="op-name">${escHtml(card.name)}</div>
            <div class="op-epithet">${card.epithet ? escHtml(card.epithet) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <span class="op-class-label">${escHtml(card.label)}</span>
            </div>
            <div class="op-serial" data-tip="${escHtml(card.id)}">
              <span class="op-serial-text">${escHtml(card.serial)}</span>
            </div>
          </div>
          ${card.href ? `<span class="op-cta">${escHtml(cta)}</span>` : ''}
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
        <div class="op-light" aria-hidden="true"></div>
      </div>
      <div class="op-card-back" aria-hidden="true">
        ${card.art ? `<img class="op-avatar op-avatar-ghost" data-src="${escHtml(card.art)}" alt="" onerror="this.remove()">` : ''}
        <div class="op-shade"></div>
        <div class="op-back-frost"></div>
        <div class="op-back-print">
          <div class="bk-head"><span class="bk-serial">${escHtml(card.id)}</span></div>
          <div class="bk-mid"></div>
          <div class="bk-foot">
            <div class="bk-tags">${card.tags.map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="op-edge op-edge-back">${escHtml(edgeText)}</div>
        <div class="op-light"></div>
      </div>
      <div class="op-side op-side-l" aria-hidden="true"></div>
      <div class="op-side op-side-r" aria-hidden="true"></div>
      <div class="op-stars r${lines}" style="color: var(--r${card.tier})" aria-hidden="true">
        <div class="op-tab-slice op-tab-front"></div>
        <div class="op-tab-slice op-tab-back"></div>
        <div class="op-tab-edge op-tab-edge-top"></div>
        <div class="op-tab-edge op-tab-edge-right"></div>
        <div class="op-tab-edge op-tab-edge-taper"></div>
        <div class="op-tab-edge op-tab-edge-bottom"></div>
        ${[...card.marks].map(m => `<span>${escHtml(m)}</span>`).join('')}
      </div>
      </div>
    </${tag}>
  `;
}

// One of the switches over the grid: a joined row of buttons, the choice that is on pressed.
// `mark` gives the data attributes a press on a choice is read from.
function switchHtml(name: string, options: RosterOption[], on: string, mark: (id: string) => string): string {
  return `
    <span class="seg" role="group" aria-label="${escHtml(name)}">
      ${options.map(o => `
        <button class="seg-btn${o.id === on ? ' on' : ''}" ${mark(escHtml(o.id))} aria-pressed="${o.id === on}"
                ${o.tip ? `data-tip="${escHtml(o.tip)}"` : ''}>${escHtml(o.label)}</button>
      `).join('')}
    </span>
  `;
}

// Cards are built in batches as the page nears the end of what exists, as the Arknights
// grid's are (grid.ts has the measurements): one of these rosters is several hundred cards.
const BATCH = 48;
let more: IntersectionObserver | undefined;

// The count in the topbar's pill and, for a phone, inside the search box; then the cards, in
// the roster's order or the one its switch is on. `items` is what a search or a pick has
// left of the roster, or all of it.
function deal<T>(container: HTMLElement, roster: Roster<T>, items: T[]): void {
  more?.disconnect();
  // The word is in a span of its own for a phone to drop (styles.scss, .count-noun).
  document.getElementById('count')!.innerHTML =
    `${items.length} <span class="count-noun">${escHtml(roster.noun)}</span>`;
  document.getElementById('search-count')!.textContent = String(items.length);
  if (items.length === 0) {
    // With no roster at all it is the build that came back empty, not the filters.
    container.innerHTML = roster.items.length
      ? `<div class="state-msg"><div class="label">No results</div>Try a different name or filter.</div>`
      : `<div class="state-msg"><div class="label">No ${escHtml(roster.noun)}</div>${escHtml(roster.emptyNote)}</div>`;
    return;
  }
  const looks = roster.looks;
  const look = looks ? looks.state.look || looks.options[0].id : '';
  const orders = roster.orders;
  const order = orders?.options.find(o => o.id === orders.state.order) ?? orders?.options[0];
  // A sort keeps the order it was given wherever `compare` has nothing to say, so what an
  // order does not rank stays as the roster has it.
  const dealt = order?.compare ? [...items].sort(order.compare) : items;
  const switches = roster.switches ?? [];
  container.innerHTML = `
    ${looks || orders || switches.length ? `
      <div class="roster-bar">
        ${switches.map((s, i) => switchHtml(s.name, s.options, s.on, id => `data-switch="${i}" data-id="${id}"`)).join('')}
        ${orders ? switchHtml('Order', orders.options, order!.id, id => `data-order="${id}"`) : ''}
        ${looks ? switchHtml(looks.name ?? 'Card art', looks.options, look, id => `data-look="${id}"`) : ''}
      </div>
    ` : ''}
    ${roster.draw ? '<div class="roster-page"></div>' : '<div id="grid"></div><div id="grid-end"></div>'}
  `;
  // Either switch redraws the same cards its other way, and takes the focus with it.
  container.querySelector<HTMLElement>('.roster-bar')?.addEventListener('click', (ev) => {
    const pressed = (ev.target as Element).closest<HTMLElement>('[data-look], [data-order], [data-switch]');
    if (!pressed || pressed.getAttribute('aria-pressed') === 'true') return;
    const { look: pickedLook, order: pickedOrder } = pressed.dataset;
    // A switch of the page's own is the page's to answer, redraw and all.
    if (pressed.dataset.switch) {
      switches[Number(pressed.dataset.switch)].pick(pressed.dataset.id!);
      return;
    }
    if (pickedLook) looks!.state.look = pickedLook;
    else orders!.state.order = pickedOrder!;
    deal(container, roster, items);
    container.querySelector<HTMLElement>(pickedLook ? `[data-look="${pickedLook}"]` : `[data-order="${pickedOrder}"]`)?.focus();
  });
  if (roster.draw) {
    roster.draw(container.querySelector<HTMLElement>('.roster-page')!, dealt, look, order?.id ?? '');
    return;
  }
  const toCard = roster.toCard;
  if (!toCard) return;
  const grid = document.getElementById('grid')!;
  const end = document.getElementById('grid-end')!;
  const cta = roster.cta ?? '';
  let shown = 0;
  const append = (): void => {
    const batch = document.createElement('template');
    batch.innerHTML = dealt.slice(shown, shown += BATCH).map(item => buildCard(toCard(item, look), cta)).join('');
    mountCardSpin(batch.content);
    grid.append(batch.content);
  };
  append();
  if (shown >= items.length) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    append();
    // Re-observing reports the marker's position afresh, so a tall screen keeps filling
    // until the marker is out of range, rather than waiting for a scroll that won't come.
    observer.unobserve(end);
    if (shown < items.length) observer.observe(end);
  }, { rootMargin: '1500px' });
  observer.observe(end);
  more = observer;
}

// ── Search and filters ──
// The topbar's search box and the panel under it, which are the Arknights and Endfield
// grids' too: whichever page mounted last has them, and every handler below is assigned,
// not added, so that it is the only one listening (views/grid.ts has the reasoning behind
// each rule, and views/endfield.ts the same handling for that game's own groups).

function picksOf(state: RosterState, key: string): Set<string> {
  return state.picks[key] ??= new Set();
}

// What the search and the picks leave of the roster, in its own order. Within a group any
// one pick will do; across groups an item has to pass every group that has a pick.
function matching<T>(roster: Roster<T>): T[] {
  const { state, text, filters } = roster.find!;
  const q = state.query.toLowerCase().trim();
  return roster.items.filter(item =>
    text(item).toLowerCase().includes(q)
    && filters.every((f) => {
      const picked = picksOf(state, f.key);
      if (!picked.size) return true;
      const has = f.of(item);
      return Array.isArray(has) ? has.some(v => picked.has(v)) : picked.has(has);
    }));
}

// One group's buttons. A pick is under data-group and data-value, as Endfield's are and
// for its reason: the Arknights panel's buttons carry data-kind, and neither page's handler
// may take the other's for its own in the half second the panel takes to hide.
function groupHtml<T>(f: RosterFilter<T>, state: RosterState): string {
  const picked = picksOf(state, f.key);
  const button = (value: string): string => {
    const on = picked.has(value);
    const attrs = `data-group="${escHtml(f.key)}" data-value="${escHtml(value)}" aria-pressed="${on}"`;
    const said = escHtml(f.text?.(value) ?? value);
    if (f.look === 'tiles') return `<button class="class-btn${on ? ' on' : ''}" ${attrs}><span>${said}</span></button>`;
    if (f.look === 'ranks') return `<button class="rarity-btn r${f.tier?.(value) ?? 1}${on ? ' on' : ''}" ${attrs}>${said}</button>`;
    if (f.look === 'badges') {
      const icon = f.icon?.(value);
      return `<button class="badge-btn${on ? ' on' : ''}" ${attrs}>${icon ? `<img src="${escHtml(icon)}" alt="">` : ''}<span>${said}</span></button>`;
    }
    return `<button class="chip${on ? ' active' : ''}" ${attrs}>${said}</button>`;
  };
  const buttons = f.values.map(button).join('');
  let row = `<div class="collab-row">${buttons}</div>`;
  if (f.sets) {
    // A row to a kind, its name before it.
    row = `<div class="filter-sets">${f.sets.map(set => `
      <div class="filter-set">
        <span class="filter-set-label">${escHtml(set.label)}</span>
        <div class="collab-row">${set.values.map(button).join('')}</div>
      </div>`).join('')}</div>`;
  } else if (f.look === 'tiles' || f.look === 'ranks') {
    row = `<div class="${f.look === 'ranks' ? 'rarity-row' : 'class-row'}"
                style="grid-template-columns: repeat(${f.across ?? f.values.length}, 1fr)">${buttons}</div>`;
  }
  if (!f.folded) {
    // A group of badges is a row of a table: its name in a cell before its choices.
    return `<div class="filter-group${f.look === 'badges' ? ' filter-row' : ''}"><div class="filter-label">${escHtml(f.label)}</div>${row}</div>`;
  }
  // Shut, the label still says how many are picked inside.
  const open = state.unfolded.has(f.key);
  return `
    <button class="filter-disclosure${open ? ' open' : ''}" data-fold="${escHtml(f.key)}" aria-expanded="${open}">
      ${escHtml(f.label)}${picked.size ? ` · ${picked.size}` : ''}
      <svg class="disclosure-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5 8 10.5l4-4"></path></svg>
    </button>
    <div class="filter-advanced"${open ? '' : ' hidden'}>${row}</div>
  `;
}

function wireFinder<T>(container: HTMLElement, roster: Roster<T>): void {
  const { state, filters } = roster.find!;
  const search  = document.getElementById('search') as HTMLInputElement;
  const clear   = document.getElementById('search-clear') as HTMLButtonElement;
  const actions = document.querySelector<HTMLElement>('.topbar-actions')!;
  const wrap    = document.querySelector<HTMLElement>('.search-wrap')!;
  const toggle  = document.getElementById('more-toggle')!;
  const panel   = document.getElementById('more-filters')!;
  wrap.style.display = '';
  actions.style.display = '';
  watchFilterTab(actions, wrap);
  search.placeholder = roster.prompt ?? `Search ${roster.noun}…`;
  search.value = state.query;
  clear.disabled = !state.query;

  const render = (): void => deal(container, roster, matching(roster));

  // The Filters button's label and lit state, the open panel's class on the cluster,
  // whether Clear has anything to clear, and the panel itself, rebuilt.
  const refreshChrome = (): void => {
    const n = filters.reduce((sum, f) => sum + picksOf(state, f.key).size, 0);
    document.getElementById('more-label')!.textContent = n ? `Filters · ${n}` : 'Filters';
    toggle.classList.toggle('active', state.open || n > 0);
    toggle.setAttribute('aria-expanded', String(state.open));
    actions.classList.toggle('filters-open', state.open);
    (document.getElementById('clear-filters') as HTMLButtonElement).disabled = !n;

    panel.hidden = !state.open;
    if (!state.open) return;
    // The rebuild takes the button just pressed with it, and the keyboard's focus with the
    // button: note which it was and put the focus on its replacement.
    const focused = document.activeElement as HTMLElement | null;
    const refocus = focused && panel.contains(focused) ? focusSelector(focused) : null;
    panel.innerHTML = filters.map(f => groupHtml(f, state)).join('');
    if (refocus) panel.querySelector<HTMLElement>(refocus)?.focus();
  };
  // The cards are rebuilt only by what changes which items match; opening or closing the
  // panel, or a group in it, leaves them alone.
  const refresh = (): void => { refreshChrome(); render(); };

  const syncQuery = (): void => { state.query = search.value; clear.disabled = !state.query; render(); };
  search.oninput = syncQuery;
  clear.onclick = () => { search.value = ''; syncQuery(); search.focus(); };

  actions.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('#more-toggle, #clear-filters, #close-filters');
    if (!el) return;
    if (el.id === 'clear-filters') {
      for (const f of filters) picksOf(state, f.key).clear();
      refresh();
    } else {
      // The close button only closes.
      state.open = el === toggle && !state.open;
      refreshChrome();
    }
    // Clear has just disabled itself and the close button has folded away, and neither can
    // hold the focus then, so it goes to the toggle.
    if (el !== toggle) toggle.focus();
  };

  panel.onclick = (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-group], button[data-fold]');
    if (!el) return;
    const fold = el.dataset.fold;
    if (fold) {
      if (!state.unfolded.delete(fold)) state.unfolded.add(fold);
      refreshChrome();
      return;
    }
    // A button the panel still holds from another page names a group this one has not.
    if (!filters.some(f => f.key === el.dataset.group)) return;
    const picked = picksOf(state, el.dataset.group!);
    const value = el.dataset.value!;
    if (!picked.delete(value)) picked.add(value);
    refresh();
  };

  // Shut by a press anywhere outside the cluster: the search box is the panel's head, and
  // typing a name while picking filters is one job.
  document.onpointerdown = (ev) => {
    if (!state.open || panel.hidden) return;
    if ((ev.target as Element).closest('.topbar-actions')) return;
    state.open = false;
    refreshChrome();
  };

  // Escape, while the panel is on screen. Never from the search box, where Escape is the
  // browser's own clear. The focus goes back to the toggle only if it was in the panel.
  document.onkeydown = (ev) => {
    if (ev.key !== 'Escape' || panel.hidden) return;
    const target = ev.target as HTMLElement;
    if (target.id === 'search') return;
    const fromPanel = panel.contains(target);
    state.open = false;
    refreshChrome();
    if (fromPanel) toggle.focus();
  };

  refresh();
}

/**
 * Shows a roster: the count in the topbar's pill, then the cards. With `find`, under the
 * topbar's search box and filter panel; without, with both put away.
 */
export function mountRoster<T>(container: HTMLElement, roster: Roster<T>): void {
  if (roster.find) {
    wireFinder(container, roster);
    return;
  }
  // The search box and its filters are other pages', as on a dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  deal(container, roster, roster.items);
}
