import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { getHolodoriCharacters, type HolodoriCharacter } from '../holodori-index';

// hololive Dreams' roster as the stickers the game would hand you, on the sheet they come
// on, all 54 at once (the owner's ask of 16 October 2026). A sticker whose birthday is
// coming stands lifted with the date on a tab; one pressed opens her page. The
// same holomems can be had as a year of their birthdays and debut anniversaries. The album
// and the grid beside them were taken out on 17 October 2026, at the owner's ask.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const DAY_MS = 86_400_000;
// A sticker stands lifted when her birthday is this many days off or nearer.
const LIFT_DAYS = 60;

const cast = getHolodoriCharacters();
// Her number is her place in the game's own order.
const place = new Map(cast.map((c, i) => [c.id, i + 1]));
export const no = (c: HolodoriCharacter): string => String(place.get(c.id)).padStart(3, '0');

const state = newRosterState();

// ── Generations ──

/** A row of the sheet: one generation or unit, and its holomems in the game's order. */
interface Section {
  name: string;
  branch: string;
  members: HolodoriCharacter[];
}

// A holomem in no group stands in a row named for her branch.
export const groupsOf = (c: HolodoriCharacter): string[] => (c.groups.length ? c.groups : [c.branch]);

// A section stands where the first holomem whose own generation it is stands, so GAMERS,
// which Fubuki is in beside Gen 1, comes after Gen 2 as it does in the game.
const sections: Section[] = [];
{
  const named = new Map<string, Section>();
  for (const c of cast) {
    const own = groupsOf(c)[0];
    if (named.has(own)) continue;
    const s = { name: own, branch: c.branch, members: [] };
    named.set(own, s);
    sections.push(s);
  }
  for (const c of cast) for (const g of groupsOf(c)) named.get(g)!.members.push(c);
}
const branches = [...new Set(cast.map(c => c.branch))];

// ── Dates ──
// A birthday is a day of the year with no hour to it, so everything here is the reader's
// own calendar: what is lifted, and what is today, is decided by their clock.

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Her birthday in a given year. Hakos Baelz's is 29 February, and a year with no such day
// keeps it on the 28th.
function birthdayIn(c: HolodoriCharacter, year: number): Date {
  const [m, d] = c.birthday.split('-').map(Number);
  const leap = new Date(year, 1, 29).getDate() === 29;
  return new Date(year, m - 1, m === 2 && d === 29 && !leap ? 28 : d);
}

function nextBirthday(c: HolodoriCharacter, now: Date): Date {
  const day = birthdayIn(c, now.getFullYear());
  return day < now ? birthdayIn(c, now.getFullYear() + 1) : day;
}

// Rounded, since a day with a change of the clocks in it is 23 or 25 hours long.
export function daysToBirthday(c: HolodoriCharacter, now: Date): number {
  return Math.round((nextBirthday(c, now).getTime() - now.getTime()) / DAY_MS);
}

const shortDate = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

// Her birthday as her profile has it, '29 Feb' or '29 February', whatever the year.
export function birthdayText(c: HolodoriCharacter, long = false): string {
  const [m, d] = c.birthday.split('-').map(Number);
  return `${d} ${long ? MONTHS[m - 1] : MONTHS[m - 1].slice(0, 3)}`;
}

