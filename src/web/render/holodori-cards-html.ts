import { escHtml } from '../format';
import { getHolodoriCharacters, type HolodoriCard } from '../holodori-index';

// A card as hololive Dreams' pages show it: its portrait in a frame of its rarity with its
// name and type. No DOM and no window: the views and the pages built at build time (site/)
// draw from this.

const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4.1 4.5.5-3.3 3 .9 4.4L8 11.3l-4 2.2.9-4.4-3.3-3 4.5-.5z"></path></svg>';

const byId = new Map(getHolodoriCharacters().map(c => [c.id, c]));

/** The game's markup in a skill's text: a raised number, and a type named. */
export function skillHtml(text: string): string {
  return escHtml(text)
    .replace(/\[highlight\]([\s\S]*?)\[\/highlight\]/g, '<b class="hl">$1</b>')
    .replace(/\[attribute=([a-z]+)\]([\s\S]*?)\[\/attribute\]/g, '<span class="type-word type-$1">$2</span>');
}

export const starsHtml = (n: number): string => STAR.repeat(n);

export function cardTileHtml(card: HolodoriCard): string {
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
