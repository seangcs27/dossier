import { escHtml } from '../format';
import { getHolodoriTalent, type HolodoriCharacter } from '../holodori-index';
import { DAY_MS, MONTHS, birthdayIn, daysAway, holomemLinkAttrs, ordinal } from './holodori-format';

// hololive Dreams' calendar: a month as a grid of days with the face of whoever has a birthday
// or a debut anniversary on it, laid out as hololive Fan Wiki's monthly calendar post is
// (layout only, in the game's own look), and the small one the topbar's calendar icon drops
// down. No DOM and no window: the clock is an argument, and the views and the topbar draw
// from this.

const talent = getHolodoriTalent();

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// A day's cell holds this many faces, and one fewer than this and a count when there are more.
const MAX_FACES = 4;

// Stroke glyphs at 16px, as the section links' are.
const CAKE = '<svg viewBox="0 0 16 16"><path d="M3 8.5h10v5H3zM3 11q1.6 1.2 3.2 0t3.2 0 3.6 0M8 8.5v-2.6M8 3.4v.6"></path></svg>';
const FLAG = '<svg viewBox="0 0 16 16"><path d="M4 14V2.5M4 3h8l-1.8 2.6L12 8.2H4"></path></svg>';

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

const midnight = (at: number | Date): Date => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// What the entry is, for a tooltip and for a screen reader.
const kindOf = ({ years }: CalendarEntry): string => (years === undefined ? 'birthday' : `${ordinal(years)} debut anniversary`);

// Her round icon, or the first letter of her name for talent the game has no picture of.
function picHtml(c: HolodoriCharacter): string {
  const src = c.icon ?? c.art;
  return `<span class="hc-pic${c.icon ? ' icon' : ''}">${src
    ? `<img src="${escHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`
    : `<b aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</b>`}</span>`;
}

const accent = (c: HolodoriCharacter): string => escHtml(c.colors[0] ?? '#18c9f0');

// One face with the cake or the flag on its corner; a link to her unless `linked` is off.
function faceHtml(e: CalendarEntry, m: number, linked: boolean): string {
  const { c, day, years } = e;
  const cls = `hc-face ${years === undefined ? 'birthday' : 'anniversary'}`;
  const body = `${picHtml(c)}<i class="hc-mark" aria-hidden="true">${years === undefined ? CAKE : FLAG}</i>`;
  if (!linked) return `<span class="${cls}" style="--a: ${accent(c)}">${body}</span>`;
  return `<a class="${cls}" ${holomemLinkAttrs(c)} data-tip="${escHtml(`${c.shortName} · ${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}`)}"
      aria-label="${escHtml(`${c.name}, ${kindOf(e)}, ${day} ${MONTHS[m]}`)}" style="--a: ${accent(c)}">${body}</a>`;
}

/**
 * A month as seven columns from Sunday. The page's draws every face as a link; the menu's draws
 * the first of a day's and a count of the rest, which it has no room for. `now` (ms) marks today.
 */
export function monthGridHtml(y: number, m: number, now: number, variant: 'page' | 'menu'): string {
  const today = midnight(now);
  const thisMonth = today.getFullYear() === y && today.getMonth() === m;
  const byDay = new Map<number, CalendarEntry[]>();
  for (const e of entriesIn(y, m)) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  const menu = variant === 'menu';

  const head = DOW.map(d => `<li class="hc-dow" aria-hidden="true">${menu ? d[0] : d}</li>`);
  const blanks = Array.from({ length: new Date(y, m, 1).getDay() }, () => '<li class="hc-day blank" aria-hidden="true"></li>');
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
    const day = i + 1;
    const list = byDay.get(day) ?? [];
    const cap = menu ? 1 : list.length > MAX_FACES ? MAX_FACES - 1 : MAX_FACES;
    const shown = list.slice(0, cap);
    const more = list.length - shown.length;
    const state = thisMonth && day === today.getDate() ? ' today' : thisMonth && day < today.getDate() ? ' past' : '';
    return `
      <li class="hc-day${state}${list.length ? ' has' : ''}">
        <span class="hc-num">${day}</span>
        ${shown.length ? `<span class="hc-faces n${shown.length}">${shown.map(e => faceHtml(e, m, !menu)).join('')}</span>` : ''}
        ${more ? `<em class="hc-more">+${more}</em>` : ''}
      </li>`;
  });
  return `<ol class="hc-grid ${variant}" aria-label="${MONTHS[m]} ${y}">${[...head, ...blanks, ...days].join('')}</ol>`;
}

/** The month's dates as a list, a face and a name to each, so that none rests on a picture alone. */
export function monthListHtml(y: number, m: number, now: number): string {
  const today = midnight(now);
  const thisMonth = today.getFullYear() === y && today.getMonth() === m;
  const list = entriesIn(y, m).map((e) => {
    const { c, day, years } = e;
    const when = thisMonth && day < today.getDate() ? 'past' : thisMonth && day === today.getDate() ? 'on' : '';
    return `
      <li${when ? ` class="${when}"` : ''}><a class="${years === undefined ? 'month-birthday' : 'month-anniversary'}" ${holomemLinkAttrs(c)}
              aria-label="${escHtml(`${c.name}, ${kindOf(e)}, ${day} ${MONTHS[m]}`)}" style="--a: ${accent(c)}">
        <b class="month-date">${day}</b>
        <span class="month-face${c.icon ? ' icon' : ''}">${c.icon ?? c.art ? `<img src="${escHtml((c.icon ?? c.art)!)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : `<b>${escHtml([...c.shortName][0] ?? '?')}</b>`}</span>
        <span class="month-name">${escHtml(c.shortName)}</span>
        ${years === undefined ? '' : `<em class="month-years">${ordinal(years)} anniversary</em>`}
      </a></li>`;
  });
  return list.length ? `<ul class="month-list">${list.join('')}</ul>` : '<p class="month-none">Nobody this month</p>';
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

