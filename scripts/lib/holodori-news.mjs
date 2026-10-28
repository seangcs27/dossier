// The announcements on hololive Dreams' front page: a headline, its day and a link to the
// official post, from two sources a build can read.
//
// hololive Dreams Lab (https://dreams.wf-calc.net/wiki/game-updates), a fan site, collects the
// game's announcements by date on a server-rendered page: an <h2> for the day, then an <h3>
// headline, a summary and a "Source:" line for each, the line linking the official X post.
// Its robots.txt allows a crawl, and the build already reads it for the upcoming ★5s. Only
// the headline and the link are taken. The headlines are the Lab's wording, not the game's.
//
// Steam's news feed for the game (appid 4282500), which takes no key: the patch notes, a post
// each, linked at their page on the store.
//
// A day is Japan's: the Lab dates its headings that way, and a Steam post's time is put on it.

import { fetchJson, timedFetch } from './fetch.mjs';

const LAB_PAGE = 'https://dreams.wf-calc.net/wiki/game-updates?lang=en';
const STEAM_NEWS = 'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4282500&count=40&maxlength=1&format=json';
const STEAM_POST = 'https://store.steampowered.com/news/app/4282500/view';
// The feed the game's own posts come in; a third party's news about it arrives in the same
// answer under a feed name of its own.
const STEAM_OWN_FEED = 'steam_community_announcements';

// How many, newest first, the file keeps.
const KEEP = 40;
// How many of them are Steam's newest, kept in any case.
const STEAM_KEPT = 3;
const JST_MS = 9 * 3_600_000;
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december'];

// The game's own accounts and sites, most wanted first: the English account over the Japanese.
// A Lab item is kept only if its source line links one of them.
const OFFICIAL = [
  /^https:\/\/x\.com\/holo_dreams_en\//i,
  /^https:\/\/x\.com\/hololive_dreams\//i,
  /^https:\/\/(?:www\.)?hololive-dreams\.com\//i,
  /^https:\/\/qualiarts\.jp\//i,
  /^https:\/\/(?:www\.)?cover-corp\.com\//i,
];

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&amp;': '&' };
// One pass, so "&amp;lt;" comes out "&lt;" and not "<".
const decode = s => s.replace(/&(?:lt|gt|quot|#39|#x27|amp);/g, e => ENTITIES[e]);
const text = html => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const jstDay = ms => new Date(ms + JST_MS).toISOString().slice(0, 10);

// A date heading's id, "october-27-2026" (or "september-22-2026-2" for a day it has twice),
// as a day; null for any other heading.
function headingDay(id) {
  const m = id?.match(/^([a-z]+)-(\d+)-(\d{4})(?:-\d+)?$/);
  const month = m ? MONTHS.indexOf(m[1]) + 1 : 0;
  return month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

/** The Lab page's announcements, in the order it gives them (newest day first). */
export function parseLab(html) {
  const list = [];
  let day = null;
  let dropped = 0;
  // The page's headings and the paragraphs under each <h3>, in order.
  for (const m of html.matchAll(/<h2([^>]*)>|<h3[^>]*>(.*?)<\/h3>(.*?)(?=<h[23]|$)/gs)) {
    if (m[1] !== undefined) {
      // Any heading but a date ends the day: the page closes with a timeline and its sources,
      // which are not the last day's.
      day = headingDay(m[1].match(/id="([^"]*)"/)?.[1]);
      continue;
    }
    const title = text(m[2]);
    if (!day || !title) continue;
    const source = m[3].match(/<p>Sources?:(.*?)<\/p>/s)?.[1] ?? '';
    const links = [...source.matchAll(/href="([^"]+)"/g)].map(l => decode(l[1]));
    const url = OFFICIAL.map(official => links.find(l => official.test(l))).find(Boolean);
    if (url) list.push({ date: day, title, url, from: 'lab' });
    else dropped++;
  }
  if (dropped) console.warn(`holodori: ${dropped} hololive Dreams Lab announcements dropped for linking no official post`);
  return list;
}

/** Steam's news answer for the game: its own posts, each linked at its page on the store. */
export function parseSteam(json) {
  return json.appnews.newsitems
    .filter(n => n.feedname === STEAM_OWN_FEED)
    .map(n => ({ date: jstDay(n.date * 1000), title: n.title.trim(), url: `${STEAM_POST}/${n.gid}`, from: 'steam' }));
}

/**
 * Both sources, newest first. Either failing throws, and so does a Lab page with nothing in it
 * (its markup has changed): the caller keeps the last whole file rather than a half-fresh one.
 */
export async function buildAnnouncements() {
  const [res, steam] = await Promise.all([timedFetch(LAB_PAGE), fetchJson(STEAM_NEWS)]);
  if (!res.ok) throw new Error(`hololive Dreams Lab ${res.status}`);
  const lab = parseLab(await res.text());
  if (!lab.length) throw new Error('hololive Dreams Lab names no announcement; has its page changed?');
  const byDay = (a, b) => b.date.localeCompare(a.date);
  const posts = parseSteam(steam).sort(byDay);
  // The newest patch notes stay whatever the Lab's days push out of the 40: they come far less often.
  const rest = [...lab, ...posts.slice(STEAM_KEPT)].sort(byDay).slice(0, KEEP - STEAM_KEPT);
  return [...posts.slice(0, STEAM_KEPT), ...rest].sort(byDay);
}
