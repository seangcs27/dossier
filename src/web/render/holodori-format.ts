import { escHtml } from '../format';
import { getHolodoriTalent, type HolodoriCharacter } from '../holodori-index';

// What hololive Dreams' pages say about a holomem's number and groups. No DOM and no window:
// the pages built at build time (site/) import this as the views do. Her birthday and debut
// are in holodori-dates.ts, which has no data and is re-exported here.
export * from './holodori-dates';

const cast = getHolodoriTalent();
// Her number is her place in the game's own order, and the talent it lacks number on from it.
export const place = new Map(cast.map((c, i) => [c.id, i + 1]));
export const no = (c: HolodoriCharacter): string => String(place.get(c.id)).padStart(3, '0');

/** What a link to a holomem points at: her page, or for talent the game lacks her official profile. */
export const holomemLinkAttrs = (c: HolodoriCharacter): string =>
  c.outside
    ? `href="${escHtml(c.profile!)}" target="_blank" rel="noopener"`
    : `href="#/holodori/holomem/${encodeURIComponent(c.id)}"`;

// A holomem in no group stands in a row named for her branch.
export const groupsOf = (c: HolodoriCharacter): string[] => (c.groups.length ? c.groups : [c.branch]);
