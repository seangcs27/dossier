import { crumbsHtml, escHtml } from '../format';
import {
  getHolodoriCards, getHolodoriCharacters, getHolodoriSongs, type HolodoriCharacter, type HolodoriSong,
} from '../holodori-index';
import { cardTileHtml } from './holodori-cards-html';
import {
  birthdayText, daysAway, daysToBirthday, debutText, debutYears, groupsOf, no, today,
} from './holodori-format';
import { songBackTemplatesHtml, songTileHtml } from './holodori-songs-html';

// A holomem's own page (#/holodori/holomem/<id>): her whole key art on her colours beside
// her profile, then her cards, each opening its own page, the songs she sings, each
// turning over as on the Songs page, and her membership stickers.
// In the album's world (_holodori.scss). No DOM and no window: the view and the pages built
// at build time (site/) draw from this.

// The width her key art is asked of the game site's image host at: the stage's, doubled.
const FIGURE_W = 720;

const cast = getHolodoriCharacters();
const cards = getHolodoriCards();
const songs = getHolodoriSongs();
// Songs the whole cast sings name nobody, and are counted on her page rather than listed.
const everyone = songs.filter(s => !s.cast.length).length;

function stepHtml(c: HolodoriCharacter, rel: 'prev' | 'next'): string {
  const arrow = rel === 'prev' ? '<path d="M10 3.5L5.5 8l4.5 4.5"></path>' : '<path d="M6 3.5L10.5 8 6 12.5"></path>';
  return `
    <a class="hm-step ${rel}" href="#/holodori/holomem/${encodeURIComponent(c.id)}" rel="${rel}"
       aria-label="${rel === 'prev' ? 'Previous' : 'Next'}: No. ${no(c)} ${escHtml(c.name)}">
      <svg viewBox="0 0 16 16" aria-hidden="true">${arrow}</svg>
      <span><small>No. ${no(c)}</small>${escHtml(c.shortName)}</span>
    </a>
  `;
}

/** Whether the album has her. */
export const knowsHolomem = (id: string): boolean => cast.some(c => c.id === id);

/** How the page is drawn: `disc` as songTileHtml takes it, and `backs` to carry the songs' backs in `<template>`s. */
export interface HolomemOptions {
  disc?: (song: HolodoriSong) => string;
  backs?: boolean;
}

/** Her page's body as of `now` (ms), or the page that says nobody has this id. */
export function holomemHtml(id: string, now: number, { disc, backs }: HolomemOptions = {}): string {
  const i = cast.findIndex(c => c.id === id);
  const c = cast[i];
  if (!c) {
    return `
      <div class="roster-page hm-page">
        ${crumbsHtml(undefined, '#/holodori/holomems', 'Holomems')}
        <div class="state-msg"><div class="label">Unknown holomem</div>Nobody in the album is <code>${escHtml(id)}</code>.</div>
      </div>
    `;
  }
  const day = today(new Date(now));
  const own = cards.filter(k => k.holomem === c.id).sort((a, b) => b.rarity - a.rarity);
  const sung = songs.filter(s => s.cast.includes(c.id));
  const figure = c.figure ? `${c.figure}?fm=webp&w=${FIGURE_W}` : c.art;
  // When her birthday is from today, and how long since her debut: what the reader's clock decides.
  const facts: [string, string][] = [
    ['Birthday', `${escHtml(birthdayText(c, true))} · <span data-bday="${c.birthday}">${daysAway(daysToBirthday(c, day))}</span>`],
    ['Debut', `${escHtml(debutText(c))} · <span data-debut="${c.debut}">${debutYears(c.debut, day)}</span>`],
    ['Fans', escHtml(c.fanName)],
  ];
  return `
    <div class="roster-page hm-page" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}; --b: ${escHtml(c.colors[1] ?? c.colors[0] ?? '#2e7be6')}">
      <div class="hm-trail">
        ${crumbsHtml(c.name, '#/holodori/holomems', 'Holomems')}
        <nav class="hm-steps" aria-label="Other holomems">
          ${stepHtml(cast[(i - 1 + cast.length) % cast.length], 'prev')}
          ${stepHtml(cast[(i + 1) % cast.length], 'next')}
        </nav>
      </div>
      <section class="hm-top">
        <div class="hm-stage${c.figure ? '' : ' bust'}">
          <div class="hm-rays" aria-hidden="true">${c.colors.map(x => `<i style="background: ${escHtml(x)}"></i>`).join('')}</div>
          ${figure ? `<img src="${escHtml(figure)}" alt="${escHtml(c.name)}" decoding="async" onerror="this.remove()">` : ''}
        </div>
        <div class="hm-profile">
          <p class="hm-no">No. ${no(c)} · ${escHtml(groupsOf(c).join(' · '))}</p>
          <h2 class="lettered hm-name">${escHtml(c.name)}</h2>
          <p class="hm-branch">${escHtml(c.branch)}</p>
          ${c.greeting ? `<blockquote class="hm-hello">“${escHtml(c.greeting)}”</blockquote>` : ''}
          <dl class="hm-facts">
            ${facts.filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
            <div><dt>Colours</dt><dd class="hm-colours">${c.colors.map(x => `<span><i style="background: ${escHtml(x)}"></i>${escHtml(x)}</span>`).join('')}</dd></div>
          </dl>
        </div>
      </section>
      <section class="hm-section" aria-labelledby="hm-cards">
        <h3 class="hm-head" id="hm-cards">Her cards <small>${own.length}</small></h3>
        ${own.length ? `<ul class="hcard-grid">${own.map(cardTileHtml).join('')}</ul>` : '<p class="hm-none">No cards yet</p>'}
      </section>
      <section class="hm-section" aria-labelledby="hm-songs">
        <h3 class="hm-head" id="hm-songs">Songs she sings <small>${sung.length}</small></h3>
        ${sung.length ? `<ul class="song-grid">${sung.map(s => songTileHtml(s, disc)).join('')}</ul>` : '<p class="hm-none">No songs of her own yet</p>'}
        <p class="hm-note">and the ${everyone} songs the whole cast sings · <a href="#/holodori/songs">every song</a></p>
      </section>
      ${c.stickers.length ? `
      <section class="hm-section" aria-labelledby="hm-stickers">
        <h3 class="hm-head" id="hm-stickers">Membership stickers <small>${c.stickers.length}</small></h3>
        <ul class="hm-stickers">${c.stickers.map(s => `
          <li><img src="${escHtml(s.art)}" alt="" width="256" height="256" loading="lazy" decoding="async" onerror="this.remove()"><span>${escHtml(s.name)}</span></li>`).join('')}
        </ul>
      </section>` : ''}
      <p class="hd-credit">Picture: <a href="https://www.hololive-dreams.com/en/holomem" target="_blank" rel="noopener">hololive Dreams official site</a> · Stickers: HolodoriDB's CDN · Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a></p>
      ${backs ? songBackTemplatesHtml(sung) : ''}
    </div>
  `;
}
