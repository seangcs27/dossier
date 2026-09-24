export type Route =
  | { view: 'grid' }
  | { view: 'detail'; id: string };

export function parseHash(hash: string): Route {
  const m = /^#\/op\/([^/]+)$/.exec(hash);
  if (m && m[1]) return { view: 'detail', id: decodeURIComponent(m[1]) };
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
