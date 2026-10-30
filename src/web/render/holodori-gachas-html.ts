import { escHtml } from '../format';
import {
  gachaLogoUrl, getHolodoriCards, getHolodoriGachas, getHolodoriPreviews, type HolodoriGacha, type HolodoriPreview,
} from '../holodori-index';
import { previewText, whenText, windowText } from './clock-text';
import { cardTileHtml } from './holodori-cards-html';

// hololive Dreams' gachas: every banner the record has (scripts/lib/holodori-gachas.mjs), as
// its logo, its dates in the reader's own clock and the cards it features. No DOM and no
// window: the view and the pages built at build time (site/) draw from this. What the
// reader's clock decides (a status, a date in their time zone) is marked with data-*
// attributes, which fresh.ts sets again in the browser.

const HOUR_MS = 3_600_000;

const gachas = getHolodoriGachas();
const cardById = new Map(getHolodoriCards().map(c => [c.id, c]));

// A banner with a start; the newest read from the dump has no end yet, and runs until it has.
export const dated = (g: HolodoriGacha): boolean => Boolean(g.from) && !g.standing && !g.beginner;
/** A dated banner the reader's clock has not yet seen end: running, or still to start. */
export const isLive = (g: HolodoriGacha, now: number): boolean => dated(g) && (!g.to || now <= Date.parse(g.to));

const whenHtml = (iso: string): string => `<time data-when="${iso}">${whenText(iso)}</time>`;

function statusText(g: HolodoriGacha, now: number): string {
  if (g.standing) return 'Always on';
  if (g.beginner) return 'Once per player';
  return windowText(Date.parse(g.from!), g.to ? Date.parse(g.to) : undefined, now);
}

// A status that follows the clock says its window, for fresh.ts.
const statusAttrs = (g: HolodoriGacha): string =>
  g.standing || g.beginner ? '' : ` data-gacha-from="${g.from}"${g.to ? ` data-gacha-to="${g.to}"` : ''}`;

/** One banner: its logo, name, status and dates, and the cards it features. */
export function bannerHtml(g: HolodoriGacha, now: number): string {
  const cards = g.pickup.flatMap(id => cardById.get(id) ?? []);
  const live = isLive(g, now);
  return `
    <article class="gacha${live ? ' live' : ''}">
      <div class="gacha-head">
        <span class="gacha-logo">
          <img src="${escHtml(gachaLogoUrl(g.gachas[0]))}" alt="" width="205" height="128" loading="lazy" decoding="async" onerror="this.remove()">
        </span>
        <div class="gacha-info">
          <p class="gacha-status"${statusAttrs(g)}>${escHtml(statusText(g, now))}</p>
          <h3 class="gacha-name">${escHtml(g.name)}</h3>
          ${dated(g) ? `<p class="gacha-dates">${whenHtml(g.from!)} – ${g.to ? whenHtml(g.to) : 'end to be announced'}</p>` : ''}
          ${g.gachas.length > 1 ? '<p class="gacha-note">Also as a “Take your pick!” gacha, on the same cards</p>' : ''}
        </div>
      </div>
      ${cards.length ? `<ul class="hcard-grid gacha-cards">${cards.map(cardTileHtml).join('')}</ul>` : ''}
    </article>
  `;
}

// The announced ★5s whose gacha the record does not have yet, one card to an opening time:
// the record's banner for that hour takes its place once it is written.
function upcomingHtml(now: number): string {
  const recorded = gachas.filter(dated).map(g => Date.parse(g.from!));
  const byStart = new Map<string, HolodoriPreview[]>();
  for (const p of getHolodoriPreviews()) {
    if (recorded.some(t => Math.abs(t - Date.parse(p.from)) < HOUR_MS)) continue;
    byStart.set(p.from, [...(byStart.get(p.from) ?? []), p]);
  }
  if (!byStart.size) return '';
  const cards = [...byStart].map(([from, list]) => {
    return `
      <article class="gacha live">
        <div class="gacha-head">
          <div class="gacha-info">
            <p class="gacha-status" data-preview-from="${from}">${previewText(Date.parse(from), now)}</p>
            <h3 class="gacha-name">New ★5 Members</h3>
            <p class="gacha-dates">From ${whenHtml(from)}</p>
            <ul class="gacha-previews">${list.map(p => `
              <li>★5 [${escHtml(p.card)}] ${escHtml(p.holomem)}${p.source ? ` · <a href="${escHtml(p.source)}" target="_blank" rel="noopener">Announcement</a>` : ''}</li>`).join('')}
            </ul>
          </div>
        </div>
      </article>
    `;
  });
  return `
    <section class="hm-section">
      <h3 class="hm-head">Announced <small>${byStart.size}</small></h3>
      <div class="gacha-list compact">${cards.join('')}</div>
    </section>
  `;
}

function groupHtml(title: string, list: HolodoriGacha[], now: number): string {
  if (!list.length) return '';
  return `
    <section class="hm-section">
      <h3 class="hm-head">${title} <small>${list.length}</small></h3>
      <div class="gacha-list${list.some(g => g.pickup.length) ? '' : ' compact'}">${list.map(g => bannerHtml(g, now)).join('')}</div>
    </section>
  `;
}

/** The Gachas page's body. */
export function gachasPageHtml(now: number): string {
  return `
    <div class="roster-page">
      <header class="hd-head">
        <h2 class="hd-title">Gacha Banner</h2>
        <p class="hd-sub">Every banner since August 2026, with the cards it features · times are your own clock's</p>
      </header>
      ${upcomingHtml(now)}
      ${gachas.length ? `
        ${groupHtml('Running now', gachas.filter(g => isLive(g, now)), now)}
        ${groupHtml('Always on', gachas.filter(g => !dated(g)), now)}
        ${groupHtml('Past banners', gachas.filter(g => dated(g) && !isLive(g, now)), now)}
      ` : '<div class="state-msg"><div class="label">No gachas</div>The last build had no record of them.</div>'}
      <p class="hd-credit">Names, dates and cards: <a href="https://holodori.best/gachas" target="_blank" rel="noopener">holodori.best</a>, recorded by hand, and the game's own data (<a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s dump) for a banner newer than that record · Announced ★5s: the official posts, as <a href="https://dreams.wf-calc.net/wiki/game-updates?lang=en" target="_blank" rel="noopener">hololive Dreams Lab</a> collects them · Logos: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s CDN</p>
    </div>
  `;
}
