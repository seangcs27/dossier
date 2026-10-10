export type Route =
  | { view: 'grid' }
  | { view: 'detail'; id: string }
  | { view: 'events'; tab: EventsTab }
  | { view: 'endfield' }
  | { view: 'endfield-detail'; id: string };

// The Events page's tabs: #/events is the list of events, and the other two hang off it.
export type EventsTab = 'list' | 'pools' | 'calendar';

export function parseHash(hash: string): Route {
  const m = /^#\/op\/([^/]+)$/.exec(hash);
  if (m && m[1]) return { view: 'detail', id: decodeURIComponent(m[1]) };
  const ev = /^#\/events(?:\/(pools|calendar))?$/.exec(hash);
  if (ev) return { view: 'events', tab: (ev[1] ?? 'list') as EventsTab };
  // The second game. Everything outside this prefix is Arknights', as it was before there
  // were two, so links made then still land where they did.
  if (hash === '#/endfield') return { view: 'endfield' };
  const ef = /^#\/endfield\/op\/([^/]+)$/.exec(hash);
  if (ef) return { view: 'endfield-detail', id: decodeURIComponent(ef[1]) };
  return { view: 'grid' };
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

export function onRouteChange(handler: (route: Route) => void): void {
  const fire = (): void => handler(currentRoute());
  window.addEventListener('hashchange', fire);
  // goHome() navigates with the history API rather than the hash, and that fires popstate
  // instead — including when the visitor presses Back afterwards.
  window.addEventListener('popstate', fire);
}

/**
 * Goes to the grid and leaves a clean address behind: /dossier/ rather than /dossier/#/.
 * Setting `location.hash = ''` would leave a bare '#' hanging on the URL, so the hash is
 * dropped through the history API instead. That fires no hashchange, so the caller
 * re-renders; Back still works, because this pushes an entry.
 */
export function goHome(): void {
  history.pushState(null, '', window.location.pathname + window.location.search);
}