export function debutText(c: HolodoriCharacter): string {
  const [y, m, d] = c.debut.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens > 10 && tens < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Whose birthdays are near: days to each, and who is next (everyone on that one day). */
interface Soon {
  now: Date;
  days: Map<string, number>;   // only those LIFT_DAYS off or nearer; 0 is today
  next: Set<string>;           // whoever has the nearest birthday after today, however far
  nextIn: number;              // the days to it
}

function soonOf(items: HolodoriCharacter[]): Soon {
  const now = today();
  const days = new Map<string, number>();
  const all = new Map(items.map(c => [c.id, daysToBirthday(c, now)]));
  for (const [id, d] of all) if (d <= LIFT_DAYS) days.set(id, d);
  const nextIn = Math.min(...[...all.values()].filter(d => d > 0));
  const next = new Set([...all].filter(([, d]) => d === nextIn).map(([id]) => id));
  return { now, days, next, nextIn };
}

// ── The spotlight ──
// Over the sheet and the calendar: whose birthday is today, and who is next, with her icon,
// the date and the days to go. Two who share a birthday stand side by side.

function spotPersonHtml(c: HolodoriCharacter): string {
  const src = c.icon ?? c.art;
  return `
    <a class="spot-who" href="#/holodori/holomem/${encodeURIComponent(c.id)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
      <span class="spot-icon${c.icon ? ' icon' : ''}">${src ? `<img src="${escHtml(src)}" alt="" width="128" height="128" decoding="async" onerror="this.remove()">` : ''}</span>
      <span class="spot-name">${escHtml(c.shortName)}<small>${birthdayText(c, true)}</small></span>
    </a>
  `;
}

function spotlightHtml(soon: Soon): string {
  const on = cast.filter(c => soon.days.get(c.id) === 0);
  const next = cast.filter(c => soon.next.has(c.id));
  const part = (cls: string, label: string, people: HolodoriCharacter[], count: string): string => `
    <div class="spot ${cls}">
      <p class="spot-label">${label}</p>
      <div class="spot-people">${people.map(spotPersonHtml).join('')}</div>
      <p class="spot-count">${count}</p>
    </div>`;
  return `
    <section class="spotlight" aria-label="Birthdays">
      ${on.length ? part('on', 'Happy birthday!', on, '<b>Today</b>') : ''}
      ${next.length ? part('next', `Next birthday${next.length > 1 ? 's' : ''}`, next,
        soon.nextIn === 1 ? '<b>Tomorrow</b>' : `<b>${soon.nextIn}</b> days to go`) : ''}
    </section>
  `;
}

// ── A sticker ──

// `short` puts only the date on its tab, for the sheet's smaller stickers.
function stickerHtml(c: HolodoriCharacter, soon: Soon, short = false): string {
  const days = soon.days.get(c.id);
  const up = days !== undefined && days > 0;
  const on = days === 0;
  const next = up && soon.next.has(c.id);
  // A slight tilt of its own, the same on every visit, as a hand would have stuck it.
  const tilt = up ? -5 : ((place.get(c.id)! * 37) % 5 - 2) * 0.6;
  let tab = '';
  let said = '';
  if (on) {
    tab = `Today · ${shortDate(soon.now)}`;
    said = ', her birthday is today';
  } else if (up) {
    tab = `${next ? 'Next · ' : ''}${shortDate(nextBirthday(c, soon.now))}${short ? '' : ` · ${days === 1 ? 'tomorrow' : `${days} days`}`}`;
    said = `, birthday ${birthdayText(c, true)}, ${days === 1 ? 'tomorrow' : `in ${days} days`}`;
  }
  return `
    <a class="sticker${up ? ' up' : ''}${on ? ' today' : ''}${next ? ' next' : ''}" href="#/holodori/holomem/${encodeURIComponent(c.id)}"
            aria-label="${escHtml(`${c.name}, No. ${no(c)}${said}`)}"
            style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}; --r: ${tilt}deg">
      <span class="sticker-face">
        <span class="sticker-initial" aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</span>
        ${c.art ? `<img src="${escHtml(c.art)}" alt="" width="176" height="232" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </span>
      ${tab ? `<em class="date-tab" aria-hidden="true">${escHtml(tab)}</em>` : ''}
    </a>
  `;
}

// ── The calendar ──

// Twelve months, this one first.
function months(): { y: number; m: number }[] {
  const now = today();
  return Array.from({ length: 12 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
}

// A month of the year: each birthday and each debut anniversary in it, by the day, as her
// face beside her name. In this month what has passed fades and today is marked.
function monthHtml(y: number, m: number, items: HolodoriCharacter[], soon: Soon): string {
  const entries: { day: number; c: HolodoriCharacter; years?: number }[] = [];
  for (const c of items) {
    const b = birthdayIn(c, y);
    if (b.getMonth() === m) entries.push({ day: b.getDate(), c });
    const [dy, dm, dd] = c.debut.split('-').map(Number);
    if (dm - 1 === m && y > dy) entries.push({ day: dd, c, years: y - dy });
  }
  // By the day, a birthday before an anniversary on the same one.
  entries.sort((a, b) => a.day - b.day || Number(a.years !== undefined) - Number(b.years !== undefined));
  const thisMonth = soon.now.getFullYear() === y && soon.now.getMonth() === m;
  const list = entries.map(({ day, c, years }) => {
    const when = thisMonth && day < soon.now.getDate() ? 'past' : thisMonth && day === soon.now.getDate() ? 'on' : '';
    const said = years === undefined ? `birthday ${day} ${MONTHS[m]}` : `${years} year${years === 1 ? '' : 's'} since her debut, ${day} ${MONTHS[m]}`;
    return `
      <li${when ? ` class="${when}"` : ''}><a class="${years === undefined ? 'month-birthday' : 'month-anniversary'}" href="#/holodori/holomem/${encodeURIComponent(c.id)}"
              aria-label="${escHtml(`${c.name}, ${said}`)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
        <b class="month-date">${day}</b>
        <span class="month-face${c.icon ? ' icon' : ''}">${c.icon ?? c.art ? `<img src="${escHtml((c.icon ?? c.art)!)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>
        <span class="month-name">${escHtml(c.shortName)}</span>
        ${years === undefined ? '' : `<em class="month-years">${ordinal(years)} anniversary</em>`}
      </a></li>`;
  });
  return `
    <li class="month${thisMonth ? ' now' : ''}">
      <h3 class="month-head"><span class="lettered">${MONTHS[m]}</span><small>${y}</small>${thisMonth ? `<em class="month-today">Today · ${shortDate(soon.now)}</em>` : ''}</h3>
      ${list.length ? `<ul class="month-list">${list.join('')}</ul>` : '<p class="month-none">Nobody this month</p>'}
    </li>
  `;
}

