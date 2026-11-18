import { escHtml } from '../format';
import {
  gachaLogoUrl, getHolodoriCards, getHolodoriGachas, getHolodoriSongs, getHolodoriTalent, type HolodoriSong,
} from '../holodori-index';
import { getHolodoriAnnouncements, type HolodoriAnnouncement } from '../holodori-news';
import { CAKE } from './holodori-calendar-html';
import { birthdayText, daysAway, daysToBirthday, faceOf, holomemLinkAttrs, MONTHS, nextBirthday, ordinal, today } from './holodori-format';
import { bannerHtml, isLive } from './holodori-gachas-html';
import { songBackTemplatesHtml, songTileHtml } from './holodori-songs-html';

// hololive Dreams' front page (#/holodori), where its tile in the sidebar lands: a way into
// each of its four pages and its calendar, then what is going on in the game now (the gachas running, the
// birthdays coming) and its newest songs. In the game's world (_holodori.scss). No DOM and
// no window: the view and the pages built at build time (site/) draw from this.

// How many birthdays, how many debut anniversaries, how many of the newest songs and how many announcements it shows.
const BIRTHDAYS = 6;
const ANNIVERSARIES = 6;
const NEWEST = 6;
const ANNOUNCED = 8;

const cast = getHolodoriTalent();
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

// The next debut anniversaries from `day`, built as the birthdays are, with a seal on each
// face: hololive's triangle with which anniversary it is on it. A debut's day of the year is asked of the birthday helpers, and its "in N days"
// carries the birthdays' hook, so freshen() sets it the same way.
function anniversariesHtml(day: Date): string {
  const soon = cast
    .map((c) => {
      const born = { birthday: c.debut.slice(5) };
      return { c, born, years: nextBirthday(born, day).getFullYear() - Number(c.debut.slice(0, 4)) };
    })
    // A debut still to come is not an anniversary.
    .filter(a => a.years > 0)
    .sort((a, b) => daysToBirthday(a.born, day) - daysToBirthday(b.born, day))
    .slice(0, ANNIVERSARIES);
  return `
      <section class="hm-section">
        <h3 class="hm-head">Upcoming Anniversaries</h3>
        <ul class="hh-bdays">${soon.map(({ c, born, years }) => {
          const days = daysToBirthday(born, day);
          const { src } = faceOf(c);
          return `
          <li><a class="hh-bday${days === 0 ? ' today' : ''}" ${holomemLinkAttrs(c)} style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
            <span class="hh-face"><span class="hh-icon">${src ? `<img src="${escHtml(src)}" alt="" width="128" height="128" loading="lazy" decoding="async" onerror="this.remove()">` : `<b aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</b>`}</span><i class="hh-seal${years > 9 ? ' wide' : ''}" aria-hidden="true"><i style="-webkit-mask-image: url(icons/games/holodori.webp); mask-image: url(icons/games/holodori.webp)"></i><b>${years}<small>${ordinal(years).slice(String(years).length)}</small></b></i></span>
            <span class="hh-bday-name">${escHtml(c.shortName)}</span>
            <span class="hh-bday-when">${ordinal(years)} anniversary</span>
            <span class="hh-bday-when">${birthdayText(born)} · <span data-bday="${born.birthday}">${daysAway(days)}</span></span>
          </a></li>`;
        }).join('')}
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

// The tile into the calendar: the faces of the next four birthdays and debut anniversaries, and
// who is next with the days to go (the birthdays' hook, so freshen() sets it).
function calendarLinkHtml(day: Date): string {
  const dates = cast.flatMap((c) => {
    const debut = { birthday: c.debut.slice(5) };
    const years = nextBirthday(debut, day).getFullYear() - Number(c.debut.slice(0, 4));
    return [{ c, born: { birthday: c.birthday }, what: 'birthday' },
      ...(years > 0 ? [{ c, born: debut, what: `${ordinal(years)} anniversary` }] : [])];
  }).sort((a, b) => daysToBirthday(a.born, day) - daysToBirthday(b.born, day)).slice(0, 4);
  const [next] = dates;
  return `
    <a class="hh-link calendar" href="#/holodori/calendar">
      <span class="hh-pics icons" aria-hidden="true">${dates.flatMap(d => faceOf(d.c).src ?? []).map(src => `<img src="${escHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">`).join('')}</span>
      <span class="hh-name">Calendar</span>
      ${next ? `<span class="hh-next">Next: ${escHtml(next.c.shortName)}'s ${next.what} · <span data-bday="${next.born.birthday}">${daysAway(daysToBirthday(next.born, day))}</span></span>` : ''}
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
      <a class="hh-guide" href="#/holodori/mahjong">
        <b lang="ja">ホロじゃん</b>
        <span><strong>New: Holojan, hololive's mahjong game, out 25 November.</strong> How to pre-register and how to play</span>
      </a>
      <nav class="hh-links" aria-label="hololive Dreams">
        ${linkHtml('#/holodori/holomems', cast.length, 'Talent', cast.slice(0, 4).flatMap(c => faceOf(c).src ?? []), 'icons')}
        ${linkHtml('#/holodori/songs', songs.length, 'Songs', newest.slice(0, 3).flatMap(s => s.jacket ?? []), 'jackets')}
        ${linkHtml('#/holodori/cards', cards.length, 'Characters', newCards.flatMap(c => c.art ?? []), 'cards')}
        ${linkHtml('#/holodori/gachas', banners.length, 'Gacha Banners', banners.slice(0, 2).map(g => gachaLogoUrl(g.gachas[0])), 'logos')}
        ${calendarLinkHtml(day)}
      </nav>
      ${live.length ? `
        <section class="hm-section">
          <h3 class="hm-head">Gachas Running Now <small>${live.length}</small></h3>
          <div class="gacha-list">${live.map(g => bannerHtml(g, now)).join('')}</div>
        </section>` : ''}${newsHtml(announced)}
      <section class="hm-section">
        <h3 class="hm-head">Upcoming Birthdays</h3>
        <ul class="hh-bdays">${soon.map((c) => {
          const days = daysToBirthday(c, day);
          const { src } = faceOf(c);
          return `
          <li><a class="hh-bday${days === 0 ? ' today' : ''}" ${holomemLinkAttrs(c)} style="--a: ${escHtml(c.colors[0] ?? '#18c9f0')}">
            <span class="hh-face"><span class="hh-icon">${src ? `<img src="${escHtml(src)}" alt="" width="128" height="128" loading="lazy" decoding="async" onerror="this.remove()">` : `<b aria-hidden="true">${escHtml([...c.shortName][0] ?? '?')}</b>`}</span><i class="hh-mark" aria-hidden="true">${CAKE}</i></span>
            <span class="hh-bday-name">${escHtml(c.shortName)}</span>
            <span class="hh-bday-when">${birthdayText(c)} · <span data-bday="${c.birthday}">${daysAway(days)}</span></span>
          </a></li>`;
        }).join('')}
        </ul>
      </section>${anniversariesHtml(day)}
      <section class="hm-section">
        <h3 class="hm-head">New Songs</h3>
        <ul class="song-grid">${newest.map(s => songTileHtml(s, disc)).join('')}</ul>
      </section>
      ${backs ? songBackTemplatesHtml(newest) : ''}
    </div>
  `;
}
