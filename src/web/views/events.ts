// The Global server's schedule: its events and headhunting pools — running, announced, and
// predicted from what CN has already run — as two lists and a month calendar. Modelled on
// Arkpedia's Schedule page (arkpedia.net/schedule), which draws on the same wiki tables.
//
// Everything comes from the bundled events.json, so this view makes no data requests. Where
// an entry falls (live, upcoming, over) is decided here, by the reader's clock, not at build
// time: the page is read for up to a week after the build that baked it.
import { eventBannerUrl } from '../../shared/api/hella-api';
import { getEvents, getPools, lagDays } from '../event-index';
import type { GameEvent, GamePool } from '../event-index';
import { escHtml, rarityNum } from '../format';
import { getOperators } from '../operator-index';
import type { EventsTab } from '../router';

const DAY_MS = 86_400_000;

// The wiki's eventType, as the game's English client names the kind. The modes whose own
// name already says what they are (Contingency Contract, Trials for Navigator, Vector
// Breakthrough, Duel Channel, Icebreaker Games, Stronghold Protocol) share one label, and
// anything the wiki leaves untyped is plainly an event.
const TYPE_LABEL: Record<string, string> = {
  sidestory: 'Side Story',
  storycol: 'Vignette',
  intermezzo: 'Intermezzo',
  episode: 'Main Theme',
  crossover: 'Crossover',
  anniversary: 'Anniversary',
  login: 'Login Event',
  cc: 'Game Mode',
  tn: 'Game Mode',
  vb: 'Game Mode',
  dc: 'Game Mode',
  ig: 'Game Mode',
  sp: 'Game Mode',
};

// The wiki's bannerType. The three limited kinds are the pools whose headline operators
// leave when the pool does.
const POOL_LABEL: Record<string, string> = {
  standard: 'Standard',
  kernel: 'Kernel',
  'kernel locating': 'Kernel Locating',
  'kernel linkup': 'Kernel',
  special: 'New Operators',
  rerun: 'Rerun',
  jo: 'Joint Operation',
  orient: 'Orienteering',
  crossover: 'Crossover',
  'crossover rerun': 'Crossover Rerun',
  celebration: 'Limited',
  festival: 'Limited',
  carnival: 'Limited',
  'limited rerun': 'Limited Rerun',
  linkup: 'Link-up',
  tftw: 'The Front That Was',
};

// Each server's own clock, neither with daylight saving. The zone names carry the sign the
// other way round: Etc/GMT+7 is UTC-7.
const dayIn = (timeZone: string, year: boolean): Intl.DateTimeFormat => new Intl.DateTimeFormat('en-US', {
  timeZone, month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}),
});
const GLOBAL_TZ = 'Etc/GMT+7';
const CN_TZ = 'Etc/GMT-8';
const yourTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const monthTitle = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });

const rangeIn = (timeZone: string, start: number, end: number): string =>
  `${dayIn(timeZone, false).format(start)} – ${dayIn(timeZone, true).format(end)}`;

function spanText(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  return days ? `${days}d ${hours}h` : `${hours}h ${minutes % 60}m`;
}

// When the thing is over for the lists: an event stays until its shop shuts.
const lastsUntil = (item: GameEvent | GamePool): number => ('shopEnd' in item && item.shopEnd) || item.end;

function whenText(item: GameEvent | GamePool, now: number): string {
  if (item.predicted) {
    // A predicted start that has passed with nothing announced: the estimate was early.
    return item.start <= now ? 'Expected around now' : `In about ${Math.round((item.start - now) / DAY_MS)} days`;
  }
  if (item.start > now) return `Starts in ${spanText(item.start - now)}`;
  if (item.end > now) return `Ends in ${spanText(item.end - now)}`;
  return `Stages closed · Shop closes in ${spanText(lastsUntil(item) - now)}`;
}

// The dates' tooltip: the reader's own time, or the CN run a prediction came from.
function datesTip(item: GameEvent | GamePool): string {
  return item.predicted && item.cnStart != null && item.cnEnd != null
    ? `Not announced. CN ran it ${rangeIn(CN_TZ, item.cnStart, item.cnEnd)}, and Global has been following about ${lagDays()} days behind.`
    : `Your time: ${yourTime.format(item.start)} – ${yourTime.format(item.end)}`;
}

function eventTags(ev: GameEvent): string[] {
  return [
    TYPE_LABEL[ev.type] ?? 'Event',
    ev.rerun ? 'Rerun' : '',
    // The wiki flags a crossover two ways, as a type of its own and as a side story that
    // is one; only the second needs saying twice.
    ev.crossover && ev.type !== 'crossover' ? 'Crossover' : '',
    ev.group,
  ].filter(Boolean);
}

const operatorById = new Map(getOperators().map(op => [op.id, op]));

