import { escHtml } from '../format';
import { mountRoster, newRosterState, type RosterOrder } from '../card';
import { getPtnSinners, type PtnSinner } from '../ptn-index';
import {
  codeOf, holdPtnLang, libramName, monthOf, nameOf, PTN_LANGS, ptnLang, rankName, setPtnLang, t, tagsOf,
  tendencyName, type PtnLang,
} from '../ptn-lang';

// The game's three ranks, highest first: a line-up to each.
const RANKS: PtnSinner['rank'][] = ['S', 'A', 'B'];

// The game's six tendencies, in the order its own roster lists them.
const TENDENCIES = ['Endura', 'Fury', 'Umbra', 'Reticle', 'Arcane', 'Catalyst'];

// Its sixteen librams in the four kinds it sorts them into, as the game's Chinese wiki
// lays its own filter out: the nine sins, the five of the apocalypse, and two that stand
// alone. The English names of the kinds are this site's: neither wiki gives them in English.
const LIBRAM_SETS = [
  { label: 'setSin', values: ['LIMBO', 'LOVE', 'GREED', 'ANGER', 'HERESY', 'VIOLENCE', 'TREACHERY', 'SLOTH', 'FRAUD'] },
  { label: 'setApocalypse', values: ['PESTILENCE', 'FAMINE', 'WAR', 'DEATH', 'SEQUESTER'] },
  { label: 'setImmortal', values: ['IMMORTAL'] },
  { label: 'setInfinite', values: ['INFINITE'] },
] as const;

// This page's search and picks, kept across visits, and which of the two pictures its wall
// is showing. A Sinner's dossier reads the last, to open on the same picture.
export const ptnRoster = newRosterState();

// A day later than any release: where a Sinner with none on record sorts, since having none
// means the record has not caught up with them, or the Global server has not.
const UNRECORDED = '9999';

// The badge the game gives a rank, a tendency or a libram (icons/ptn/, from the game's
// Chinese wiki). A rank's has its Chinese character drawn in it, so it is the Chinese
// side's alone: in English the rank is its letter.
function badgeOf(kind: 'rank' | 'tendency' | 'libram', value: string): string | undefined {
  if (kind === 'rank' && ptnLang() !== 'zh') return undefined;
  return `icons/ptn/${kind}-${value.toLowerCase()}.webp`;
}

// ── The wall ──
// The roster is MBCC's line-up room, not a grid of cards: every Sinner stands whole on a
// floor line, against a wall ruled every 10 cm, at the height their file gives (_ptn.scss
// draws the wall and does the scaling; here a figure only says how tall it is). Under each
// is the placard a card's lines moved to. Rank is no longer a colour: it is which line-up
// a Sinner stands in. The line-ups stand one after another along the one wall, which runs
// on sideways: the page is a single row, a window's height.

// What the wall stands a Sinner at when their file gives no height, which none lacks today:
// the roster's median.
const USUAL_CM = 166;

