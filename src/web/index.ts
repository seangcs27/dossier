import './styles.scss';
import { applyRandomLogo } from './logo';
import { currentRoute, goHome, onRouteChange } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';
import { mountEvents } from './views/events';
import { mountEndfield } from './views/endfield';
import { mountEndfieldDetail } from './views/endfield-detail';
import { mountTooltips } from './tooltip';
import { mountScrollbars } from './scrollbar';

applyRandomLogo();
mountTooltips();
mountScrollbars();

const view = document.getElementById('view')!;
const operatorsLink = document.getElementById('nav-operators') as HTMLAnchorElement;
const eventsLink = document.getElementById('nav-events')!;
const arknightsLink = document.getElementById('nav-arknights')!;
const endfieldLink = document.getElementById('nav-endfield')!;
const sideToggle = document.getElementById('side-toggle')!;

function dispatch(): void {
  const route = currentRoute();
  const endfield = route.view === 'endfield' || route.view === 'endfield-detail';
  // Which page is showing, for the few rules that differ by it (the phone's count).
  document.body.dataset.view = route.view;
  setDrawer(false);
  arknightsLink.classList.toggle('active', !endfield);
  endfieldLink.classList.toggle('active', endfield);
  // Operators is the roster of the game being shown, and stays lit on a dossier, which is
  // one of its operators. The schedule is Arknights'; the other game has none to link to.
  operatorsLink.href = endfield ? '#/endfield' : '#/';
  setCurrent(operatorsLink, route.view !== 'events');
  setCurrent(eventsLink, route.view === 'events');
  eventsLink.hidden = endfield;
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
  } else if (route.view === 'events') {
    mountEvents(view, route.tab);
  } else if (route.view === 'endfield-detail') {
    mountEndfieldDetail(view, route.id);
  } else if (endfield) {
    mountEndfield(view);
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
