import { mountRoster, newRosterState, type RosterFilter } from '../card';
import { escHtml } from '../format';
import { getHolodoriCards, getHolodoriCharacters, type HolodoriCard, type HolodoriCharacter } from '../holodori-index';

// hololive Dreams' cards (#/holodori/cards): every card the game has, three or four to a
// holomem, as its portrait in a frame of its rarity with its name and type. A card opens
// its own page (holodori-card.ts). In the album's world (_holodori.scss).

const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4.1 4.5.5-3.3 3 .9 4.4L8 11.3l-4 2.2.9-4.4-3.3-3 4.5-.5z"></path></svg>';

const cards = getHolodoriCards();
const cast = getHolodoriCharacters();
const byId = new Map(cast.map(c => [c.id, c]));
// Her number in the album, and a card's place in the order the game added them.
const no = new Map(cast.map((c, i) => [c.id, i]));
const place = new Map(cards.map((c, i) => [c.id, i]));
const branches = [...new Set(cast.map(c => c.branch))];
const types = [...new Set(cards.map(c => c.type).filter(Boolean))];
const state = newRosterState();

/** The game's markup in a skill's text: a raised number, and a type named. */
export function skillHtml(text: string): string {
  return escHtml(text)
    .replace(/\[highlight\]([\s\S]*?)\[\/highlight\]/g, '<b class="hl">$1</b>')
    .replace(/\[attribute=([a-z]+)\]([\s\S]*?)\[\/attribute\]/g, '<span class="type-word type-$1">$2</span>');
}

export const starsHtml = (n: number): string => STAR.repeat(n);

export function tileHtml(card: HolodoriCard): string {
  const c = byId.get(card.holomem);
  return `
    <li class="hcard r${card.rarity}">
      <a class="hcard-face" href="#/holodori/card/${encodeURIComponent(card.id)}"
         aria-label="${escHtml(`${card.name}, ${c?.name ?? ''}, ${card.rarity} stars${card.type ? `, ${card.type} type` : ''}`)}"
         style="--a: ${escHtml(c?.colors[0] ?? '#18c9f0')}">
        <span class="hcard-art">
          <span class="hcard-initial" aria-hidden="true">${escHtml([...(c?.shortName ?? '?')][0] ?? '?')}</span>
          ${card.art ? `<img src="${escHtml(card.art)}" alt="" width="256" height="363" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
        </span>
        <span class="hcard-stars" aria-hidden="true">${starsHtml(card.rarity)}</span>
        ${card.type ? `<em class="hcard-type type-${card.type.toLowerCase()}" aria-hidden="true">${escHtml(card.type)}</em>` : ''}
      </a>
      <p class="hcard-name">${escHtml(card.name)}</p>
      <p class="hcard-who">${escHtml(c?.shortName ?? '')}</p>
    </li>
  `;
}

function draw(page: HTMLElement, items: HolodoriCard[]): void {
  page.innerHTML = `
    <header class="hd-head">
      <h2 class="hd-title">Cards</h2>
      <p class="hd-sub">Every card in the game · open one for its stats, skills and voice lines</p>
    </header>
    <ul class="hcard-grid">${items.map(tileHtml).join('')}</ul>
    <p class="hd-credit">Art: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s CDN · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
  `;
}

const holomemOf = (card: HolodoriCard): HolodoriCharacter | undefined => byId.get(card.holomem);

export function mountHolodoriCards(container: HTMLElement): void {
  const filters: RosterFilter<HolodoriCard>[] = [
    { key: 'rarity', label: 'Rarity', values: ['5', '4', '3'], look: 'chips', text: v => `${v} stars`, of: card => String(card.rarity) },
    { key: 'type', label: 'Type', values: types, look: 'chips', of: card => card.type },
    { key: 'branch', label: 'Branch', values: branches, look: 'chips', of: card => holomemOf(card)?.branch ?? '' },
    {
      key: 'holomem', label: 'Holomem', values: cast.map(c => c.shortName), look: 'chips', folded: true,
      of: card => holomemOf(card)?.shortName ?? '',
      sets: branches.map(b => ({ label: b, values: cast.filter(c => c.branch === b).map(c => c.shortName) })),
    },
  ];
  mountRoster(container, {
    items: cards,
    draw,
    orders: {
      state,
      options: [
        { id: 'new', label: 'Newest', compare: (a, b) => place.get(b.id)! - place.get(a.id)! },
        { id: 'holomem', label: 'Holomem', compare: (a, b) => (no.get(a.holomem) ?? 0) - (no.get(b.holomem) ?? 0) || b.rarity - a.rarity },
        { id: 'rarity', label: 'Rarity', compare: (a, b) => b.rarity - a.rarity },
      ],
    },
    noun: 'cards',
    emptyNote: 'The last build could not reach the game data on GitHub.',
    find: {
      state,
      text: card => `${card.name} ${holomemOf(card)?.name ?? ''} ${holomemOf(card)?.shortName ?? ''} ${card.outfit}`,
      filters,
    },
  });
}
