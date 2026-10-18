import { escHtml } from '../format';
import { gachaLogoUrl, getHolodoriCards, getHolodoriGachas, type HolodoriGacha } from '../holodori-index';
import { tileHtml as cardTile } from './holodori-cards';

// hololive Dreams' gachas (#/holodori/gachas): every banner the record has
// (scripts/lib/holodori-gachas.mjs), as its logo, its dates in the reader's own clock and
// the cards it features, each opening its page. Running now first, then the past ones,
// then the gachas that are always there. In the game's world (_holodori.scss).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_MS = 3_600_000;

const gachas = getHolodoriGachas();
const cardById = new Map(getHolodoriCards().map(c => [c.id, c]));

const dated = (g: HolodoriGacha): boolean => Boolean(g.from && g.to);
/** A dated banner the reader's clock has not yet seen end: running, or still to start. */
export const isLive = (g: HolodoriGacha, now: number): boolean => dated(g) && now <= Date.parse(g.to!);

const two = (n: number): string => String(n).padStart(2, '0');

// '7 Oct 2026, 10:00', in the reader's own time zone.
function whenText(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}

// '2d 5h' or '5h 12m', rounded down.
function spanText(ms: number): string {
  const h = Math.floor(ms / HOUR_MS);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.floor((ms % HOUR_MS) / 60_000)}m`;
}

function statusText(g: HolodoriGacha, now: number): string {
  if (g.standing) return 'Always on';
  if (g.beginner) return 'Once per player';
  const from = Date.parse(g.from!);
  const to = Date.parse(g.to!);
  if (now < from) return `Starts in ${spanText(from - now)}`;
  return now <= to ? `Ends in ${spanText(to - now)}` : 'Ended';
}

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
          <p class="gacha-status">${escHtml(statusText(g, now))}</p>
          <h3 class="gacha-name">${escHtml(g.name)}</h3>
          ${dated(g) ? `<p class="gacha-dates">${whenText(g.from!)} – ${whenText(g.to!)}</p>` : ''}
          ${g.gachas.length > 1 ? '<p class="gacha-note">Also as a “Take your pick!” gacha, on the same cards</p>' : ''}
        </div>
      </div>
      ${cards.length ? `<ul class="hcard-grid gacha-cards">${cards.map(cardTile).join('')}</ul>` : ''}
    </article>
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

export function mountHolodoriGachas(container: HTMLElement): void {
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const now = Date.now();
  container.innerHTML = `
    <div class="roster-page">
      <header class="hd-head">
        <h2 class="hd-title">Gachas</h2>
        <p class="hd-sub">Every banner since August 2026, with the cards it features · times are your own clock's</p>
      </header>
      ${gachas.length ? `
        ${groupHtml('Running now', gachas.filter(g => isLive(g, now)), now)}
        ${groupHtml('Always on', gachas.filter(g => !dated(g)), now)}
        ${groupHtml('Past banners', gachas.filter(g => dated(g) && !isLive(g, now)), now)}
      ` : '<div class="state-msg"><div class="label">No gachas</div>The last build had no record of them.</div>'}
      <p class="hd-credit">Names, dates and cards: <a href="https://holodori.best/gachas" target="_blank" rel="noopener">holodori.best</a>, recorded by hand · Logos: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a>'s CDN</p>
    </div>
  `;
}
