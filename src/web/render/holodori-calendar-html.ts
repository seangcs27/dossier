import { escHtml } from '../format';
import { getHolodoriTalent, type HolodoriCharacter } from '../holodori-index';
import { DAY_MS, MONTHS, birthdayIn, daysAway, faceOf, holomemLinkAttrs, ordinal } from './holodori-format';

// hololive Dreams' calendar: a month as a grid of days with the face of whoever has a birthday
// or a debut anniversary on it, laid out as hololive Fan Wiki's monthly calendar post is
// (layout only, in the game's own look), and the small one the topbar's calendar icon drops
// down. No DOM and no window: the clock is an argument, and the views and the topbar draw
// from this.

const talent = getHolodoriTalent();

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// A day's cell holds this many faces, and one fewer than this and a count when there are more.
const MAX_FACES = 4;

// Filled glyphs, which hold at the 12px a small face's corner gives them where a stroke thinned
// out: a cake with three lit candles and its icing for a birthday, a star for a debut
// anniversary. Ours: hololive publishes no icon for either.
const CAKE = '<svg viewBox="0 0 16 16"><circle cx="4.8" cy="3.4" r="1.05"></circle><circle cx="8" cy="3.4" r="1.05"></circle><circle cx="11.2" cy="3.4" r="1.05"></circle><path d="M4.1 5.2h1.4V8H4.1zM7.3 5.2h1.4V8H7.3zM10.5 5.2h1.4V8h-1.4zM2 9.2A1.2 1.2 0 0 1 3.2 8h9.6A1.2 1.2 0 0 1 14 9.2v1.1c-1 0-1 .9-2 .9s-1-.9-2-.9-1 .9-2 .9-1-.9-2-.9-1 .9-2 .9-1-.9-2-.9ZM2 11.6c1 0 1 .9 2 .9s1-.9 2-.9 1 .9 2 .9 1-.9 2-.9 1 .9 2 .9 1-.9 2-.9v2.2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1Z"></path></svg>';
const STAR = '<svg viewBox="0 0 16 16"><path d="M8 1.6 9.9 5.7l4.5.6-3.3 3.1.8 4.4L8 11.7l-3.9 2.1.8-4.4L1.6 6.3l4.5-.6Z"></path></svg>';

/** A birthday, or when `years` is set a debut anniversary, on `day` of a month. */
export interface CalendarEntry {
  day: number;
  c: HolodoriCharacter;
  years?: number;
}

/** Each birthday and debut anniversary in a month (`m` from 0), by the day; a birthday before an anniversary on the same one. */
export function entriesIn(y: number, m: number): CalendarEntry[] {
  const list: CalendarEntry[] = [];
  for (const c of talent) {
    const b = birthdayIn(c, y);
    if (b.getMonth() === m) list.push({ day: b.getDate(), c });
    const [dy, dm, dd] = c.debut.split('-').map(Number);
    if (dm - 1 === m && y > dy) list.push({ day: dd, c, years: y - dy });
  }
  return list.sort((a, b) => a.day - b.day || Number(a.years !== undefined) - Number(b.years !== undefined));
}

// A month's entries under the day each is on, the days in order.
function entriesByDay(y: number, m: number): Map<number, CalendarEntry[]> {
  const byDay = new Map<number, CalendarEntry[]>();
  for (const e of entriesIn(y, m)) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  return byDay;
}

const midnight = (at: number | Date): Date => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// What the entry is, for a tooltip and for a screen reader.
const kindOf = ({ years }: CalendarEntry): string => (years === undefined ? 'birthday' : `${ordinal(years)} debut anniversary`);

