import './styles.scss';
import { applyRandomLogo } from './logo';
import { currentRoute, goHome, onRouteChange } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';

applyRandomLogo();

const view = document.getElementById('view')!;

function dispatch(): void {
  const route = currentRoute();
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
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
