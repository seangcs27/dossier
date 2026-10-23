import { escHtml } from '../format';
import {
  gachaLogoUrl, getHolodoriCards, getHolodoriCharacters, getHolodoriGachas, getHolodoriSongs, type HolodoriSong,
} from '../holodori-index';
import { birthdayText, daysAway, daysToBirthday, today } from './holodori-format';
import { bannerHtml, isLive } from './holodori-gachas-html';
import { songBackTemplatesHtml, songTileHtml } from './holodori-songs-html';

// hololive Dreams' front page (#/holodori), where its tile in the sidebar lands: a way into
// each of its four pages, then what is going on in the game now (the gachas running, the
// birthdays coming) and its newest songs. In the game's world (_holodori.scss). No DOM and
// no window: the view and the pages built at build time (site/) draw from this.

// How many birthdays, and how many of the newest songs, it shows.
const BIRTHDAYS = 6;
const NEWEST = 6;

const cast = getHolodoriCharacters();
const songs = getHolodoriSongs();
const cards = getHolodoriCards();
const gachas = getHolodoriGachas();

// A tile into one of the game's pages: its count and name over a few of its pictures, of
// one kind (icons, jackets, cards or logos), which sets how they are framed.
function linkHtml(href: string, count: number, name: string, pics: string[], kind: string): string {
  return `
    <a class="hh-link" href="${href}">
      <span class="hh-pics ${kind}" aria-hidden="true">${pics.map(src => `<img src="${escHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`).join('')}</span>
      <span class="hh-count">${count}</span>
      <span class="hh-name">${name}</span>
    </a>
  `;
}

/** How the page is drawn: `disc` as songTileHtml takes it, and `backs` to carry the songs' backs in `<template>`s. */
export interface HomeOptions {
  disc?: (song: HolodoriSong) => string;
  backs?: boolean;
}

/** The page's body, as of `now` (ms). */
export function homeHtml(now: number, { disc, backs }: HomeOptions = {}): string {
  const live = gachas.filter(g => isLive(g, now));
  const day = today(new Date(now));
  const soon = [...cast].sort((a, b) => daysToBirthday(a, day) - daysToBirthday(b, day)).slice(0, BIRTHDAYS);
  const newest = [...songs].sort((a, b) => b.added.localeCompare(a.added)).slice(0, NEWEST);
  const newCards = cards.slice(-3).reverse();
  const banners = gachas.filter(g => g.from);

  return `
    <div class="roster-page hh-page">
      <header class="hd-head">
        <h2 class="hd-title">hololive Dreams</h2>
        <p class="hd-sub">Cover's rhythm game · its holomems, songs, cards and gachas</p>
      </header>
      <nav class="hh-links" aria-label="hololive Dreams">
        ${linkHtml('#/holodori/holomems', cast.length, 'Holomems', cast.slice(0, 4).flatMap(c => c.icon ?? []), 'icons')}
        ${linkHtml('#/holodori/songs', songs.length, 'Songs', newest.slice(0, 3).flatMap(s => s.jacket ?? []), 'jackets')}
        ${linkHtml('#/holodori/cards', cards.length, 'Cards', newCards.flatMap(c => c.art ?? []), 'cards')}
        ${linkHtml('#/holodori/gachas', banners.length, 'Gachas', banners.slice(0, 2).map(g => gachaLogoUrl(g.gachas[0])), 'logos')}
      </nav>
      ${live.length ? `
        <section class="hm-section">
          <h3 class="hm-head">Gachas running now <small>${live.length}</small></h3>
          <div class="gacha-list">${live.map(g => bannerHtml(g, now)).join('')}</div>
        </section>` : ''}
      <section class="hm-section">
        <h3 class="hm-head">Birthdays coming</h3>
        <ul class="hh-bdays">${soon.map((c) => {
          const days = daysToBirthday(c, day);
          return `
          <li><a class="hh-bday${days === 0 ? ' today' : ''}" href="#/holodori/holomem/${encodeURIComponent(c.id)}" style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
            <span class="hh-icon">${c.icon ? `<img src="${escHtml(c.icon)}" alt="" width="128" height="128" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>
            <span class="hh-bday-name">${escHtml(c.shortName)}</span>
            <span class="hh-bday-when">${birthdayText(c)} · <span data-bday="${c.birthday}">${daysAway(days)}</span></span>
          </a></li>`;
        }).join('')}
        </ul>
      </section>
      <section class="hm-section">
        <h3 class="hm-head">Newest songs</h3>
        <ul class="song-grid">${newest.map(s => songTileHtml(s, disc)).join('')}</ul>
        <p class="hm-note"><a href="#/holodori/songs">Every song</a></p>
      </section>
      <p class="hd-credit">Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a> · Gachas: <a href="https://holodori.best/gachas" target="_blank" rel="noopener">holodori.best</a></p>
      ${backs ? songBackTemplatesHtml(newest) : ''}
    </div>
  `;
}
