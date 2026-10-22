import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { getFgoServants, type FgoServant } from '../fgo-index';

// Fate/Grand Order's roster, the owner's pick of 22 October 2026: the summoning circle of
// one direction with the Saint Graph cards of another. The circle is the way in, the seven
// knight classes on its inner ring and the Extra classes round the outside, with every
// Servant at its centre; beside it, the class picked as the game's own frames, bronze for
// one and two stars, silver for three, gold for four and five, as its Spirit Origin List
// draws them. The search, the filters and the order are card.ts's, and the circle counts
// what they leave.

// Kept across visits, as every roster's search and picks are, with the class picked.
const state = newRosterState();
let picked = '';   // a class, or '' for every Servant

const KNIGHTS = ['Saber', 'Archer', 'Lancer', 'Rider', 'Caster', 'Assassin', 'Berserker'];
const EXTRAS = ['Shielder', 'Ruler', 'Avenger', 'Alter Ego', 'Moon Cancer', 'Foreigner', 'Pretender', 'Beast'];

// The three Beasts the game lets you have are each a class of their own in its data
// ('Beast', 'Beast Eresh', 'Un Beast Olga Marie'); one Beast on the circle holds all three.
const classOf = (s: FgoServant): string => (s.class.includes('Beast') ? 'Beast' : s.class);

type Metal = 'gold' | 'silver' | 'bronze';
const metalOf = (rarity: number): Metal => (rarity >= 4 ? 'gold' : rarity === 3 ? 'silver' : 'bronze');

// A place on a ring, in percent of the circle: `turn` is the fraction of the way round from
// the top, clockwise.
function onRing(turn: number, radius: number): string {
  const a = turn * 2 * Math.PI;
  return `left: ${(50 + radius * Math.sin(a)).toFixed(2)}%; top: ${(50 - radius * Math.cos(a)).toFixed(2)}%`;
}

function circleHtml(counts: Map<string, number>, total: number): string {
  const button = (name: string, kind: 'knight' | 'extra', place: string): string => {
    const n = counts.get(name) ?? 0;
    const on = picked === name;
    return `
      <button type="button" class="fg-class fg-${kind}${on ? ' on' : ''}" data-class="${escHtml(name)}"
              aria-pressed="${on}" style="${place}"${n ? '' : ' disabled'}>
        <span class="fg-class-name">${escHtml(name)}</span><span class="fg-class-count">${n}</span>
      </button>`;
  };
  return `
    <div class="fg-circle">
      <span class="fg-ring fg-ring-outer" aria-hidden="true"></span>
      <span class="fg-ring fg-ring-dash" aria-hidden="true"></span>
      <span class="fg-ring fg-ring-inner" aria-hidden="true"></span>
      ${KNIGHTS.map((_, i) => `<span class="fg-spoke" aria-hidden="true" style="transform: rotate(${(i + 0.5) * 360 / 7}deg)"></span>`).join('')}
      <button type="button" class="fg-core${picked ? '' : ' on'}" data-class="" aria-pressed="${!picked}">
        <span class="fg-core-count">${total}</span><span class="fg-core-label">Heroic Spirits</span>
      </button>
      ${KNIGHTS.map((name, i) => button(name, 'knight', onRing(i / 7, 30.5))).join('')}
      ${EXTRAS.map((name, i) => button(name, 'extra', onRing((i + 0.5) / 8, 45.5))).join('')}
    </div>
  `;
}

// A Servant on the game's frame: the metal of their rarity round the figure, their class
// over it and their stars under it, then the number and the name. 'Altria Pendragon
// (Alter)' is one Altria of several, and what is in the brackets goes on a line of its own;
// the eight summoned under another name first have that name there instead.
function cardHtml(s: FgoServant): string {
  const variant = /^(.+) \((.+)\)$/.exec(s.name);
  const name = variant ? variant[1] : s.name;
  const second = variant ? variant[2] : s.alias;
  const metal = metalOf(s.rarity);
  return `
    <article class="fg-card" aria-label="${escHtml(s.name)}">
      <div class="fg-frame fg-${metal}">
        <div class="fg-art">
          <img src="${escHtml(s.art)}" alt="" loading="lazy" onerror="this.remove()">
          <span class="fg-card-class">${escHtml(s.class)}</span>
          <span class="fg-stars" role="img" aria-label="${s.rarity} ${s.rarity === 1 ? 'star' : 'stars'}">${'★'.repeat(s.rarity) || '0'}</span>
        </div>
      </div>
      <div class="fg-card-no">No. ${String(s.collectionNo).padStart(3, '0')}${s.jpOnly ? ' · <span class="fg-jp">JP</span>' : ''}</div>
      <div class="fg-card-name">${escHtml(name)}</div>
      ${second ? `<div class="fg-card-variant">${escHtml(second)}</div>` : ''}
    </article>
  `;
}

