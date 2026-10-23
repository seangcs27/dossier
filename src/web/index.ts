import './styles.scss';
import { currentRoute, goHome, onRouteChange } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';
import { mountEvents } from './views/events';
import { mountEndfield } from './views/endfield';
import { mountEndfieldDetail } from './views/endfield-detail';
import { mountFgo } from './views/fgo';
import { mountHolodori } from './views/holodori';
import { mountHolodoriCard } from './views/holodori-card';
import { mountHolodoriCards } from './views/holodori-cards';
import { mountHolodoriGachas } from './views/holodori-gachas';
import { mountHolodoriHome } from './views/holodori-home';
import { mountHolodoriHolomem } from './views/holodori-holomem';
import { mountHolodoriSongs } from './views/holodori-songs';
import { mountPtn } from './views/ptn';
import { mountPtnDetail } from './views/ptn-detail';
import { initShell, showShell } from './shell';

initShell();

const view = document.getElementById('view')!;

function dispatch(): void {
  const route = currentRoute();
  showShell(route.view);
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
  } else if (route.view === 'events') {
    mountEvents(view, route.tab);
  } else if (route.view === 'endfield-detail') {
    mountEndfieldDetail(view, route.id);
  } else if (route.view === 'endfield') {
    mountEndfield(view);
  } else if (route.view === 'ptn-detail') {
    mountPtnDetail(view, route.id);
  } else if (route.view === 'ptn') {
    mountPtn(view);
  } else if (route.view === 'holodori-home') {
    mountHolodoriHome(view);
  } else if (route.view === 'holodori-gachas') {
    mountHolodoriGachas(view);
  } else if (route.view === 'holodori') {
    mountHolodori(view);
  } else if (route.view === 'holodori-songs') {
    mountHolodoriSongs(view);
  } else if (route.view === 'holodori-cards') {
    mountHolodoriCards(view);
  } else if (route.view === 'holodori-holomem') {
    mountHolodoriHolomem(view, route.id);
  } else if (route.view === 'holodori-card') {
    mountHolodoriCard(view, route.id);
  } else if (route.view === 'fgo') {
    mountFgo(view);
  } else {
    mountGrid(view);
  }
}

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
