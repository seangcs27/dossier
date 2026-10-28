import { escHtml } from '../format';
import {
  gachaLogoUrl, getHolodoriCards, getHolodoriCharacters, getHolodoriGachas, getHolodoriSongs, type HolodoriSong,
} from '../holodori-index';
import { getHolodoriAnnouncements, type HolodoriAnnouncement } from '../holodori-news';
import { birthdayText, daysAway, daysToBirthday, MONTHS, today } from './holodori-format';
import { bannerHtml, isLive } from './holodori-gachas-html';
import { songBackTemplatesHtml, songTileHtml } from './holodori-songs-html';

// hololive Dreams' front page (#/holodori), where its tile in the sidebar lands: a way into
// each of its four pages, then what is going on in the game now (the gachas running, the
// birthdays coming) and its newest songs. In the game's world (_holodori.scss). No DOM and
// no window: the view and the pages built at build time (site/) draw from this.

// How many birthdays, how many of the newest songs and how many announcements it shows.
const BIRTHDAYS = 6;
const NEWEST = 6;
const ANNOUNCED = 8;

const cast = getHolodoriCharacters();
const songs = getHolodoriSongs();
const cards = getHolodoriCards();
const gachas = getHolodoriGachas();
// The newest ANNOUNCED, but never without the newest Steam post: the Lab's days would push a
// patch off the page. A patch is older than them, so it takes the last place.
function shownAnnouncements(): HolodoriAnnouncement[] {
  const all = getHolodoriAnnouncements();
  const shown = all.slice(0, ANNOUNCED);
  const patch = all.find(a => a.from === 'steam');
  return patch && !shown.includes(patch) ? [...shown.slice(0, ANNOUNCED - 1), patch] : shown;
}
const announced = shownAnnouncements();

const SOURCE_NAME = { lab: 'Lab', steam: 'Steam' };

// An announcement's day in Japan, '2026-10-27', as "27 Oct". It is the same on every reader's
// clock, so it carries no hook for freshen().
function announcedDay(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS[month - 1].slice(0, 3)}`;
}

// What the game has announced lately: each a headline linking its official post.
function newsHtml(list: HolodoriAnnouncement[]): string {
  if (!list.length) return '';
  return `
      <section class="hm-section">
        <h3 class="hm-head">Announcements <small>Japan time</small></h3>
        <ul class="hh-news">${list.map(a => `
          <li>
            <time datetime="${a.date}">${announcedDay(a.date)}</time>
            <a href="${escHtml(a.url)}" target="_blank" rel="noopener">${escHtml(a.title)}</a>
            <span class="hh-news-from">${SOURCE_NAME[a.from]}</span>
          </li>`).join('')}
        </ul>
      </section>`;
}

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
        </section>` : ''}${newsHtml(announced)}
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
      <p class="hd-credit">Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a> · Gachas: <a href="https://holodori.best/gachas" target="_blank" rel="noopener">holodori.best</a>${announced.length ? ' · Announcements: <a href="https://dreams.wf-calc.net/wiki/game-updates?lang=en" target="_blank" rel="noopener">hololive Dreams Lab</a>, <a href="https://store.steampowered.com/news/app/4282500" target="_blank" rel="noopener">Steam</a>' : ''}</p>
      ${backs ? songBackTemplatesHtml(newest) : ''}
    </div>
  `;
}