const CHEVRON = (turn: 'left' | 'right'): string =>
  `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${turn === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}"></path></svg>`;

// The picker offers every year from the first debut to three after the one being shown or this one.
const FIRST_YEAR = Math.min(...talent.map(c => Number(c.debut.slice(0, 4))));
const YEARS_AHEAD = 3;

/**
 * The month picker over a grid, as a date picker has it: back, a drop-down of the months and one
 * of the years, forward, and on the page a button back to this month. Its controls carry
 * `data-step` ('-1', '1', 'today') and `data-pick` ('month', 'year'), which `monthMoved` reads.
 */
export function monthPickerHtml(y: number, m: number, now: number, variant: 'page' | 'menu'): string {
  const at = new Date(now);
  const last = Math.max(y, at.getFullYear()) + YEARS_AHEAD;
  const months = MONTHS.map((name, i) => `<option value="${i}"${i === m ? ' selected' : ''}>${name}</option>`).join('');
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)
    .map(year => `<option value="${year}"${year === y ? ' selected' : ''}>${year}</option>`).join('');
  const current = at.getFullYear() === y && at.getMonth() === m;
  return `
    <div class="hc-picker ${variant}">
      <button type="button" class="hc-step" data-step="-1" aria-label="Previous month">${CHEVRON('left')}</button>
      <select class="hc-select" data-pick="month" aria-label="Month">${months}</select>
      <select class="hc-select" data-pick="year" aria-label="Year">${years}</select>
      <button type="button" class="hc-step" data-step="1" aria-label="Next month">${CHEVRON('right')}</button>
      ${variant === 'page' ? `<button type="button" class="hc-today" data-step="today"${current ? ' disabled' : ''}>Today</button>` : ''}
    </div>`;
}

/** The month a press on a picker control leads to: what its `data-step` or `data-pick` and the value chosen say. */
export function monthMoved(
  y: number, m: number, now: number, control: { step?: string; pick?: string; value?: string },
): { y: number; m: number } {
  if (control.step === 'today') return { y: new Date(now).getFullYear(), m: new Date(now).getMonth() };
  if (control.step) {
    const to = new Date(y, m + Number(control.step), 1);
    return { y: to.getFullYear(), m: to.getMonth() };
  }
  return control.pick === 'year' ? { y: Number(control.value), m } : { y, m: Number(control.value) };
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
      <li><a class="hc-next-row" ${holomemLinkAttrs(c)} style="--a: ${accent(c)}">
        ${picHtml(c)}
        <span class="hc-next-name">${escHtml(c.shortName)}<small>${years === undefined ? 'Birthday' : `${ordinal(years)} anniversary`}</small></span>
        <span class="hc-next-when">${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}<small>${daysAway(days)}</small></span>
      </a></li>`;
  });
  return `
    ${monthPickerHtml(y, m, now, 'menu')}
    ${monthGridHtml(y, m, now, 'menu')}
    ${next.length ? `<p class="hc-menu-label">Coming up</p><ul class="hc-next">${next.join('')}</ul>` : ''}
    <p class="hc-menu-hint">Click the calendar icon to open the full calendar</p>`;
}

/** The legend: what the cake and the flag on a face stand for. */
export const CALENDAR_LEGEND = `<p class="legend hc-legend"><i class="hc-key birthday">${CAKE}</i>Birthday <i class="hc-key anniversary">${FLAG}</i>Debut anniversary</p>`;
