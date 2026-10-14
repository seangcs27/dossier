import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { getHolodoriCharacters, type HolodoriCharacter } from '../holodori-index';

// hololive Dreams' roster as the album the game would hand you, the owner's pick of 15
// October 2026: a page to a branch, a row to a generation, a numbered slot to each holomem
// with her bust stuck in it as a sticker. A sticker whose birthday is coming stands lifted
// off its slot with the date on a tab; one pressed turns over to show its back. The same
// holomems can be had as a plain grid of stickers (the owner's "category standard") and as
// a calendar of their birthdays and debut anniversaries, a month to a page.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;
// A sticker stands lifted when her birthday is this many days off or nearer.
const LIFT_DAYS = 60;
// Generations to a page of the album.
const ROWS = 3;
// Two pages side by side from this width of window, one at a time under it: the width at
// which two pages of five stickers still fit at the smallest size _holodori.scss gives one.
const WIDE = window.matchMedia('(min-width: 1190px)');

const cast = getHolodoriCharacters();
const byId = new Map(cast.map(c => [c.id, c]));
// Her number in the album is her place in the game's own order.
const place = new Map(cast.map((c, i) => [c.id, i + 1]));
const no = (c: HolodoriCharacter): string => String(place.get(c.id)).padStart(3, '0');

const state = newRosterState();
// The first page showing in each book, kept across visits as the filters are.
const at = { album: 0, calendar: 0 };
// Puts the open book's pages up again when the window crosses the width for two.
let refit: (() => void) | undefined;
WIDE.addEventListener('change', () => refit?.());

// ── The album's pages ──

/** A row of the album: one generation or unit, and its holomems in the game's order. */
interface Section {
  name: string;
  branch: string;
  members: HolodoriCharacter[];
}

/** A page of the album: a branch's title over up to ROWS of its sections. */
interface Leaf {
  title: string;
  sections: Section[];
}

// A holomem in no group stands in a row named for her branch.
const groupsOf = (c: HolodoriCharacter): string[] => (c.groups.length ? c.groups : [c.branch]);

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
const leaves: Leaf[] = branches.flatMap((branch) => {
  const own = sections.filter(s => s.branch === branch);
  return Array.from({ length: Math.ceil(own.length / ROWS) }, (_, i) => ({
    title: branch, sections: own.slice(i * ROWS, (i + 1) * ROWS),
  }));
});

// ── Dates ──
// A birthday is a day of the year with no hour to it, so everything here is the reader's
// own calendar: what is lifted, and what is today, is decided by their clock.