// One Sinner on the wall. `dated` is a line-up of a year's arrivals, where the placard's
// last line gives the month in place of the tendency and libram.
function suspectHtml(s: PtnSinner, look: string, dated: boolean): string {
  // Whichever of the two pictures is asked for, or the other where a Sinner has only one:
  // the Sinners the Chinese wiki alone has pictures of have no mugshot.
  const figure = look === 'original' ? s.figureOriginal ?? s.figure : s.figure ?? s.figureOriginal;
  const cm = s.height ?? USUAL_CM;
  // The picture's shape is known before the picture is, so the figure's place is held, and
  // outlined until it comes (.stand.in). One with no picture at all stays an outline.
  const stand = figure
    ? `<span class="stand" data-cm="${cm}">
         <img class="fig" src="${escHtml(figure.art)}" alt="" loading="lazy" decoding="async" draggable="false"
              style="aspect-ratio: ${figure.ratio}" onload="this.parentNode.classList.add('in')">
       </span>`
    : `<span class="stand none" data-cm="${cm}"><span class="fig">${t('noPhoto')}</span></span>`;
  let kind = `${tendencyName(s.tendency)} · ${libramName(s.libram)}`;
  if (s.cnOnly) kind = t('cnOnly');
  else if (dated && s.released) kind = `${t('arrived')} ${monthOf(s.released)}`;
  return `
    <a class="suspect" href="#/ptn/sinner/${encodeURIComponent(s.id)}" data-id="${escHtml(s.id)}"
       draggable="false" style="--cm: ${cm}">
      ${stand}
      <span class="plate">
        <span class="plate-no">${escHtml(codeOf(s))}</span>
        <span class="plate-name">${escHtml(nameOf(s))}</span>
        <span class="plate-rank" aria-hidden="true">${s.rank}</span>
        <span class="plate-kind">${escHtml(kind)}</span>
        <span class="visually-hidden">${escHtml(rankName(s.rank))}, ${cm} cm</span>
      </span>
    </a>
  `;
}

interface Lineup {
  title: string;
  short: string;        // on the rail under the wall, where a title does not fit: '2026', 'S'
  sinners: PtnSinner[];
  dated?: boolean;
}

// The line-ups a page is made of, each with someone in it. By rank there is one to a rank,
// which is the order the roster comes in. Newest first there is one to a year of arrests
// (the game's own word for getting a Sinner), after one for the Sinners the Global server
// does not have and one for any the record has not caught up with; 2022's is the 45 who
// were there when the server opened and the four the year then added. `sinners` comes in
// the order to show, so each line-up takes its own as they come.
function lineupsOf(sinners: PtnSinner[], order: string): Lineup[] {
  const zh = ptnLang() === 'zh';
  if (order !== 'newest') {
    return RANKS.map(rank => ({
      title: zh ? `${rankName(rank)}${t('lineup')}` : `${t('lineup')} ${rank}`,
      short: rankName(rank),
      sinners: sinners.filter(s => s.rank === rank),
    })).filter(lineup => lineup.sinners.length);
  }
  const lineups: Lineup[] = [];
  for (const s of sinners) {
    let title = s.cnOnly ? t('cnOnly') : t('newArrivals');
    let short = s.cnOnly ? t('cnShort') : t('newShort');
    if (s.released) {
      short = s.released.slice(0, 4);
      title = zh ? `${short} 年${t('arrivals')}` : `${t('arrivals')} ${short}`;
    }
    const last = lineups[lineups.length - 1];
    if (last?.title === title) last.sinners.push(s);
    else lineups.push({ title, short, sinners: [s], dated: !!s.released });
  }
  return lineups;
}

const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5 5 8l5.5 5.5"></path></svg>';

// All of them at once, unlike the cards, which are dealt in batches: a figure is a link, a
// picture and a placard, a tenth of a card's markup, and its picture waits until the wall
// has been moved along to it. Around the wall are the ways along it: an arrow at each end,
// and under the floor a rail with a part for each line-up.
function drawWall(page: HTMLElement, sinners: PtnSinner[], look: string, order: string): void {
  const zh = ptnLang() === 'zh';
  page.lang = zh ? 'zh-Hans' : 'en';
  const lineups = lineupsOf(sinners, order);
  const count = (lineup: Lineup): string => `${lineup.sinners.length} ${t('standing')}`;
  page.innerHTML = `
    <div class="wall-frame">
      <div class="wall">
        <span class="wall-scale" aria-hidden="true"></span>
        ${lineups.map((lineup, i) => `
          <section class="lineup" aria-labelledby="lineup-${i}">
            <header class="lineup-head">
              <h2 id="lineup-${i}">${escHtml(lineup.title)}</h2>
              <p class="lineup-count">${count(lineup)}</p>
            </header>
            <div class="lineup-row">${lineup.sinners.map(s => suspectHtml(s, look, !!lineup.dated)).join('')}</div>
          </section>
        `).join('')}
      </div>
      <button class="wall-nav prev" aria-label="${t('scrollBack')}">${CHEVRON}</button>
      <button class="wall-nav next" aria-label="${t('scrollOn')}">${CHEVRON}</button>
      <nav class="wall-rail" aria-label="${t('lineups')}">
        <span class="rail-here" aria-hidden="true"></span>
        ${lineups.map(lineup => `
          <button class="rail-seg" data-tip="${escHtml(`${lineup.title} · ${count(lineup)}`)}"
                  aria-label="${escHtml(lineup.title)}">${escHtml(lineup.short)}</button>
        `).join('')}
      </nav>
    </div>
  `;
  // A search or a pick changes how many stand, and an order where: either starts the wall
  // again from its head.
  wireWall(page, `${order}:${sinners.length}`);
}

