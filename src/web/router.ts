export type Route =
  | { view: 'grid' }
  | { view: 'detail'; id: string }
  | { view: 'events'; tab: EventsTab }
  | { view: 'endfield' }
  | { view: 'endfield-detail'; id: string }
  | { view: 'ptn-detail'; id: string }
  | { view: 'holodori-home' }
  | { view: 'holodori-gachas' }
  | { view: 'holodori-songs' }
  | { view: 'holodori-cards' }
  | { view: 'holodori-holomem'; id: string }
  | { view: 'holodori-card'; id: string }
  | { view: RosterGame };

// The Events page's tabs: #/events is the list of events, and the other two hang off it.
export type EventsTab = 'list' | 'pools' | 'calendar';

// The games whose roster is card.ts's page, at '#/' and the game's name. Path to Nowhere
// has a dossier under its own as well.
const ROSTER_GAMES = ['ptn', 'holodori', 'fgo'] as const;
type RosterGame = (typeof ROSTER_GAMES)[number];

export function parseHash(hash: string): Route {
  const m = /^#\/op\/([^/]+)$/.exec(hash);
  if (m && m[1]) return { view: 'detail', id: decodeURIComponent(m[1]) };
  const ev = /^#\/events(?:\/(pools|calendar))?$/.exec(hash);
  if (ev) return { view: 'events', tab: (ev[1] ?? 'list') as EventsTab };
  // The other games, each under its own prefix. Everything outside those is Arknights', as
  // it was before there were others, so links made then still land where they did.
  if (hash === '#/endfield') return { view: 'endfield' };
  const ef = /^#\/endfield\/op\/([^/]+)$/.exec(hash);
  if (ef) return { view: 'endfield-detail', id: decodeURIComponent(ef[1]) };
  const sinner = /^#\/ptn\/sinner\/([^/]+)$/.exec(hash);
  if (sinner) return { view: 'ptn-detail', id: decodeURIComponent(sinner[1]) };
  // hololive Dreams opens on its front page; its roster, the sticker sheet, is a page under it.
  if (hash === '#/holodori') return { view: 'holodori-home' };
  if (hash === '#/holodori/holomems') return { view: 'holodori' };
  if (hash === '#/holodori/gachas') return { view: 'holodori-gachas' };
  if (hash === '#/holodori/songs') return { view: 'holodori-songs' };
  if (hash === '#/holodori/cards') return { view: 'holodori-cards' };
  const holomem = /^#\/holodori\/holomem\/([^/]+)$/.exec(hash);
  if (holomem) return { view: 'holodori-holomem', id: decodeURIComponent(holomem[1]) };
  const card = /^#\/holodori\/card\/([^/]+)$/.exec(hash);
  if (card) return { view: 'holodori-card', id: decodeURIComponent(card[1]) };
  const roster = ROSTER_GAMES.find(game => hash === `#/${game}`);
  if (roster) return { view: roster };
  return { view: 'grid' };
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

// The address the page was last drawn for. A change of hash fires popstate and then
// hashchange, so a route is acted on only if the address differs from this.
let drawn = window.location.href;

export function onRouteChange(handler: (route: Route) => void): void {
  const fire = (): void => {
    if (window.location.href === drawn) return;
    drawn = window.location.href;
    handler(currentRoute());
  };
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
  drawn = window.location.href;
}
