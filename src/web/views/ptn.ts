import { escHtml } from '../format';
import { mountRoster, newRosterState, type RosterOrder } from '../card';
import { getPtnSinners, type PtnSinner } from '../ptn-index';

// A rank's place among the site's rarity colours. S is the game's highest and takes 6, the
// site's red, as the highest does on every roster.
export const PTN_TIER: Record<PtnSinner['rank'], number> = { S: 6, A: 5, B: 4 };

// The game's three ranks, highest first: a line-up to each.
const RANKS: PtnSinner['rank'][] = ['S', 'A', 'B'];

// The game's six tendencies, in the order its own roster lists them.
const TENDENCIES = ['Endura', 'Fury', 'Umbra', 'Reticle', 'Arcane', 'Catalyst'];

// This page's search and picks, kept across visits, and which of the two pictures its wall
// is showing. A Sinner's dossier reads the last, to open on the same picture.
export const ptnRoster = newRosterState();

// The game's own roster turns between its Sinners' mugshots and their original
// illustrations, and so does this one. Mugshots first: in them every Sinner already stands
// for a line-up, name board in hand, and nothing they carry is taller than they are.
const PTN_LOOKS = [
  { id: 'mugshot', label: 'Mugshot' },
  { id: 'original', label: 'Original' },
];

// Newest first, which is the order the page opens in by the owner's choice, and the
// roster's own, rank and then name. Only the Sinners of 2024 on have a day to go by
// (PtnSinner.firstSeen); the rest follow them as the roster has them, which the switch's
// tooltip says, since the seam shows.
const PTN_ORDERS: RosterOrder<PtnSinner>[] = [
  {
    id: 'newest',
    label: 'Newest',
    tip: 'Newest first, by when each Sinner was first seen. Sinners from before 2024 have no date and follow by rank.',
    compare: (a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''),
  },
  { id: 'rank', label: 'Rank' },
];

// ── The wall ──
// The roster is MBCC's line-up room, not a grid of cards: every Sinner stands whole on a
// floor line, against a wall ruled every 10 cm, at the height their file gives (_ptn.scss
// draws the wall and does the scaling; here a figure only says how tall it is). Under each
// is the placard a card's lines moved to. Rank is no longer a colour: it is which line-up
// a Sinner stands in.

// What the wall stands a Sinner at when their file gives no height, which none lacks today:
// the roster's median.
const USUAL_CM = 166;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-10-02' as a placard prints it: 'Oct 2026'. The day is the wiki's, not the game's,
// and a month is as fine as it can be trusted.
function monthOf(day: string): string {
  const [year, month] = day.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// One Sinner on the wall. `dated` is a line-up in order of arrival, where the placard's
// last line gives the month in place of the tendency and libram.
function suspectHtml(s: PtnSinner, look: string, dated: boolean): string {
  // The two with no original stand as their mugshot under either look.
  const figure = (look === 'original' && s.figureOriginal) || s.figure;
  const cm = s.height ?? USUAL_CM;
  // The picture's shape is known before the picture is, so the figure's place is held, and
  // outlined until it comes (.stand.in). Pine, with no picture at all, stays an outline.
  const stand = figure
    ? `<span class="stand" data-cm="${cm}">
         <img class="fig" src="${escHtml(figure.art)}" alt="" loading="lazy" decoding="async"
              style="aspect-ratio: ${figure.ratio}" onload="this.parentNode.classList.add('in')">
       </span>`
    : `<span class="stand none" data-cm="${cm}"><span class="fig">No photograph on file</span></span>`;
  const kind = dated && s.firstSeen ? `First seen ${monthOf(s.firstSeen)}` : `${s.tendency} · ${s.libram}`;
  return `
    <a class="suspect" href="#/ptn/sinner/${encodeURIComponent(s.id)}" style="--cm: ${cm}">
      ${stand}
      <span class="plate">
        <span class="plate-no">MBCC-S-${escHtml(s.number)}</span>
        <span class="plate-name">${escHtml(s.name)}</span>
        <span class="plate-rank" aria-hidden="true">${s.rank}</span>
        <span class="plate-kind">${escHtml(kind)}</span>
        <span class="visually-hidden">Rank ${s.rank}, ${cm} cm</span>
      </span>
    </a>
  `;
}

interface Lineup {
  title: string;
  sinners: PtnSinner[];
  dated?: boolean;
}

// The line-ups a page is made of, each with someone in it. By rank there is one to a rank,
// which is the order the roster comes in. Newest first there are two: those with a day to
// go by, and the rest, who are not all old (Pine has no pictures to date) and so are not
// called that.
function lineupsOf(sinners: PtnSinner[], order: string): Lineup[] {
  const lineups: Lineup[] = order === 'newest'
    ? [
      { title: 'Arrivals since 2024', sinners: sinners.filter(s => s.firstSeen), dated: true },
      { title: 'No arrival on file', sinners: sinners.filter(s => !s.firstSeen) },
    ]
    : RANKS.map(rank => ({ title: `Line-up ${rank}`, sinners: sinners.filter(s => s.rank === rank) }));
  return lineups.filter(lineup => lineup.sinners.length);
}

// All of them at once, unlike the cards, which are dealt in batches: a figure is a link, a
// picture and a placard, a tenth of a card's markup, and its picture waits to be scrolled to.
function drawWall(page: HTMLElement, sinners: PtnSinner[], look: string, order: string): void {
  page.innerHTML = lineupsOf(sinners, order).map((lineup, i) => `
    <section class="lineup" aria-labelledby="lineup-${i}">
      <header class="lineup-head">
        <h2 id="lineup-${i}">${escHtml(lineup.title)}</h2>
        <p class="lineup-count">${lineup.sinners.length} standing</p>
      </header>
      <div class="wall">${lineup.sinners.map(s => suspectHtml(s, look, !!lineup.dated)).join('')}</div>
    </section>
  `).join('');
}

// A group's values as the roster has them, by name: nothing ranks a libram or a tag.
function distinct(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function mountPtn(container: HTMLElement): void {
  const sinners = getPtnSinners();
  mountRoster(container, {
    items: sinners,
    draw: drawWall,
    noun: 'sinners',
    emptyNote: 'The last build could not reach the Path to Nowhere wiki.',
    looks: { state: ptnRoster, options: PTN_LOOKS },
    // With no day on any Sinner the build could not reach the wiki's upload dates, and
    // there is one order only.
    orders: sinners.some(s => s.firstSeen) ? { state: ptnRoster, options: PTN_ORDERS } : undefined,
    // The groups the game's Chinese wiki filters its own roster by (rank, tendency, faction,
    // tags), as far as the English one has them. A Sinner is found by name or by number.
    find: {
      state: ptnRoster,
      text: s => `${s.name} MBCC-S-${s.number}`,
      filters: [
        { key: 'rank', label: 'Rank', values: RANKS, look: 'ranks', tier: r => PTN_TIER[r as PtnSinner['rank']], of: s => s.rank },
        { key: 'tendency', label: 'Tendency', values: TENDENCIES, look: 'tiles', across: 3, of: s => s.tendency },
        { key: 'libram', label: 'Libram', values: distinct(sinners.map(s => s.libram)), look: 'chips', of: s => s.libram },
        // 47 of them, longer than everything above it put together.
        { key: 'tag', label: 'Tags', values: distinct(sinners.flatMap(s => s.tags)), look: 'chips', of: s => s.tags, folded: true },
      ],
    },
  });
}