function today(): Date {
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
function daysToBirthday(c: HolodoriCharacter, now: Date): number {
  return Math.round((nextBirthday(c, now).getTime() - now.getTime()) / DAY_MS);
}

const shortDate = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

// Her birthday as her profile has it, '29 Feb' or '29 February', whatever the year.
function birthdayText(c: HolodoriCharacter, long = false): string {
  const [m, d] = c.birthday.split('-').map(Number);
  return `${d} ${long ? MONTHS[m - 1] : MONTHS[m - 1].slice(0, 3)}`;
}

function debutText(c: HolodoriCharacter): string {
  const [y, m, d] = c.debut.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens > 10 && tens < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Whose birthdays are near, among the holomems on show: days to each, and the next one's id. */
interface Soon {
  now: Date;
  days: Map<string, number>;   // only those LIFT_DAYS off or nearer; 0 is today
  next?: string;
}

function soonOf(items: HolodoriCharacter[]): Soon {
  const now = today();
  const days = new Map<string, number>();
  let next: string | undefined;
  let nearest = Infinity;
  for (const c of items) {
    const d = daysToBirthday(c, now);
    if (d <= LIFT_DAYS) days.set(c.id, d);
    if (d > 0 && d < nearest) { nearest = d; next = c.id; }
  }
  return { now, days, next: nearest <= LIFT_DAYS ? next : undefined };
}

// ── A sticker ──

function stickerHtml(c: HolodoriCharacter, soon: Soon): string {
  const days = soon.days.get(c.id);
  const up = days !== undefined && days > 0;
  const on = days === 0;
  const next = c.id === soon.next;
  // A slight tilt of its own, the same on every visit, as a hand would have stuck it.
  const tilt = up ? -5 : ((place.get(c.id)! * 37) % 5 - 2) * 0.6;
  let tab = '';
  let said = '';
  if (on) {
    tab = `Today · ${shortDate(soon.now)}`;
    said = ', her birthday is today';
  } else if (up) {
    tab = `${next ? 'Next · ' : ''}${shortDate(nextBirthday(c, soon.now))} · ${days === 1 ? 'tomorrow' : `${days} days`}`;
    said = `, birthday ${birthdayText(c, true)}, ${days === 1 ? 'tomorrow' : `in ${days} days`}`;
  }
  return `
    <button class="sticker${up ? ' up' : ''}${on ? ' today' : ''}${next ? ' next' : ''}" type="button"
            data-holomem="${escHtml(c.id)}" aria-haspopup="dialog" aria-expanded="false"
            aria-label="${escHtml(`${c.name}, No. ${no(c)}${said}`)}"
            style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}; --r: ${tilt}deg">
      <span class="sticker-face">
        <span class="sticker-initial" aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</span>
        ${c.art ? `<img src="${escHtml(c.art)}" alt="" width="176" height="232" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      </span>
      ${tab ? `<em class="date-tab" aria-hidden="true">${escHtml(tab)}</em>` : ''}
    </button>
  `;
}

// The back, as the sticker turns over: her colours along the top, her greeting, and her facts.
function backHtml(c: HolodoriCharacter): string {
  const facts: [string, string][] = [
    ['Fans', c.fanName],
    ['Debut', debutText(c)],
    ['Birthday', birthdayText(c, true)],
  ];
  return `
    <div class="sticker-back" role="dialog" aria-labelledby="back-name" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
      <div class="back-stripes" aria-hidden="true">${c.colors.map(x => `<i style="background: ${escHtml(x)}"></i>`).join('')}</div>
      <button class="back-close" type="button" aria-label="Turn the sticker back over">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
      </button>
      <p class="back-no">No. ${no(c)} · ${escHtml(groupsOf(c).join(' · '))}</p>
      <h3 class="back-name" id="back-name">${escHtml(c.name)}</h3>
      <p class="back-branch">${escHtml(c.branch)}</p>
      ${c.greeting ? `<blockquote class="back-hello">“${escHtml(c.greeting)}”</blockquote>` : ''}
      <dl class="back-facts">
        ${facts.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${escHtml(v)}</dd>`).join('')}
        <dt>Colours</dt>
        <dd class="back-colours">${c.colors.map(x => `<i style="background: ${escHtml(x)}" data-tip="${escHtml(x)}"></i>`).join('')}</dd>
      </dl>
    </div>
  `;
}

// ── The album ──

function slotHtml(c: HolodoriCharacter, s: Section, shown: Set<string>, soon: Soon): string {
  const label = `<p class="slot-label"><small>No. ${no(c)}</small><b>${escHtml(c.shortName)}</b><span>${birthdayText(c)}</span></p>`;
  // Fubuki is in GAMERS as well as Gen 1, and has one sticker: the second slot points to it.
  if (groupsOf(c)[0] !== s.name) {
    return `<li class="slot ref${shown.has(c.id) ? '' : ' ghost'}"><span class="slot-print ref-print">see<br>No. ${no(c)}</span>${label}</li>`;
  }
  // One the search or a filter leaves out is its printed slot, empty, and nothing to a
  // screen reader.
  if (!shown.has(c.id)) {
    return `<li class="slot ghost" aria-hidden="true"><span class="slot-print">${no(c)}</span>${label}</li>`;
  }
  return `<li class="slot"><span class="slot-print" aria-hidden="true">${no(c)}</span>${stickerHtml(c, soon)}${label}</li>`;
}

function rowHtml(s: Section, shown: Set<string>, soon: Soon): string {
  const own = s.members.filter(c => groupsOf(c)[0] === s.name);
  // A row of three or fewer has room for a word about it, as the album's panels have.
  let info = '';
  if (s.members.length <= 3) {
    const first = [...s.members].sort((a, b) => daysToBirthday(a, soon.now) - daysToBirthday(b, soon.now))[0];
    info = `
      <div class="row-info">
        <b>${escHtml(s.name)}</b>
        <span>since ${Math.min(...own.map(c => Number(c.debut.slice(0, 4))))}</span>
        <span>${s.members.length} holomem${s.members.length === 1 ? '' : 's'}</span>
        <span>next birthday: <strong>${escHtml(first.shortName)}, ${birthdayText(first)}</strong></span>
      </div>`;
  }
  return `
    <div class="row">
      <h4 class="row-strip"><span>${escHtml(s.name)}</span></h4>
      <ul class="slots">${s.members.map(c => slotHtml(c, s, shown, soon)).join('')}</ul>
      ${info}
    </div>
  `;
}

function albumLeafHtml(leaf: Leaf, i: number, shown: Set<string>, soon: Soon): string {
  return `
    <section class="leaf${i > 0 && leaves[i - 1].title === leaf.title ? ' cont' : ''}" data-leaf="${i}" aria-label="Page ${i + 1}, ${escHtml(leaf.title)}" hidden>
      <header class="leaf-head"><h3 class="lettered">${escHtml(leaf.title)}</h3><span class="leaf-no">p. ${i + 1}</span></header>
      ${leaf.sections.map(s => rowHtml(s, shown, soon)).join('')}
    </section>
  `;
}

// What a run of the album's pages is called: their branches and the numbers on them.
function albumSpan(from: number, to: number): string {
  const on = leaves.slice(from, to + 1);
  const numbers = on.flatMap(l => l.sections.flatMap(s => s.members.filter(c => groupsOf(c)[0] === s.name)))
    .map(c => place.get(c.id)!);
  const pad = (n: number): string => String(n).padStart(3, '0');
  return `${[...new Set(on.map(l => l.title))].join(', ')} · Nos. ${pad(Math.min(...numbers))}–${pad(Math.max(...numbers))}`;
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

function monthLeafHtml(y: number, m: number, i: number, items: HolodoriCharacter[], soon: Soon): string {
  const births = new Map<number, HolodoriCharacter[]>();
  const anniversaries = new Map<number, HolodoriCharacter[]>();
  const add = (on: Map<number, HolodoriCharacter[]>, day: number, c: HolodoriCharacter): void => {
    on.set(day, [...(on.get(day) ?? []), c]);
  };
  for (const c of items) {
    const b = birthdayIn(c, y);
    if (b.getMonth() === m) add(births, b.getDate(), c);
    const [dy, dm, dd] = c.debut.split('-').map(Number);
    if (dm - 1 === m && y > dy) add(anniversaries, dd, c);
  }
  const lead = new Date(y, m, 1).getDay();
  const length = new Date(y, m + 1, 0).getDate();
  const thisMonth = soon.now.getFullYear() === y && soon.now.getMonth() === m;
  const days = Array.from({ length }, (_, k) => {
    const d = k + 1;
    const when = thisMonth && d < soon.now.getDate() ? ' past' : thisMonth && d === soon.now.getDate() ? ' today' : '';
    const entries = [
      ...(births.get(d) ?? []).map(c => `
        <li><button class="month-birthday" type="button" data-holomem="${escHtml(c.id)}" aria-haspopup="dialog" aria-expanded="false"
                    aria-label="${escHtml(`${c.name}, birthday ${d} ${MONTHS[m]}`)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
          <span class="month-face">${c.art ? `<img src="${escHtml(c.art)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>
          <span class="month-name">${escHtml(c.shortName)}</span>
        </button></li>`),
      ...(anniversaries.get(d) ?? []).map((c) => {
        const years = y - Number(c.debut.slice(0, 4));
        return `
        <li><button class="month-anniversary" type="button" data-holomem="${escHtml(c.id)}" aria-haspopup="dialog" aria-expanded="false"
                    aria-label="${escHtml(`${c.name}, ${years} year${years === 1 ? '' : 's'} since her debut`)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
          <span class="month-face">${c.art ? `<img src="${escHtml(c.art)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>
          <em class="month-years">${ordinal(years)}</em>
          <span class="month-name">${escHtml(c.shortName)}</span>
        </button></li>`;
      }),
    ];
    return `<li class="month-day${when}"><span class="month-no">${d}</span>${entries.length ? `<ul>${entries.join('')}</ul>` : ''}</li>`;
  });
  return `
    <section class="leaf month" data-leaf="${i}" aria-label="${MONTHS[m]} ${y}" hidden>
      <header class="leaf-head"><h3 class="lettered">${MONTHS[m]}</h3><span class="leaf-no">${y}</span></header>
      <div class="month-week" aria-hidden="true">${WEEKDAYS.map(w => `<span>${w}</span>`).join('')}</div>
      <ol class="month-days">${'<li class="month-blank" aria-hidden="true"></li>'.repeat(lead)}${days.join('')}</ol>
    </section>
  `;
}

function calendarSpan(from: number, to: number): string {
  const all = months();
  const a = all[from];
  const b = all[to];
  if (from === to) return `${MONTHS[a.m]} ${a.y}`;
  return a.y === b.y ? `${MONTHS[a.m]} – ${MONTHS[b.m]} ${b.y}` : `${MONTHS[a.m]} ${a.y} – ${MONTHS[b.m]} ${b.y}`;
}

// ── The grid ──

function gridHtml(items: HolodoriCharacter[], soon: Soon): string {
  return branches.filter(b => items.some(c => c.branch === b)).map(b => `
    <section class="shelf" aria-label="${escHtml(b)}">
      <h3 class="lettered">${escHtml(b)}</h3>
      <ul class="shelf-grid">${items.filter(c => c.branch === b).map(c => `
        <li class="shelf-item">
          ${stickerHtml(c, soon)}
          <p class="shelf-label"><small>No. ${no(c)} · ${escHtml(groupsOf(c).join(' · '))}</small><b>${escHtml(c.name)}</b><span>${birthdayText(c)}</span></p>
        </li>`).join('')}
      </ul>
    </section>
  `).join('');
}

// ── Turning over ──

/** The sticker turned over, if one is: its back, the button it came from, and how it turned. */
interface Turned {
  back: HTMLElement;
  from: HTMLElement;
  spin: Animation;
  small: string;   // the scale that shrinks the back to the sticker's size
}
let turned: Turned | undefined;

// The sticker turns edge on, and its back comes round from the other side at the sticker's
// place, growing from its size to its own.
function turnOver(page: HTMLElement, from: HTMLElement, c: HolodoriCharacter): void {
  turnBack(false);
  page.insertAdjacentHTML('beforeend', backHtml(c));
  const back = page.lastElementChild as HTMLElement;
  const box = page.getBoundingClientRect();
  const r = from.getBoundingClientRect();
  const w = back.offsetWidth;
  const h = back.offsetHeight;
  const cx = r.left - box.left + r.width / 2;
  const cy = r.top - box.top + r.height / 2;
  const x = Math.min(Math.max(cx - w / 2, 8), box.width - w - 8);
  const y = Math.max(cy - h / 2, 8);
  back.style.left = `${x}px`;
  back.style.top = `${y}px`;
  back.style.transformOrigin = `${cx - x}px ${cy - y}px`;
  const small = `scale(${(r.width / w).toFixed(3)}, ${(r.height / h).toFixed(3)})`;
  const spin = from.animate({ rotate: ['y 0deg', 'y 90deg'] }, { duration: 160, easing: 'ease-in', fill: 'forwards' });
  back.animate(
    { transform: [`perspective(900px) rotateY(-90deg) ${small}`, 'perspective(900px) rotateY(0deg) scale(1)'] },
    { duration: 380, delay: 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
  );
  from.setAttribute('aria-expanded', 'true');
  turned = { back, from, spin, small };
  back.querySelector<HTMLElement>('.back-close')!.focus({ preventScroll: true });
}

function turnBack(refocus: boolean): void {
  if (!turned) return;
  const { back, from, spin, small } = turned;
  turned = undefined;
  from.setAttribute('aria-expanded', 'false');
  back.animate(
    { transform: ['perspective(900px) rotateY(0deg) scale(1)', `perspective(900px) rotateY(90deg) ${small}`] },
    { duration: 200, easing: 'ease-in', fill: 'forwards' },
  ).finished.then(() => back.remove(), () => back.remove());
  // Held edge on through the delay, then round to face the page again.
  from.animate({ rotate: ['y -90deg', 'y 0deg'] }, { duration: 200, delay: 160, easing: 'ease-out', fill: 'backwards' });
  spin.cancel();
  if (refocus && from.isConnected) from.focus({ preventScroll: true });
}

// ── The page ──

const HEADS: Record<string, string> = { album: 'Holomem Album', grid: 'All Holomems', calendar: 'Birthday Calendar' };

// Puts up a book's spread from `at[kind]`: two pages or one by the window's width, the turns
// at its foot named for the spreads they go to, and the tabs of what is showing lit. Gives
// back the turn: to the spread a given page is on.
function wireBook(page: HTMLElement, kind: 'album' | 'calendar', span: (from: number, to: number) => string): (to: number) => void {
  const book = page.querySelector<HTMLElement>('.book')!;
  const pages = Array.from(book.querySelectorAll<HTMLElement>('.leaf'));
  const sub = page.querySelector<HTMLElement>('.hd-sub-spread')!;
  const prev = book.querySelector<HTMLButtonElement>('[data-turn="-1"]')!;
  const next = book.querySelector<HTMLButtonElement>('[data-turn="1"]')!;
  const show = (): void => {
    const per = WIDE.matches ? 2 : 1;
    const first = Math.min(at[kind] - (at[kind] % per), (Math.ceil(pages.length / per) - 1) * per);
    at[kind] = first;
    const last = Math.min(first + per, pages.length) - 1;
    pages.forEach((p, i) => { p.hidden = i < first || i > last; });
    book.classList.toggle('one-page', per === 1);
    prev.hidden = first === 0;
    next.hidden = last === pages.length - 1;
    const label = (button: HTMLButtonElement, words: string, to: string): void => {
      button.querySelector('span')!.textContent = to;
      button.setAttribute('aria-label', `${words} ${to}`);
    };
    if (!prev.hidden) label(prev, 'Turn back to', span(Math.max(0, first - per), first - 1));
    if (!next.hidden) label(next, 'Turn on to', span(last + 1, Math.min(last + per, pages.length - 1)));
    for (const tab of Array.from(book.querySelectorAll<HTMLElement>('[data-leaf-to]'))) {
      const on = tab.dataset.leaves!.split(',').map(Number).some(i => i >= first && i <= last);
      tab.classList.toggle('on', on);
      if (on) tab.setAttribute('aria-current', 'true');
      else tab.removeAttribute('aria-current');
    }
    sub.textContent = span(first, last);
    // A turn by the keyboard hides the sticker it was on.
    if (book.contains(document.activeElement) && (document.activeElement as HTMLElement).closest('[hidden]')) book.focus();
  };
  refit = () => { if (page.isConnected) show(); };
  show();
  return (to: number): void => {
    const was = at[kind];
    at[kind] = Math.max(0, Math.min(to, pages.length - 1));
    turnBack(false);
    show();
    if (at[kind] === was) return;
    // The new spread slides in from the side it was turned to.
    const from = at[kind] > was ? 28 : -28;
    for (const p of pages) {
      if (!p.hidden) p.animate({ opacity: [0.25, 1], transform: [`translateX(${from}px)`, 'none'] }, { duration: 300, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
  };
}

function bookHtml(leafHtml: string[], legend: string, tabs: string): string {
  return `
    <div class="book" tabindex="-1">
      <div class="cover">
        <div class="spread">${leafHtml.join('')}</div>
        <div class="book-foot">
          <button class="turn" type="button" data-turn="-1"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"></path></svg><span></span></button>
          <p class="legend">${legend}</p>
          <button class="turn" type="button" data-turn="1"><span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"></path></svg></button>
        </div>
        ${tabs}
      </div>
    </div>
  `;
}

function draw(page: HTMLElement, items: HolodoriCharacter[], look: string): void {
  turned = undefined;
  refit = undefined;
  const soon = soonOf(items);
  const shown = new Set(items.map(c => c.id));
  let body = '';
  if (look === 'grid') {
    body = `<div class="shelves">${gridHtml(items, soon)}</div>`;
  } else if (look === 'calendar') {
    body = bookHtml(
      months().map(({ y, m }, i) => monthLeafHtml(y, m, i, items, soon)),
      '<i class="legend-face"></i>Birthday <i class="legend-face legend-anniversary"></i>Debut anniversary, with the years since',
      '',
    );
  } else {
    // A search or a filter that leaves nobody on the open spread turns to the first page
    // that has someone.
    const per = WIDE.matches ? 2 : 1;
    const has = (i: number): boolean => leaves[i]?.sections.some(s => s.members.some(c => shown.has(c.id))) ?? false;
    const first = at.album - (at.album % per);
    if (!has(first) && !has(first + per - 1)) at.album = Math.max(0, leaves.findIndex((_, i) => has(i)));
    const tabs = branches.map(b => {
      const own = leaves.flatMap((l, i) => (l.title === b ? [i] : []));
      return `<button class="album-tab" type="button" data-leaf-to="${own[0]}" data-leaves="${own.join(',')}"><span>${escHtml(b)}</span></button>`;
    }).join('');
    body = bookHtml(
      leaves.map((l, i) => albumLeafHtml(l, i, shown, soon)),
      `Lifted: a birthday in the next ${LIFT_DAYS} days. It sticks down on the day.`,
      `<nav class="album-tabs" aria-label="Branches">${tabs}</nav>`,
    );
  }
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">${HEADS[look] ?? HEADS.album}</h2>
      <p class="hd-sub">${look === 'grid' ? 'A sticker to every holomem, branch by branch' : look === 'calendar' ? 'Birthdays and debut anniversaries' : 'A sticker to every holomem'}${look === 'grid' ? '' : ' · <span class="hd-sub-spread" aria-live="polite"></span>'}</p>
    </header>
    ${body}
    <p class="hd-credit">Pictures: <a href="https://www.hololive-dreams.com/en/" target="_blank" rel="noopener">hololive Dreams official site</a> · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
  `;
  const go = look === 'grid' ? undefined : wireBook(page, look === 'calendar' ? 'calendar' : 'album', look === 'calendar' ? calendarSpan : albumSpan);
  const kind = look === 'calendar' ? 'calendar' : 'album';
  const per = (): number => (WIDE.matches ? 2 : 1);

  page.onclick = (ev) => {
    const target = ev.target as Element;
    const turn = target.closest<HTMLElement>('[data-turn]');
    if (turn && go) { go(at[kind] + Number(turn.dataset.turn) * per()); return; }
    const tab = target.closest<HTMLElement>('[data-leaf-to]');
    if (tab && go) { go(Number(tab.dataset.leafTo)); return; }
    if (target.closest('.back-close')) { turnBack(true); return; }
    const who = target.closest<HTMLElement>('[data-holomem]');
    const c = who && byId.get(who.dataset.holomem!);
    if (who && c) turnOver(page, who, c);
  };
  // A press anywhere but on the back, or on another sticker, which turns that one over.
  page.onpointerdown = (ev) => {
    const target = ev.target as Element;
    if (turned && !turned.back.contains(target) && !target.closest('[data-holomem]')) turnBack(false);
  };
  page.onkeydown = (ev) => {
    if (ev.key === 'Escape' && turned) { turnBack(true); return; }
    const arrow = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!arrow || !go || ev.altKey || ev.ctrlKey || ev.metaKey || turned?.back.contains(ev.target as Node)) return;
    if (!(ev.target as Element).closest('.book')) return;
    ev.preventDefault();
    go(at[kind] + arrow * per());
  };
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
      options: [{ id: 'album', label: 'Album' }, { id: 'grid', label: 'Grid' }, { id: 'calendar', label: 'Calendar' }],
    },
    noun: 'holomems',
    emptyNote: 'The last build could not reach the game data on GitHub.',
    find: { state, text: c => `${c.name} ${c.shortName}`, filters },
  });
}