// Her round face (faceOf), or the first letter of her name where there is none.
function picHtml(c: HolodoriCharacter): string {
  const { src, game } = faceOf(c);
  return `<span class="dcal-pic${game ? ' icon' : ''}">${src
    ? `<img src="${escHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
    : `<b aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</b>`}</span>`;
}

const accent = (c: HolodoriCharacter): string => escHtml(c.colors[0] ?? '#18c9f0');

// One face with the cake or the star on its corner; a link to her unless `linked` is off.
function faceHtml(e: CalendarEntry, m: number, linked: boolean): string {
  const { c, day, years } = e;
  const cls = `dcal-face ${years === undefined ? 'birthday' : 'anniversary'}`;
  const body = `${picHtml(c)}<i class="dcal-mark" aria-hidden="true">${years === undefined ? CAKE : STAR}</i>`;
  if (!linked) return `<span class="${cls}" style="--a: ${accent(c)}">${body}</span>`;
  return `<a class="${cls}" ${holomemLinkAttrs(c)} data-tip="${escHtml(`${c.shortName} · ${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}`)}"
      aria-label="${escHtml(`${c.name}, ${kindOf(e)}, ${day} ${MONTHS[m]}`)}" style="--a: ${accent(c)}">${body}</a>`;
}

// The count of those a day's square has no room for: pointed at, or focused, it opens a list of
// them, a face and a name to each, so that none is left to the month's list under or beside the grid.
function moreHtml(rest: CalendarEntry[], m: number, linked: boolean, slot: boolean): string {
  const rows = rest.map((e) => {
    const { c, years } = e;
    const body = `${picHtml(c)}<span>${escHtml(c.shortName)}<small>${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}</small></span>`;
    return linked
      ? `<a class="dcal-rest-row" ${holomemLinkAttrs(c)} style="--a: ${accent(c)}">${body}</a>`
      : `<span class="dcal-rest-row" style="--a: ${accent(c)}">${body}</span>`;
  }).join('');
  const names = rest.map(({ c }) => c.shortName).join(', ');
  return `<span class="dcal-more${slot ? ' slot' : ''}" tabindex="0" aria-label="${escHtml(`${rest.length} more: ${names}`)}">+${rest.length}<span class="dcal-rest"><span class="dcal-rest-box">${rows}</span></span></span>`;
}

/**
 * A month as seven columns from Sunday. The page's draws every face as a link; the menu's draws
 * the first of a day's and a count of the rest, which it has no room for. `now` (ms) marks today.
 */
export function monthGridHtml(y: number, m: number, now: number, variant: 'page' | 'menu'): string {
  const today = midnight(now);
  const thisMonth = today.getFullYear() === y && today.getMonth() === m;
  const byDay = entriesByDay(y, m);
  const menu = variant === 'menu';

  const head = DOW.map((d, i) => `<li class="dcal-dow${thisMonth && i === today.getDay() ? ' on' : ''}" aria-hidden="true">${menu ? d[0] : d}</li>`);
  const blanks = Array.from({ length: new Date(y, m, 1).getDay() }, () => '<li class="dcal-day blank" aria-hidden="true"></li>');
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
    const day = i + 1;
    const list = byDay.get(day) ?? [];
    const cap = menu ? 1 : list.length > MAX_FACES ? MAX_FACES - 1 : MAX_FACES;
    const shown = list.slice(0, cap);
    const more = list.length - shown.length;
    // The page's count takes the face's place in the last slot of the 2x2; the menu's cell has no room, so its count sits in the corner.
    const inSlot = !menu && more > 0;
    const isToday = thisMonth && day === today.getDate();
    const state = isToday ? ' today' : thisMonth && day < today.getDate() ? ' past' : '';
    return `
      <li class="dcal-day${state}${list.length ? ' has' : ''}"${isToday ? ' aria-current="date"' : ''}>
        <span class="dcal-num">${day}${isToday && !menu ? '<b>Today</b>' : ''}</span>
        ${shown.length ? `<span class="dcal-faces n${shown.length + (inSlot ? 1 : 0)}">${shown.map(e => faceHtml(e, m, !menu)).join('')}${inSlot ? moreHtml(list.slice(shown.length), m, true, true) : ''}</span>` : ''}
        ${more && !inSlot ? moreHtml(list.slice(shown.length), m, !menu, false) : ''}
      </li>`;
  });
  return `<ol class="dcal-grid ${variant}" aria-label="${MONTHS[m]} ${y}">${[...head, ...blanks, ...days].join('')}</ol>`;
}

// How far off a day is said for, either side of today; further than this it is only a number.
const NEAR_DAYS = 60;

// 'today', 'in 2 days', 'yesterday' or '4 days ago'.
const awayText = (days: number): string => (days >= 0 ? daysAway(days) : days === -1 ? 'yesterday' : `${-days} days ago`);

/**
 * The month's dates as an agenda: a block to each day with its weekday, its number and how far
 * off it is, and beside it whoever's day it is, a face, a name and what the day is to each, so
 * that none rests on a picture alone. In this month a line marks where today falls among them.
 */
export function monthListHtml(y: number, m: number, now: number): string {
  const today = midnight(now);
  const days = [...entriesByDay(y, m)].map(([day, list]) => {
    const date = new Date(y, m, day);
    const away = Math.round((date.getTime() - today.getTime()) / DAY_MS);
    const rows = list.map((e) => {
      const { c, years } = e;
      return `
        <li><a class="dcal-agenda-row" ${holomemLinkAttrs(c)}>
          ${faceHtml(e, m, false)}
          <span class="dcal-agenda-name"><b>${escHtml(c.shortName)}</b><small>${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}</small></span>
        </a></li>`;
    }).join('');
    return {
      away,
      html: `
      <li class="dcal-agenda-day${away < 0 ? ' past' : away === 0 ? ' on' : ''}">
        <p class="dcal-agenda-date"><small>${DOW[date.getDay()]}</small><b>${day}</b>${Math.abs(away) <= NEAR_DAYS ? `<em>${awayText(away)}</em>` : ''}</p>
        <ul class="dcal-agenda-who">${rows}</ul>
      </li>`,
    };
  });
  if (!days.length) return '<p class="month-none">Nobody this month</p>';
  if (today.getFullYear() === y && today.getMonth() === m && !days.some(d => d.away === 0)) {
    const next = days.findIndex(d => d.away > 0);
    days.splice(next < 0 ? days.length : next, 0, {
      away: 0,
      html: `<li class="dcal-agenda-now"><span>Today · ${DOW[today.getDay()]} ${today.getDate()}</span></li>`,
    });
  }
  return `<ol class="dcal-agenda">${days.map(d => d.html).join('')}</ol>`;
}

/** The next `count` dates from today on, today's first, looking at most a year ahead. */
export function upcoming(now: number, count: number): { date: Date; entry: CalendarEntry }[] {
  const today = midnight(now);
  const out: { date: Date; entry: CalendarEntry }[] = [];
  for (let k = 0; k <= 12 && out.length < count; k++) {
    const first = new Date(today.getFullYear(), today.getMonth() + k, 1);
    for (const entry of entriesIn(first.getFullYear(), first.getMonth())) {
      const date = new Date(first.getFullYear(), first.getMonth(), entry.day);
      if (date >= today && out.length < count) out.push({ date, entry });
    }
  }
  return out;
}

const CHEVRON_PATH = { left: 'M10 3 5 8l5 5', right: 'M6 3l5 5-5 5', down: 'M3 6l5 5 5-5' };
const CHEVRON = (turn: keyof typeof CHEVRON_PATH): string =>
  `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${CHEVRON_PATH[turn]}"></path></svg>`;

