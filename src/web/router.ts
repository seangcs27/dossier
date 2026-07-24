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
  window.addEventListener('hashchange', () => handler(currentRoute()));
}