function yearSpan(): string {
  const all = months();
  const a = all[0];
  const b = all[all.length - 1];
  return `${MONTHS[a.m]} ${a.y} – ${MONTHS[b.m]} ${b.y}`;
}

// ── The sheet ──
// Every holomem once, on the sheet the stickers come on: a block to a branch, a strip to a
// generation beside its stickers, her name under each.

function sheetHtml(shown: Set<string>, soon: Soon): string {
  return branches.map(b => `
    <section class="sheet-branch" aria-label="${escHtml(b)}">
      <h3 class="lettered">${escHtml(b)}</h3>
      <div class="sheet-groups">${sections.filter(s => s.branch === b).map((s) => {
        const own = s.members.filter(c => groupsOf(c)[0] === s.name);
        if (!own.length) return '';
        return `
        <div class="sheet-group">
          <h4 class="row-strip"><span>${escHtml(s.name)}</span></h4>
          <ul class="sheet-row">${own.map(c => `
            <li class="slot${shown.has(c.id) ? '' : ' ghost'}"${shown.has(c.id) ? '' : ' aria-hidden="true"'}>
              ${shown.has(c.id) && soon.next.has(c.id) && soon.nextIn <= LIFT_DAYS ? '<span class="next-rays" aria-hidden="true"></span>' : ''}
              <span class="slot-print" aria-hidden="true">${no(c)}</span>
              ${shown.has(c.id) ? stickerHtml(c, soon, true) : ''}
              <p class="sheet-name">${escHtml(c.shortName)}</p>
            </li>`).join('')}
          </ul>
        </div>`;
      }).join('')}
      </div>
    </section>
  `).join('');
}

// ── The page ──

const HEADS: Record<string, string> = {
  sheet: 'Holomem Stickers', calendar: 'Birthday Calendar',
};
const SUBS: Record<string, string> = {
  sheet: `Every holomem on one sheet · lifted: a birthday in the next ${LIFT_DAYS} days`,
  calendar: 'Birthdays and debut anniversaries',
};

function draw(page: HTMLElement, items: HolodoriCharacter[], look: string): void {
  // Who is next is the next of all 54, whoever a search leaves on show.
  const soon = soonOf(cast);
  const shown = new Set(items.map(c => c.id));
  let body = '';
  if (look === 'sheet') {
    body = `<div class="sheet-wrap"><div class="sheet">${sheetHtml(shown, soon)}</div></div>`;
  } else {
    body = `
      <p class="legend year-legend"><i class="legend-face"></i>Birthday <i class="legend-face legend-anniversary"></i>Debut anniversary, with the years since</p>
      <ol class="year">${months().map(({ y, m }) => monthHtml(y, m, items, soon)).join('')}</ol>`;
  }
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">${HEADS[look] ?? HEADS.sheet}</h2>
      <p class="hd-sub">${SUBS[look] ?? SUBS.sheet}${look === 'calendar' ? ` · ${yearSpan()}` : ''}</p>
    </header>
    ${spotlightHtml(soon)}
    ${body}
    <p class="hd-credit">Pictures: <a href="https://www.hololive-dreams.com/en/" target="_blank" rel="noopener">hololive Dreams official site</a> · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
  `;
}

export function mountHolodori(container: HTMLElement): void {
  const filters: RosterFilter<HolodoriCharacter>[] = [
    { key: 'branch', label: 'Branch', values: branches, look: 'chips', of: c => c.branch },
    {
      key: 'gen', label: 'Generation', values: sections.map(s => s.name), look: 'chips', of: groupsOf,
      sets: branches.map(b => ({ label: b, values: sections.filter(s => s.branch === b).map(s => s.name) })),
    },
  ];
  // 'holomems' is the game's own word for its cast, in its English text and on its site.
  // 'Character' is its table's name and no more.
  mountRoster(container, {
    items: cast,
    draw,
    looks: {
      state,
      name: 'View',
      options: [
        { id: 'sheet', label: 'Sheet' }, { id: 'calendar', label: 'Calendar' },
      ],
    },
    noun: 'holomems',
    emptyNote: 'The last build could not reach the game data on GitHub.',
    find: { state, text: c => `${c.name} ${c.shortName}`, filters },
  });
}