/**
 * The month picker over a grid: back, the month and year as one button, forward, and on the
 * page a button back to this month. The button opens a panel of our own (no browser drop-down):
 * the year with a step either way, and the twelve months, the one shown filled and this month
 * dotted. Its controls carry `data-step` (months to move by: '-1', '1', a year as '-12' and
 * '12', or 'today') or `data-month`, which `monthMoved` reads; calendar-picker.ts works them.
 */
export function monthPickerHtml(y: number, m: number, now: number, variant: 'page' | 'menu'): string {
  const at = new Date(now);
  const current = at.getFullYear() === y && at.getMonth() === m;
  const months = MONTHS.map((name, i) => `
          <button type="button" class="dcal-pop-month${at.getFullYear() === y && at.getMonth() === i ? ' now' : ''}" data-month="${i}"
                  aria-pressed="${i === m}" aria-label="${name} ${y}">${name.slice(0, 3)}</button>`).join('');
  return `
    <div class="dcal-picker ${variant}">
      <button type="button" class="dcal-step" data-step="-1" aria-label="Previous month">${CHEVRON('left')}</button>
      <div class="dcal-drop">
        <button type="button" class="dcal-select" aria-haspopup="dialog" aria-expanded="false">${MONTHS[m]} <span>${y}</span>${CHEVRON('down')}</button>
        <div class="dcal-pop" role="dialog" aria-label="Choose a month" hidden>
          <div class="dcal-pop-year">
            <button type="button" class="dcal-step" data-step="-12" aria-label="Previous year">${CHEVRON('left')}</button>
            <b>${y}</b>
            <button type="button" class="dcal-step" data-step="12" aria-label="Next year">${CHEVRON('right')}</button>
          </div>
          <div class="dcal-pop-months">${months}</div>
        </div>
      </div>
      <button type="button" class="dcal-step" data-step="1" aria-label="Next month">${CHEVRON('right')}</button>
      ${variant === 'page' ? `<button type="button" class="dcal-today" data-step="today"${current ? ' disabled' : ''}>Today</button>` : ''}
    </div>`;
}

/** The month a press on a picker control leads to: what its `data-step` or its `data-month` says. */
export function monthMoved(
  y: number, m: number, now: number, control: { step?: string; month?: string },
): { y: number; m: number } {
  if (control.step === 'today') return { y: new Date(now).getFullYear(), m: new Date(now).getMonth() };
  if (control.step) {
    const to = new Date(y, m + Number(control.step), 1);
    return { y: to.getFullYear(), m: to.getMonth() };
  }
  return { y, m: Number(control.month) };
}

/**
 * What the topbar's calendar icon drops down: a month picker, the month (this one, or the one
 * picked, `y` and `m`) small, who is next from today, and a line on how to open the page.
 */
export function calendarMenuHtml(now: number, y = new Date(now).getFullYear(), m = new Date(now).getMonth()): string {
  const today = midnight(now);
  const next = upcoming(now, 4).map(({ date, entry }) => {
    const { c, years } = entry;
    const days = Math.round((date.getTime() - today.getTime()) / DAY_MS);
    return `
      <li><a class="dcal-next-row" ${holomemLinkAttrs(c)} style="--a: ${accent(c)}">
        ${picHtml(c)}
        <span class="dcal-next-name">${escHtml(c.shortName)}<small>${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}</small></span>
        <span class="dcal-next-when">${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}<small>${daysAway(days)}</small></span>
      </a></li>`;
  });
  return `
    ${monthPickerHtml(y, m, now, 'menu')}
    ${monthGridHtml(y, m, now, 'menu')}
    ${next.length ? `<p class="dcal-menu-label">Coming up</p><ul class="dcal-next">${next.join('')}</ul>` : ''}
    <p class="dcal-menu-hint">Click the calendar icon to open the full calendar</p>`;
}

/** The legend: what the cake and the star on a face stand for. */
export const CALENDAR_LEGEND = `<p class="legend dcal-legend"><i class="dcal-key birthday">${CAKE}</i>Birthday <i class="dcal-key anniversary">${STAR}</i>Debut anniversary</p>`;