// ── Along the wall ──

/** How far a press has to move before it is a drag and not a click. */
const DRAG_PX = 5;
/** How long an arrow or the rail takes to move the wall. */
const GLIDE_MS = 420;
/** How much of what is showing an arrow moves the wall by. */
const STEP = 0.8;
/** A wheel's notch, for a mouse that reports lines and not pixels. */
const LINE_PX = 40;

// Where the wall was left, to come back to from a Sinner's page or a change of picture:
// the Sinner at its left edge, how far into their place the edge was (a share of it, since
// the other picture of them is another width), and the wall they were on.
let left: { wall: string; id: string; into: number } | undefined;

// A press that moves is a drag: `start` as it becomes one, `move` with how far it has gone
// since the press. The click that ends one is nobody's.
function onDrag(el: HTMLElement, mouseOnly: boolean, start: () => void, move: (dx: number, ev: PointerEvent) => void): void {
  let from: number | undefined;
  let dragging = false;
  el.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || (mouseOnly && ev.pointerType !== 'mouse')) return;
    from = ev.clientX;
  });
  el.addEventListener('pointermove', (ev) => {
    if (from === undefined) return;
    const dx = ev.clientX - from;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_PX) return;
      dragging = true;
      el.setPointerCapture(ev.pointerId);
      el.classList.add('dragging');
      start();
    }
    move(dx, ev);
  });
  const done = (): void => {
    from = undefined;
    el.classList.remove('dragging');
    // After the click this release makes, if it makes one.
    setTimeout(() => { dragging = false; });
  };
  el.addEventListener('pointerup', done);
  el.addEventListener('pointercancel', done);
  // In the capture phase: before the link or the button under the pointer hears of it.
  el.addEventListener('click', (ev) => {
    if (!dragging) return;
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  // A link and a picture have a drag of their own, which would take this one's place.
  el.addEventListener('dragstart', ev => ev.preventDefault());
}

// The ways along the wall beside its own scrolling by touch or trackpad: a drag on it, a
// wheel turned over it, an arrow at each end, and the rail (a press on a line-up's part
// goes to that line-up; a drag along it moves the wall with the pointer).
function wireWall(page: HTMLElement, key: string): void {
  const wall = page.querySelector<HTMLElement>('.wall')!;
  const scale = wall.querySelector<HTMLElement>('.wall-scale')!;
  const rail = page.querySelector<HTMLElement>('.wall-rail')!;
  const here = rail.querySelector<HTMLElement>('.rail-here')!;
  const back = page.querySelector<HTMLButtonElement>('.wall-nav.prev')!;
  const on = page.querySelector<HTMLButtonElement>('.wall-nav.next')!;
  const lineups = Array.from(wall.querySelectorAll<HTMLElement>('.lineup'));
  const parts = Array.from(rail.querySelectorAll<HTMLElement>('.rail-seg'));
  const suspects = Array.from(wall.querySelectorAll<HTMLElement>('.suspect'));

  // What the scale covers of the wall's left end is not showing.
  const edge = (): number => wall.scrollLeft + scale.offsetWidth;

  // The rail's marker and which of its parts is lit, the arrows, and the Sinner to come
  // back to. The first line-up starts where the wall does, so one is always passed.
  const sync = (): void => {
    if (!wall.isConnected) return;
    const span = wall.scrollWidth;
    here.style.left = `${wall.scrollLeft / span * 100}%`;
    here.style.width = `${wall.clientWidth / span * 100}%`;
    back.disabled = wall.scrollLeft < 1;
    on.disabled = wall.scrollLeft > span - wall.clientWidth - 1;
    const passed = lineups.filter(lineup => lineup.offsetLeft <= edge() + 1).length;
    parts.forEach((part, i) => part.classList.toggle('on', i === passed - 1));
    const first = suspects.find(s => s.offsetLeft + s.offsetWidth > edge());
    if (first) left = { wall: key, id: first.dataset.id!, into: (edge() - first.offsetLeft) / first.offsetWidth };
  };

  // By hand, as the site's other motion is: a browser's own smooth scroll is one of the
  // things the system's "less motion" switch turns off (Firefox's is). A later move, or the
  // reader taking the wall themselves, ends one under way.
  let run = 0;
  const glide = (to: number): void => {
    const from = wall.scrollLeft;
    const began = performance.now();
    const mine = ++run;
    const step = (now: number): void => {
      if (mine !== run) return;
      const done = Math.min(1, (now - began) / GLIDE_MS);
      wall.scrollLeft = from + (to - from) * (1 - (1 - done) ** 3);
      if (done < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const kept = left?.wall === key ? suspects.find(s => s.dataset.id === left!.id) : undefined;
  if (kept) wall.scrollLeft = kept.offsetLeft + left!.into * kept.offsetWidth - scale.offsetWidth;

  wall.addEventListener('scroll', sync, { passive: true });
  // A line-up's share of the rail is its share of the wall, which changes with the window:
  // a figure is as wide as the row is tall. Told once as the watching starts, too.
  new ResizeObserver(() => {
    lineups.forEach((lineup, i) => { parts[i].style.flexGrow = String(lineup.offsetWidth); });
    sync();
  }).observe(wall);

  // The page is the wall and little else, so a wheel turned over it moves along it. At
  // either end the turn is the page's again, for a window too short to show the wall whole.
  wall.addEventListener('wheel', (ev) => {
    if (ev.ctrlKey || ev.shiftKey || Math.abs(ev.deltaX) >= Math.abs(ev.deltaY)) return;
    const room = ev.deltaY > 0 ? wall.scrollWidth - wall.clientWidth - wall.scrollLeft : wall.scrollLeft;
    if (room < 1) return;
    ev.preventDefault();
    run++;
    wall.scrollLeft += ev.deltaY * (ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1);
  }, { passive: false });

  let from = 0;
  onDrag(wall, true, () => { run++; from = wall.scrollLeft; }, (dx) => { wall.scrollLeft = from - dx; });
  // The pointer is the middle of what shows.
  onDrag(rail, false, () => { run++; }, (_dx, ev) => {
    const box = rail.getBoundingClientRect();
    wall.scrollLeft = (ev.clientX - box.left) / box.width * wall.scrollWidth - wall.clientWidth / 2;
  });

  back.addEventListener('click', () => glide(wall.scrollLeft - wall.clientWidth * STEP));
  on.addEventListener('click', () => glide(wall.scrollLeft + wall.clientWidth * STEP));
  rail.addEventListener('click', (ev) => {
    const part = (ev.target as Element).closest<HTMLElement>('.rail-seg');
    if (part) glide(lineups[parts.indexOf(part)].offsetLeft - scale.offsetWidth);
  });
}

// A group's values as the roster has them, by name: nothing ranks a tag.
function distinct(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function mountPtn(container: HTMLElement): void {
  // The roster is in the reader's own choice, whatever a CN-only Sinner's page held.
  holdPtnLang(undefined);
  const sinners = getPtnSinners();
  // The section link is this roster, named in the language that is on.
  document.getElementById('nav-operators-label')!.textContent = t('Sinners');
  // For the browser to pick Chinese glyphs, and for the stylesheet's :lang(zh).
  document.documentElement.lang = ptnLang() === 'zh' ? 'zh-CN' : 'en';
  // Newest first, which is the order the page opens in by the owner's choice, and the
  // roster's own, rank and then name. Sinners released on one day keep the roster's order
  // among themselves; those only the CN server has go by the day they came to it.
  const orders: RosterOrder<PtnSinner>[] = [
    {
      id: 'newest',
      label: t('newest'),
      tip: t('newestTip'),
      compare: (a, b) => (b.released ?? UNRECORDED).localeCompare(a.released ?? UNRECORDED)
        || (b.releasedCn ?? '').localeCompare(a.releasedCn ?? ''),
    },
    { id: 'rank', label: t('rank') },
  ];
  mountRoster(container, {
    items: sinners,
    draw: drawWall,
    noun: t('sinners'),
    prompt: t('prompt'),
    words: { filters: t('filters'), clear: t('clear'), noResults: t('noResults'), tryOther: t('tryOther') },
    emptyNote: t('emptyNote'),
    // The game's own roster turns between its Sinners' mugshots and their original
    // illustrations, and so does this one. Mugshots first: in them every Sinner already
    // stands for a line-up, name board in hand, and nothing they carry is taller than they are.
    looks: { state: ptnRoster, options: [{ id: 'mugshot', label: t('mugshot') }, { id: 'original', label: t('original') }] },
    orders: { state: ptnRoster, options: orders },
    // The language, which changes what every part of the page says: the page is mounted
    // again. A tag is each wiki's own word, so the picks among them do not carry over.
    switches: [{
      name: 'Language',
      options: PTN_LANGS,
      on: ptnLang(),
      pick: (id) => {
        setPtnLang(id as PtnLang);
        delete ptnRoster.picks.tag;
        mountPtn(container);
      },
    }],
    // The groups the game's Chinese wiki filters its own roster by, laid out as it lays
    // them out: rank, tendency, libram by kind, limited, core damage, and the tags folded
    // away. A Sinner is found by either name or by number.
    find: {
      state: ptnRoster,
      text: s => `${s.name} ${s.nameCn ?? ''} ${codeOf(s)}`,
      filters: [
        {
          key: 'rank', label: t('fRank'), values: RANKS, look: 'badges', of: s => s.rank,
          text: rankName, icon: value => badgeOf('rank', value),
        },
        {
          key: 'tendency', label: t('fTendency'), values: TENDENCIES, look: 'badges', of: s => s.tendency,
          text: tendencyName, icon: value => badgeOf('tendency', value),
        },
        {
          key: 'libram', label: t('fLibram'), values: LIBRAM_SETS.flatMap(set => [...set.values]), look: 'badges', of: s => s.libram,
          text: libramName, icon: value => badgeOf('libram', value),
          sets: LIBRAM_SETS.map(set => ({ label: t(set.label), values: [...set.values] })),
        },
        {
          key: 'limited', label: t('fLimited'), values: ['standard', 'limited', 'collab'], look: 'badges',
          of: s => s.limited ?? 'standard', text: value => t(value as 'standard' | 'limited' | 'collab'),
        },
        {
          key: 'core', label: t('fCore'), values: ['none', 'has'], look: 'badges',
          of: s => (s.core ? 'has' : 'none'), text: value => t(value === 'has' ? 'coreHas' : 'coreNone'),
        },
        // Dozens of them, longer than everything above put together.
        { key: 'tag', label: t('fTags'), values: distinct(sinners.flatMap(tagsOf)), look: 'chips', of: tagsOf, folded: true },
      ],
    },
  });
}
