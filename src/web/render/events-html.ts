// The Global server's schedule: its events and headhunting pools — running, announced, and
// predicted from what CN has already run — as two lists and a month calendar. Modelled on
// Arkpedia's Schedule page (arkpedia.net/schedule), which draws on the same wiki tables.
//
// Everything comes from the bundled events.json, so this makes no data requests. Where
// an entry falls (live, upcoming, over) is decided here, by the clock it is given: the page is
// read for up to a week after the build that baked it. No DOM and no window: the view and the
// pages built at build time (site/) draw from this. What the reader's clock decides (a
// countdown, a date in their time zone) is marked with data-* attributes, which fresh.ts sets
// again in the browser, from events-clock.ts.
import { eventBannerUrl } from '../../shared/api/hella-api';
import { getEvents, getPools, lagDays } from '../event-index';
import type { GameEvent, GamePool } from '../event-index';
import { crumbsHtml, escHtml, rarityNum } from '../format';
import { getOperators } from '../operator-index';
import type { EventsTab } from '../router';
import { DAY_MS, lastsUntil, whenText, yourTimeTip } from './events-clock';

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
const monthTitle = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });

const rangeIn = (timeZone: string, start: number, end: number): string =>
  `${dayIn(timeZone, false).format(start)} – ${dayIn(timeZone, true).format(end)}`;

// The dates' tooltip: the reader's own time, or the CN run a prediction came from.
function datesTip(item: GameEvent | GamePool): string {
  return item.predicted && item.cnStart != null && item.cnEnd != null
    ? `Not announced. CN ran it ${rangeIn(CN_TZ, item.cnStart, item.cnEnd)}, and Global has been following about ${lagDays()} days behind.`
    : yourTimeTip(item.start, item.end);
}

// The reader's own time follows their clock, so fresh.ts is given the two instants to set it
// from; the CN run is the same for everyone.
const datesTipAttrs = (item: GameEvent | GamePool): string =>
  item.predicted && item.cnStart != null && item.cnEnd != null
    ? ''
    : ` data-ev-tip-start="${item.start}" data-ev-tip-end="${item.end}"`;

// A countdown line says what it is worked out from, for fresh.ts: the numbers whenText takes,
// and whether the date is a prediction.
const whenAttrs = (item: GameEvent | GamePool): string =>
  ` data-ev-start="${item.start}" data-ev-end="${item.end}" data-ev-until="${lastsUntil(item)}"${item.predicted ? ' data-ev-predicted' : ''}`;

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

// Open to the public right now: announced, started, and its stages (or the pool) not yet shut.
const isRunning = (item: GameEvent | GamePool, now: number): boolean =>
  !item.predicted && item.start <= now && item.end > now;

