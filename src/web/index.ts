import { currentRoute, onRouteChange } from './router';
import { mountGrid } from './views/grid';
import { mountDetail } from './views/detail';

const view = document.getElementById('view')!;

function dispatch(): void {
  const route = currentRoute();
  if (route.view === 'detail') {
    void mountDetail(view, route.id);
  } else {
    void mountGrid(view);
  }
}

onRouteChange(dispatch);
dispatch();
