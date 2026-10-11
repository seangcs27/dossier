import './styles.scss';
import { applyRandomLogo } from './logo';
import { currentRoute, goHome, onRouteChange, type Route } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';
import { mountEvents } from './views/events';
import { mountEndfield } from './views/endfield';
import { mountEndfieldDetail } from './views/endfield-detail';
import { mountFgo } from './views/fgo';
import { mountHolodori } from './views/holodori';
import { mountPtn } from './views/ptn';
import { mountTooltips } from './tooltip';
import { mountScrollbars } from './scrollbar';
import { markSection } from './sections';

applyRandomLogo();
mountTooltips();
mountScrollbars();

const view = document.getElementById('view')!;
const operatorsLink = document.getElementById('nav-operators') as HTMLAnchorElement;
const operatorsLabel = document.getElementById('nav-operators-label')!;
const eventsLink = document.getElementById('nav-events')!;
const sideToggle = document.getElementById('side-toggle')!;

// The games: where each one's roster is, and its word for its cast, which is what the
// section link that leads there is called. A game's tile in the sidebar is #nav-<its name
// here>.
const GAMES = {
  arknights: { roster: '#/', cast: 'Operators' },
  endfield: { roster: '#/endfield', cast: 'Operators' },
  ptn: { roster: '#/ptn', cast: 'Sinners' },
  holodori: { roster: '#/holodori', cast: 'Holomems' },
  fgo: { roster: '#/fgo', cast: 'Servants' },
};
type Game = keyof typeof GAMES;

// The game a page belongs to. Whatever is not another game's is Arknights', as it was
// before there were others, so a link made then still lands where it did.
function gameOf(page: Route['view']): Game {
  if (page === 'endfield' || page === 'endfield-detail') return 'endfield';
  if (page === 'ptn' || page === 'holodori' || page === 'fgo') return page;
  return 'arknights';
}

function dispatch(): void {
  const route = currentRoute();
  const game = gameOf(route.view);
  // Which page is showing, for the few rules that differ by it (the phone's count).
  document.body.dataset.view = route.view;
  setDrawer(false);
  for (const name of Object.keys(GAMES)) {
    document.getElementById(`nav-${name}`)!.classList.toggle('active', name === game);
  }
  // The first section link is the roster of the game being shown, under that game's word
  // for its cast, and stays lit on a dossier, which is one of them. The schedule is
  // Arknights'; the other games have none to link to.
  operatorsLink.href = GAMES[game].roster;
  operatorsLabel.textContent = GAMES[game].cast;
  setCurrent(operatorsLink, route.view !== 'events');
  setCurrent(eventsLink, route.view === 'events');
  eventsLink.hidden = game !== 'arknights';
  markSection(route.view === 'events' ? eventsLink : operatorsLink);
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
  } else if (route.view === 'events') {
    mountEvents(view, route.tab);
  } else if (route.view === 'endfield-detail') {
    mountEndfieldDetail(view, route.id);
  } else if (route.view === 'endfield') {
    mountEndfield(view);
  } else if (route.view === 'ptn') {
    mountPtn(view);
  } else if (route.view === 'holodori') {
    mountHolodori(view);
  } else if (route.view === 'fgo') {
    mountFgo(view);
  } else {
    mountGrid(view);
  }
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
const behindDrawer = [document.querySelector<HTMLElement>('.topbar')!, view];

function setDrawer(open: boolean, returnFocus = false): void {
  if (document.body.classList.contains('side-open') === open) return;
  document.body.classList.toggle('side-open', open);
  sideToggle.setAttribute('aria-expanded', String(open));
  for (const el of behindDrawer) el.inert = open;
  if (open) document.querySelector<HTMLElement>('.side-game.active')?.focus();
  else if (returnFocus) sideToggle.focus();
}

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

// Every link to '#/' (the wordmark, the Arknights tile, Operators, a breadcrumb) is an
// ordinary link so middle-click and "open in new tab" still work; a plain click is taken
// over here to land on the bare URL instead of on '#/'.
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const link = (e.target as Element).closest?.('a[href="#/"]');
  if (!link) return;
  e.preventDefault();
  goHome();
  dispatch();
});

onRouteChange(dispatch);
dispatch();
