import { applyRandomLogo, setLogoGame } from './logo';
import type { Route } from './router';
import { markSection } from './sections';
import { mountScrollbars } from './scrollbar';
import { mountTooltips } from './tooltip';
import { bindImageMirror } from '../shared/api/hella-api';

// The page around a view: the sidebar, the topbar and what they do. index.ts starts it and
// then routes by the hash; the pages Astro builds (site/) start it and mount their own view.

// The games: where each one's roster is, and its word for its cast, which is what the
// section link that leads there is called. A game's tile in the sidebar is #nav-<its name
// here>.
const GAMES = {
  arknights: { roster: '#/', cast: 'Operators' },
  endfield: { roster: '#/endfield', cast: 'Operators' },
  ptn: { roster: '#/ptn', cast: 'Sinners' },
  holodori: { roster: '#/holodori/holomems', cast: 'Talent' },
  fgo: { roster: '#/fgo', cast: 'Servants' },
};
type Game = keyof typeof GAMES;

// The game a page belongs to. Whatever is not another game's is Arknights', as it was
// before there were others, so a link made then still lands where it did.
function gameOf(page: Route['view']): Game {
  if (page === 'endfield' || page === 'endfield-detail') return 'endfield';
  if (page === 'ptn-detail') return 'ptn';
  if (page.startsWith('holodori')) return 'holodori';
  if (page === 'ptn' || page === 'fgo') return page;
  return 'arknights';
}

/** What happens once, when the page loads: the logo, the image mirror, tooltips, scrollbars and the drawer. */
export function initShell(): void {
  applyRandomLogo();
  bindImageMirror(document);
  mountTooltips();
  mountScrollbars();

  const sideToggle = document.getElementById('side-toggle')!;
  sideToggle.addEventListener('click', () => setDrawer(true));
  document.getElementById('side-close')!.addEventListener('click', () => setDrawer(false, true));
  document.getElementById('side-scrim')!.addEventListener('click', () => setDrawer(false, true));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('side-open')) setDrawer(false, true);
  });
  // Turned or widened past a phone's width, the drawer is the rail again: put it away, or the
  // page would be left inert behind a sidebar that no longer covers it.
  window.matchMedia('(max-width: 640px)').addEventListener('change', (e) => {
    if (!e.matches) setDrawer(false);
  });
}

/**
 * Sets the shell for the page about to be shown: its game's logo and tile, the section links,
 * the page marker the stylesheet keys on. Called before the page's view is mounted, and
 * again at every change of page.
 */
export function showShell(page: Route['view']): void {
  const operatorsLink = document.getElementById('nav-operators') as HTMLAnchorElement;
  const operatorsLabel = document.getElementById('nav-operators-label')!;
  const eventsLink = document.getElementById('nav-events')!;
  const songsLink = document.getElementById('nav-songs')!;
  const cardsLink = document.getElementById('nav-cards')!;
  const gachasLink = document.getElementById('nav-gachas')!;
  const homeLink = document.getElementById('nav-home')!;

  const game = gameOf(page);
  // Which page is showing, for the few rules that differ by it (the phone's count).
  document.body.dataset.view = page;
  setLogoGame(game);
  setDrawer(false);
  for (const name of Object.keys(GAMES)) {
    document.getElementById(`nav-${name}`)!.classList.toggle('active', name === game);
  }
  // The first section link is the roster of the game being shown, under that game's word
  // for its cast, and stays lit on a dossier, which is one of them. The schedule is
  // Arknights'; the other games have none to link to.
  operatorsLink.href = GAMES[game].roster;
  operatorsLabel.textContent = GAMES[game].cast;
  // A page in another language words the filter panel's Clear its own way (card.ts); the
  // Arknights and Endfield grids, which never word it, find it in English again.
  document.getElementById('clear-filters')!.textContent = 'Clear';
  // Path to Nowhere's Chinese side marks the page Chinese (views/ptn.ts); everything else is English.
  document.documentElement.lang = 'en';
  // hololive Dreams has its songs, cards and gachas beside its cast, as Arknights has its
  // schedule; Cards stays lit on a card's own page. Its front page is none of them.
  const own = ({
    events: eventsLink, 'holodori-songs': songsLink, 'holodori-cards': cardsLink, 'holodori-card': cardsLink,
    'holodori-gachas': gachasLink,
  } as
    Record<string, HTMLElement | undefined>)[page];
  const front = page === 'holodori-home';
  setCurrent(operatorsLink, !own && !front);
  setCurrent(eventsLink, own === eventsLink);
  setCurrent(songsLink, own === songsLink);
  setCurrent(cardsLink, own === cardsLink);
  setCurrent(gachasLink, own === gachasLink);
  setCurrent(homeLink, front);
  eventsLink.hidden = game !== 'arknights';
  songsLink.hidden = game !== 'holodori';
  cardsLink.hidden = game !== 'holodori';
  gachasLink.hidden = game !== 'holodori';
  homeLink.hidden = game !== 'holodori';
  markSection(front ? homeLink : own ?? operatorsLink);
}

function setCurrent(link: HTMLElement, on: boolean): void {
  link.classList.toggle('active', on);
  if (on) link.setAttribute('aria-current', 'page');
  else link.removeAttribute('aria-current');
}

// ── The games drawer (a phone's sidebar) ──
// Out from the left edge over a scrim. It closes on the scrim, its own close button,
// Escape, and any change of page, which is also how picking a game closes it.
// While it is out, the page behind it is inert, so Tab stays in the drawer and a screen
// reader reads only it.
function setDrawer(open: boolean, returnFocus = false): void {
  if (document.body.classList.contains('side-open') === open) return;
  const sideToggle = document.getElementById('side-toggle')!;
  document.body.classList.toggle('side-open', open);
  sideToggle.setAttribute('aria-expanded', String(open));
  for (const el of [document.querySelector<HTMLElement>('.topbar')!, document.getElementById('view')!]) el.inert = open;
  if (open) document.querySelector<HTMLElement>('.side-game.active')?.focus();
  else if (returnFocus) sideToggle.focus();
}

/**
 * A page that is not a roster puts the topbar's search box, its filters and the count away.
 * The views of such pages do it as they mount, and the pages built at build time call it.
 */
export function hideSearch(): void {
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';
}
