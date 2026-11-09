import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { getHolodoriTalent, type HolodoriCharacter } from '../holodori-index';
import {
  MONTHS, birthdayText, daysToBirthday, groupsOf, holomemLinkAttrs, nextBirthday, no, place, today,
} from '../render/holodori-format';

// hololive Dreams' roster as the stickers the game would hand you, on the sheet they come
// on, all of them at once (the owner's ask of 16 October 2026): the game's 54 and the talent
// it does not have yet. A sticker whose birthday is coming stands lifted with the date on a
// tab; one pressed opens her page, or her official profile where the game has none. The
// birthdays and debut anniversaries are the calendar's (views/holodori-calendar.ts). The album
// and the grid beside them were taken out on 17 October 2026, at the owner's ask.

// A sticker stands lifted when her birthday is this many days off or nearer.
const LIFT_DAYS = 60;

const cast = getHolodoriTalent();

const state = newRosterState();

// ── Generations ──

/** A row of the sheet: one generation or unit, and its holomems in the game's order. */
interface Section {
  name: string;
  branch: string;
  members: HolodoriCharacter[];
}

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
// What is lifted, and what is today, is decided by the reader's clock (see
// render/holodori-format.ts for the rest).

const shortDate = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;

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
    <a class="spot-who" ${holomemLinkAttrs(c)} style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
      <span class="spot-icon${c.icon ? ' icon' : ''}">${src ? `<img src="${escHtml(src)}" alt="" width="128" height="128" decoding="async" onerror="this.remove()">` : `<b aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</b>`}</span>
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
    <a class="sticker${up ? ' up' : ''}${on ? ' today' : ''}${next ? ' next' : ''}" ${holomemLinkAttrs(c)}
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

function draw(page: HTMLElement, items: HolodoriCharacter[]): void {
  // Who is next is the next of everyone, whoever a search leaves on show.
  const soon = soonOf(cast);
  const shown = new Set(items.map(c => c.id));
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">Holomem Stickers</h2>
      <p class="hd-sub">Every holomem on one sheet · lifted: a birthday in the next ${LIFT_DAYS} days · a channel avatar: not in the game yet</p>
    </header>
    ${spotlightHtml(soon)}
    <div class="sheet-wrap"><div class="sheet">${sheetHtml(shown, soon)}</div></div>
    <p class="hd-credit">Pictures: <a href="https://www.hololive-dreams.com/en/" target="_blank" rel="noopener">hololive Dreams official site</a> · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a> · Talent the game lacks: <a href="https://hololive.wiki" target="_blank" rel="noopener">hololive Fan Wiki</a></p>
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
    noun: 'holomems',
    emptyNote: 'The last build could not reach the game data on GitHub.',
    find: { state, text: c => `${c.name} ${c.shortName}`, filters },
  });
}