const heading = (name: string, count: number, level: 'h1' | 'h2'): string => `
  <div class="fg-heading">
    <span class="fg-diamond" aria-hidden="true"></span>
    <${level} class="fg-title">${escHtml(name)}</${level}>
    <span class="fg-heading-count">${count} ${count === 1 ? 'Servant' : 'Servants'}</span>
    <span class="fg-heading-rule" aria-hidden="true"></span>
  </div>`;

// Every Servant the search and the filters leave, in the order the switch is on: the class
// picked, or every class in the circle's order with a heading to each.
function drawFgo(page: HTMLElement, items: FgoServant[]): void {
  const counts = new Map<string, number>();
  for (const s of items) counts.set(classOf(s), (counts.get(classOf(s)) ?? 0) + 1);
  // A class the search has emptied is no longer the one shown.
  if (picked && !counts.get(picked)) picked = '';
  const shown = picked ? items.filter(s => classOf(s) === picked) : items;
  document.getElementById('count')!.innerHTML =
    `${shown.length} <span class="count-noun">${shown.length === 1 ? 'servant' : 'servants'}</span>`;
  document.getElementById('search-count')!.textContent = String(shown.length);

  const list = picked
    ? `${heading(picked, shown.length, 'h1')}<div class="fg-grid">${shown.map(cardHtml).join('')}</div>`
    : `<h1 class="visually-hidden">Every Servant</h1>${[...KNIGHTS, ...EXTRAS].filter(c => counts.get(c)).map(c => `
        <section class="fg-section">
          ${heading(c, counts.get(c)!, 'h2')}
          <div class="fg-grid">${items.filter(s => classOf(s) === c).map(cardHtml).join('')}</div>
        </section>`).join('')}`;

  page.innerHTML = `
    <div class="fg-page">
      <section class="fg-throne" aria-label="Classes">
        <div class="fg-kicker">Throne of Heroes</div>
        ${circleHtml(counts, items.length)}
      </section>
      <div class="fg-list">${list}</div>
    </div>
  `;
  page.onclick = (ev) => {
    const el = (ev.target as Element).closest<HTMLButtonElement>('[data-class]');
    if (!el || el.disabled) return;
    picked = el.dataset.class!;
    drawFgo(page, items);
    page.querySelector<HTMLElement>(`[data-class="${CSS.escape(picked)}"]`)?.focus();
    // The list's head into view, where a long list had been scrolled past the circle.
    const list = page.querySelector<HTMLElement>('.fg-list')!;
    if (list.getBoundingClientRect().top < 0) list.scrollIntoView({ block: 'start' });
  };
}

const SERVERS = ['NA & JP', 'JP only'];

const FILTERS: RosterFilter<FgoServant>[] = [
  {
    key: 'rarity', label: 'Rarity', look: 'ranks', values: ['5', '4', '3', '2', '1', '0'],
    text: v => `${v}★`, tier: v => Number(v) + 1, of: s => String(s.rarity),
  },
  { key: 'attribute', label: 'Attribute', look: 'chips', values: ['Human', 'Sky', 'Earth', 'Star', 'Beast'], of: s => s.attribute },
  {
    key: 'alignment', label: 'Alignment', look: 'chips',
    values: ['Lawful', 'Neutral', 'Chaotic', 'Good', 'Balanced', 'Evil', 'Madness', 'Summer'],
    of: s => s.alignment,
  },
  { key: 'server', label: 'Server', look: 'chips', values: SERVERS, of: s => (s.jpOnly ? SERVERS[1] : SERVERS[0]) },
];

export function mountFgo(container: HTMLElement): void {
  mountRoster(container, {
    items: getFgoServants(),
    draw: drawFgo,
    orders: {
      state,
      options: [
        { id: 'number', label: 'Number' },
        { id: 'rarity', label: 'Rarity', compare: (a, b) => b.rarity - a.rarity },
        { id: 'name', label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
      ],
    },
    noun: 'servants',
    emptyNote: 'The last build could not reach Atlas Academy.',
    find: {
      state,
      text: s => `${s.name} ${s.alias ?? ''} ${s.collectionNo}`,
      filters: FILTERS,
    },
  });
}