function cardHtml(item: GameEvent | GamePool, now: number): string {
  const tags = 'kind' in item ? [POOL_LABEL[item.kind] ?? 'Headhunting'] : eventTags(item);
  const running = isRunning(item, now);
  return `
    <article class="ev-card${running ? ' ev-live' : ''}">
      <div class="ev-banner">
        ${item.banner ? `<img src="${eventBannerUrl(item.banner)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </div>
      <div class="ev-body">
        <div class="ev-tags">${tags.map(t => `<span class="ev-tag">${escHtml(t)}</span>`).join('')}</div>
        <h3 class="entry-name">${escHtml(item.name)}</h3>
        <p class="ev-dates" tabindex="0" data-tip="${escHtml(datesTip(item))}"${datesTipAttrs(item)}>${item.predicted ? 'Predicted: ' : ''}${rangeIn(GLOBAL_TZ, item.start, item.end)}</p>
        <p class="ev-when"${whenAttrs(item)}>${whenText(item, now)}</p>
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

/**
 * A list's three sections at one moment: what is on now, what Global has announced, what is
 * only predicted.
 */
export function sectionsOf(items: (GameEvent | GamePool)[], now: number): { title: string; items: (GameEvent | GamePool)[] }[] {
  const open = items.filter(item => lastsUntil(item) > now);
  const announced = open.filter(item => !item.predicted);
  return [
    { title: 'Live now', items: announced.filter(item => item.start <= now) },
    { title: 'Upcoming', items: announced.filter(item => item.start > now) },
    { title: 'Predicted', items: open.filter(item => item.predicted) },
  ];
}

/**
 * What a rendered list would have to be rebuilt for, rather than have its countdowns
 * rewritten in place: something moving between sections, or its stages closing.
 */
export const shapeOf = (items: (GameEvent | GamePool)[], now: number): string =>
  [...sectionsOf(items, now).map(s => s.items.length), items.filter(item => isRunning(item, now)).length].join();

function listHtml(items: (GameEvent | GamePool)[], now: number): string {
  const sections = sectionsOf(items, now);
  if (!sections.some(s => s.items.length)) return '<div class="state-msg"><div class="label">No schedule</div>This build has no data for this list.</div>';
  return `
    <p class="events-note">
      The Global server's schedule, in server time (UTC-7). A predicted date is the CN run
      moved about ${lagDays()} days later, the gap Global has been keeping; it is an estimate
      until the thing is announced.
    </p>
    ${sections.map(s => sectionHtml(s.title, s.items, now)).join('')}
  `;
}

// ── Calendar ──
// A month of the server's own days. A day is numbered by its date at UTC midnight over a
// day's length, so day arithmetic is integer arithmetic; `serverDay` puts an instant on the
// server's date (UTC-7), which is where an event's bar begins and ends.
const serverDay = (ms: number): number => Math.floor((ms - 7 * 3_600_000) / DAY_MS);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * What the calendar keeps from one visit to the next, in the view: which month it shows, as
 * months since year 0 (unset until first opened, when it becomes the server's current
 * month), and whether the pools are on it.
 */
export interface CalendarView { month: number | undefined; pools: boolean }

const monthOf = (day: number): number => {
  const date = new Date(day * DAY_MS);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

interface Bar { label: string; from: number; to: number; cls: string; tip: string }

function barsFor(now: number, view: CalendarView): Bar[] {
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
    ...(view.pools ? getPools().map(pool => bar(pool, 'pool')) : []),
  ].sort((a, b) => a.from - b.from || b.to - a.to);
}

// The months there is anything to show for: from the oldest bar to the newest, and the one
// shown among them.
function monthSpan(now: number, view: CalendarView, bars: Bar[]): { first: number; last: number; month: number } {
  const today = serverDay(now);
  const first = Math.min(monthOf(today), ...bars.map(b => monthOf(b.from)));
  const last = Math.max(monthOf(today), ...bars.map(b => monthOf(b.to)));
  return { first, last, month: Math.min(last, Math.max(first, view.month ?? monthOf(today))) };
}

/** The month the calendar shows, which the view keeps so that a step starts from it. */
export const calendarMonth = (now: number, view: CalendarView): number =>
  monthSpan(now, view, barsFor(now, view)).month;

function calendarHtml(now: number, view: CalendarView): string {
  const bars = barsFor(now, view);
  const today = serverDay(now);
  const { first, last, month } = monthSpan(now, view, bars);

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
      <button class="chip chip-action cal-pools${view.pools ? ' active' : ''}" data-cal="pools" aria-pressed="${view.pools}">Headhunting</button>
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

/** What is under the tabs: a list of events or pools, or the calendar, as of `now` (ms). */
export function eventsPanelHtml(tab: EventsTab, now: number, view: CalendarView): string {
  if (tab === 'calendar') return calendarHtml(now, view);
  return listHtml(tab === 'pools' ? getPools() : getEvents(), now);
}

/** The page's body, as of `now` (ms). */
export function eventsPageHtml(tab: EventsTab, now: number, view: CalendarView): string {
  return `
    <div class="events">
      ${crumbsHtml('Events')}
      <nav class="ev-tabs" aria-label="Schedule">
        ${TABS.map(t => `<a class="op-tab${t.id === tab ? ' on' : ''}" href="${t.href}"${t.id === tab ? ' aria-current="page"' : ''}>${t.label}</a>`).join('')}
      </nav>
      <div id="ev-panel">${eventsPanelHtml(tab, now, view)}</div>
    </div>
  `;
}
