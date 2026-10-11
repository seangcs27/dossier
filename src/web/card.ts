import { escHtml } from './format';
import { mountCardSpin } from './card-spin';

/**
 * One card on the roster of a game that has a roster and nothing else yet: the plate the
 * Arknights grid deals (views/grid.ts has the reasoning behind each layer), with the game's
 * own words in its slots. It opens nothing, since there is no page for it to open.
 */
export interface RosterCard {
  id: string;           // printed on the back, and the micro line's tooltip
  name: string;
  epithet?: string;     // the line under the name, where an Arknights alter's epithet goes
  tier: number;         // 1 to 6, the rarity colour; 6 is the site's red, a game's highest
  // What stands on the rarity tab, a character to a line and six at most: '★★★★★', 'S'.
  marks: string;
  // The tab as a screen reader is to say it, since the tab itself is hidden from one and
  // is not a rarity on every roster: 'Rarity: 5', 'Rank S', 'Debuted in 2020'.
  marksLabel: string;
  label: string;        // the class line
  serial: string;       // the micro line under it
  edge: string;         // the word repeated up the edge strip; never empty
  tags: string[];       // on the back
  // The picture: a 1:2 bust fills the plate as the Arknights portraits do. Without one the
  // plate shows the name's first letter where the picture would be.
  art?: string;
}

function buildCard(card: RosterCard): string {
  // As many repeats as fill the strip, the same sum as the Arknights card's.
  const edgeText = Array(Math.max(2, Math.round(55 / (card.edge.length + 3))))
    .fill(card.edge).join(' · ');
  // The tab's cut edges, seen once the card is turned, are drawn for a tab of one to six
  // lines, under the class an Arknights card has for its rarity (styles.scss). Here the
  // lines and the colour are two things, a 5★ Servant being five lines in the top colour:
  // the class is the number of lines, and the colour it would also set is given by hand.
  const lines = Math.min(6, Math.max(1, [...card.marks].length));
  return `
    <div class="op-card r${card.tier}">
      <div class="op-plate">
      <div class="op-card-body">
        ${card.art
          ? `<img class="op-avatar" src="${escHtml(card.art)}" alt="${escHtml(card.name)}" loading="lazy"
                  onerror="this.outerHTML='<div class=\\'op-avatar-placeholder\\'>?</div>'">`
          : `<div class="op-avatar-placeholder">${escHtml([...card.name][0] ?? '?')}</div>`}
        <div class="op-shade" aria-hidden="true"></div>
        <div class="op-overlay">
          <span class="visually-hidden">${escHtml(card.marksLabel)}</span>
          <div class="op-info">
            <div class="op-name">${escHtml(card.name)}</div>
            <div class="op-epithet">${card.epithet ? escHtml(card.epithet) : '&nbsp;'}</div>
            <div class="op-meta-row">
              <span class="op-class-label">${escHtml(card.label)}</span>
            </div>
            <div class="op-serial" data-tip="${escHtml(card.id)}">
              <span class="op-serial-text">${escHtml(card.serial)}</span>
            </div>
          </div>
        </div>
        <div class="op-edge" aria-hidden="true">${escHtml(edgeText)}</div>
        <div class="op-light" aria-hidden="true"></div>
      </div>
      <div class="op-card-back" aria-hidden="true">
        ${card.art ? `<img class="op-avatar op-avatar-ghost" data-src="${escHtml(card.art)}" alt="" onerror="this.remove()">` : ''}
        <div class="op-shade"></div>
        <div class="op-back-frost"></div>
        <div class="op-back-print">
          <div class="bk-head"><span class="bk-serial">${escHtml(card.id)}</span></div>
          <div class="bk-mid"></div>
          <div class="bk-foot">
            <div class="bk-tags">${card.tags.map(t => `<span class="bk-tag">${escHtml(t)}</span>`).join('')}</div>
          </div>
        </div>
        <div class="op-edge op-edge-back">${escHtml(edgeText)}</div>
        <div class="op-light"></div>
      </div>
      <div class="op-side op-side-l" aria-hidden="true"></div>
      <div class="op-side op-side-r" aria-hidden="true"></div>
      <div class="op-stars r${lines}" style="color: var(--r${card.tier})" aria-hidden="true">
        <div class="op-tab-slice op-tab-front"></div>
        <div class="op-tab-slice op-tab-back"></div>
        <div class="op-tab-edge op-tab-edge-top"></div>
        <div class="op-tab-edge op-tab-edge-right"></div>
        <div class="op-tab-edge op-tab-edge-taper"></div>
        <div class="op-tab-edge op-tab-edge-bottom"></div>
        ${[...card.marks].map(m => `<span>${escHtml(m)}</span>`).join('')}
      </div>
      </div>
    </div>
  `;
}

// Cards are built in batches as the page nears the end of what exists, as the Arknights
// grid's are (grid.ts has the measurements): one of these rosters is several hundred cards.
const BATCH = 48;
let more: IntersectionObserver | undefined;

/**
 * Shows a roster and nothing else: the count in the topbar's pill, then the cards, in the
 * order given. `noun` is what the game calls its cast, in the plural ('sinners'); `emptyNote`
 * is what the page says when the build had nothing to bake.
 */
export function mountRoster(container: HTMLElement, cards: RosterCard[], noun: string, emptyNote: string): void {
  more?.disconnect();
  // The search box and its filters are the Arknights and Endfield grids', as on a dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;

  // The word is in a span of its own for a phone to drop (styles.scss, .count-noun).
  document.getElementById('count')!.innerHTML =
    `${cards.length} <span class="count-noun">${escHtml(noun)}</span>`;
  if (cards.length === 0) {
    container.innerHTML = `<div class="state-msg"><div class="label">No ${escHtml(noun)}</div>${escHtml(emptyNote)}</div>`;
    return;
  }
  container.innerHTML = `<div id="grid"></div><div id="grid-end"></div>`;
  const grid = document.getElementById('grid')!;
  const end = document.getElementById('grid-end')!;
  let shown = 0;
  const append = (): void => {
    const batch = document.createElement('template');
    batch.innerHTML = cards.slice(shown, shown += BATCH).map(buildCard).join('');
    mountCardSpin(batch.content);
    grid.append(batch.content);
  };
  append();
  if (shown >= cards.length) return;
  const observer = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    append();
    // Re-observing reports the marker's position afresh, so a tall screen keeps filling
    // until the marker is out of range, rather than waiting for a scroll that won't come.
    observer.unobserve(end);
    if (shown < cards.length) observer.observe(end);
  }, { rootMargin: '1500px' });
  observer.observe(end);
  more = observer;
}
