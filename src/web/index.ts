import './styles.scss';
import { applyRandomLogo } from './logo';
import { currentRoute, goHome, onRouteChange } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';
import { mountEvents } from './views/events';
import { mountEndfield } from './views/endfield';
import { mountTooltips } from './tooltip';
import { mountScrollbars } from './scrollbar';

applyRandomLogo();
mountTooltips();
mountScrollbars();

const view = document.getElementById('view')!;
const eventsLink = document.getElementById('nav-events')!;
const arknightsLink = document.getElementById('nav-arknights')!;
const endfieldLink = document.getElementById('nav-endfield')!;

function dispatch(): void {
  const route = currentRoute();
  const endfield = route.view === 'endfield';
  arknightsLink.classList.toggle('active', !endfield);
  endfieldLink.classList.toggle('active', endfield);
  // The schedule is Arknights'; the other game has none to link to.
  eventsLink.hidden = endfield;
  eventsLink.classList.toggle('active', route.view === 'events');
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
  } else if (route.view === 'events') {
    mountEvents(view, route.tab);
  } else if (endfield) {
    mountEndfield(view);
  } else {
    mountGrid(view);
  }
}

// The wordmark is an ordinary link so middle-click and "open in new tab" still work; a
// plain click is taken over here to land on the bare URL instead of on '#/'.
document.getElementById('home')?.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  goHome();
  dispatch();
});

onRouteChange(dispatch);
dispatch();