// A pool's featured operators, highest rarity first, each a link to its dossier. One the
// build could not match to the index is a name with nowhere to go.
function operatorsHtml(pool: GamePool): string {
  if (!pool.operators.length) return '';
  const known = pool.operators.map(key => ({ key, op: operatorById.get(key) }))
    .sort((a, b) => (b.op ? rarityNum(b.op.rarity) : 0) - (a.op ? rarityNum(a.op.rarity) : 0));
  return `
    <div class="pool-ops">
      ${known.map(({ key, op }) => (op
        ? `<a class="pool-op r${rarityNum(op.rarity)}" href="#/op/${encodeURIComponent(op.id)}">${escHtml(op.name)}</a>`
        : `<span class="pool-op">${escHtml(key)}</span>`)).join('')}
    </div>
  `;
}

function cardHtml(item: GameEvent | GamePool, now: number): string {
  const tags = 'kind' in item ? [POOL_LABEL[item.kind] ?? 'Headhunting'] : eventTags(item);
  const running = !item.predicted && item.start <= now && item.end > now;
  return `
    <article class="ev-card${running ? ' ev-live' : ''}">
      <div class="ev-banner">
        ${item.banner ? `<img src="${eventBannerUrl(item.banner)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </div>
      <div class="ev-body">
        <div class="ev-tags">${tags.map(t => `<span class="ev-tag">${escHtml(t)}</span>`).join('')}</div>
        <h3 class="entry-name">${escHtml(item.name)}</h3>
        <p class="ev-dates" tabindex="0" data-tip="${escHtml(datesTip(item))}">${item.predicted ? 'Predicted: ' : ''}${rangeIn(GLOBAL_TZ, item.start, item.end)}</p>
        <p class="ev-when">${whenText(item, now)}</p>
        ${'kind' in item ? operatorsHtml(item) : ''}
      </div>
    </article>
  `;
}

function sectionHtml(title: string, items: (GameEvent | GamePool)[], now: number): string {
  if (!items.length) return '';
  return `
    <section class="ev-section">
      <h2 class="section-label">${title} <span class="ev-total">${items.length}</span></h2>
      <div class="ev-grid">${items.map(item => cardHtml(item, now)).join('')}</div>
    </section>
  `;
}

// Either list: what is on now, what Global has announced, what is only predicted.
function listHtml(items: (GameEvent | GamePool)[], now: number): string {
  const open = items.filter(item => lastsUntil(item) > now);
  if (!open.length) return '<div class="state-msg"><div class="label">No schedule</div>This build has no data for this list.</div>';
  const announced = open.filter(item => !item.predicted);
  return `
    <p class="events-note">
      The Global server's schedule, in server time (UTC-7). A predicted date is the CN run
      moved about ${lagDays()} days later, the gap Global has been keeping; it is an estimate
      until the thing is announced.
    </p>
    ${sectionHtml('Live now', announced.filter(item => item.start <= now), now)}
    ${sectionHtml('Upcoming', announced.filter(item => item.start > now), now)}
    ${sectionHtml('Predicted', open.filter(item => item.predicted), now)}
  `;
}

// ── Calendar ──
// A month of the server's own days. A day is numbered by its date at UTC midnight over a
// day's length, so day arithmetic is integer arithmetic; `serverDay` puts an instant on the
// server's date (UTC-7), which is where an event's bar begins and ends.
const serverDay = (ms: number): number => Math.floor((ms - 7 * 3_600_000) / DAY_MS);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Which month the calendar shows, as months since year 0; unset until first opened, when it
// becomes the server's current month. Kept across visits, like the grid's filters.
let calMonth: number | undefined;
let calPools = false;

const monthOf = (day: number): number => {
  const date = new Date(day * DAY_MS);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

interface Bar { label: string; from: number; to: number; cls: string; tip: string }

function barsFor(now: number): Bar[] {
  const today = serverDay(now);
  const bar = (item: GameEvent | GamePool, cls: string): Bar => {
    const from = serverDay(item.start);
    const to = serverDay(item.end);
    return {
      label: item.name, from, to,
      cls: `${cls}${item.predicted ? ' predicted' : ''}${!item.predicted && from <= today && today <= to ? ' live' : ''}`,
      tip: `${item.name}: ${item.predicted ? 'predicted ' : ''}${rangeIn(GLOBAL_TZ, item.start, item.end)}`,
    };
  };
  return [
    ...getEvents().map(ev => bar(ev, 'event')),
    ...(calPools ? getPools().map(pool => bar(pool, 'pool')) : []),
  ].sort((a, b) => a.from - b.from || b.to - a.to);
}

function calendarHtml(now: number): string {
  const bars = barsFor(now);
  const today = serverDay(now);
  // The months there is anything to show for: from the oldest bar to the newest.
  const first = Math.min(monthOf(today), ...bars.map(b => monthOf(b.from)));
  const last = Math.max(monthOf(today), ...bars.map(b => monthOf(b.to)));
  const month = Math.min(last, Math.max(first, calMonth ?? monthOf(today)));
  calMonth = month;

  const monthStart = Date.UTC(Math.floor(month / 12), month % 12, 1) / DAY_MS;
  const monthEnd = Date.UTC(Math.floor(month / 12), month % 12 + 1, 1) / DAY_MS - 1;
  // Whole weeks, Sunday first, from the week the month opens in to the week it closes in.
  const gridStart = monthStart - new Date(monthStart * DAY_MS).getUTCDay();
  const weeks = Math.ceil((monthEnd - gridStart + 1) / 7);

  const weeksHtml = Array.from({ length: weeks }, (_, w) => {
    const weekStart = gridStart + w * 7;
    const weekEnd = weekStart + 6;
    // Each bar takes the first lane free on the day it starts, so a long event keeps one
    // lane across the week and the short ones stack under it.
    const laneEnds: number[] = [];
    const placed = bars.filter(b => b.from <= weekEnd && b.to >= weekStart).map(b => {
      const from = Math.max(b.from, weekStart);
      const to = Math.min(b.to, weekEnd);
      let lane = laneEnds.findIndex(end => end < from);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = to;
      return { b, from, to, lane };
    });
    // The day numbers' row and the lanes, and never fewer than four rows: an empty week is
    // still a week.
    const rows = Math.max(laneEnds.length + 1, 4);
    const days = Array.from({ length: 7 }, (_, i) => {
      const day = weekStart + i;
      const out = day < monthStart || day > monthEnd;
      return `<div class="cal-day${out ? ' out' : ''}${day === today ? ' today' : ''}" style="grid-column:${i + 1};grid-row:1 / span ${rows}"><span>${new Date(day * DAY_MS).getUTCDate()}</span></div>`;
    }).join('');
    const barsHtml = placed.map(({ b, from, to, lane }) => `
      <div class="cal-bar ${b.cls}${b.from < from ? ' cut-l' : ''}${b.to > to ? ' cut-r' : ''}" tabindex="0"
           style="grid-column:${from - weekStart + 1} / ${to - weekStart + 2};grid-row:${lane + 2}"
           data-tip="${escHtml(b.tip)}">${escHtml(b.label)}</div>
    `).join('');
    return `<div class="cal-week">${days}${barsHtml}</div>`;
  }).join('');

  return `
    <div class="cal-head">
      <button class="cal-nav" data-cal="prev" aria-label="Previous month"${month <= first ? ' disabled' : ''}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg>
      </button>
      <h2 class="cal-title">${monthTitle.format(monthStart * DAY_MS)}</h2>
      <button class="cal-nav" data-cal="next" aria-label="Next month"${month >= last ? ' disabled' : ''}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"></path></svg>
      </button>
      <button class="chip chip-action" data-cal="today"${month === monthOf(today) ? ' disabled' : ''}>Today</button>
      <button class="chip chip-action cal-pools${calPools ? ' active' : ''}" data-cal="pools" aria-pressed="${calPools}">Headhunting</button>
    </div>
    <div class="cal-grid">
      <div class="cal-weekdays">${WEEKDAYS.map(d => `<span>${d}</span>`).join('')}</div>
      ${weeksHtml}
    </div>
    <p class="events-note">
      Days are the Global server's (UTC-7). A dashed bar is a prediction: the CN run moved
      about ${lagDays()} days later.
    </p>
  `;
}

const TABS: { id: EventsTab; label: string; href: string }[] = [
  { id: 'list', label: 'Events', href: '#/events' },
  { id: 'pools', label: 'Headhunting', href: '#/events/pools' },
  { id: 'calendar', label: 'Calendar', href: '#/events/calendar' },
];

export function mountEvents(container: HTMLElement, tab: EventsTab): void {
  // The grid's controls have no meaning here, the same as on a detail page.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const panelHtml = (): string => {
    const now = Date.now();
    if (tab === 'calendar') return calendarHtml(now);
    return listHtml(tab === 'pools' ? getPools() : getEvents(), now);
  };

  container.innerHTML = `
    <div class="events">
      <nav class="crumbs">
        <a href="#/">Operators</a>
        <span class="crumb-sep">/</span>
        <span class="crumb-current">Events</span>
      </nav>
      <nav class="ev-tabs" aria-label="Schedule">
        ${TABS.map(t => `<a class="op-tab${t.id === tab ? ' on' : ''}" href="${t.href}"${t.id === tab ? ' aria-current="page"' : ''}>${t.label}</a>`).join('')}
      </nav>
      <div id="ev-panel">${panelHtml()}</div>
    </div>
  `;

  // The calendar's own controls. Assigned rather than added: this runs on every visit, and
  // the detail page leaves its handler on the same element.
  container.onclick = (ev) => {
    const control = (ev.target as Element).closest<HTMLButtonElement>('[data-cal]');
    if (!control || calMonth === undefined) return;
    switch (control.dataset.cal) {
      case 'prev':  calMonth -= 1; break;
      case 'next':  calMonth += 1; break;
      case 'today': calMonth = undefined; break;
      case 'pools': calPools = !calPools; break;
    }
    const panel = container.querySelector<HTMLElement>('#ev-panel')!;
    panel.innerHTML = panelHtml();
    // The rebuild detached the button that was pressed; its replacement takes the focus.
    panel.querySelector<HTMLElement>(`[data-cal="${control.dataset.cal}"]:not(:disabled)`)?.focus();
  };

  // The link to here is in the sticky topbar, so it is pressed from anywhere down the grid.
  window.scrollTo(0, 0);
}
