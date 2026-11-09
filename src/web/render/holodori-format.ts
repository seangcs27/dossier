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

/**
 * A holomem's round face: her YouTube avatar, else the game's icon, else her bust. `game` is set
 * for the game's icon, which is drawn larger than its circle so that the ring with her name
 * round it falls outside.
 */
export function faceOf(c: HolodoriCharacter): { src?: string; game: boolean } {
  if (c.avatar) return { src: c.avatar, game: false };
  return { src: c.icon ?? c.art, game: Boolean(c.icon) };
}

/** What a link to a holomem points at: her page, or for talent the game lacks her official profile. */
export const holomemLinkAttrs = (c: HolodoriCharacter): string =>
  c.outside
    ? `href="${escHtml(c.profile!)}" target="_blank" rel="noopener"`
    : `href="#/holodori/holomem/${encodeURIComponent(c.id)}"`;

// A holomem in no group stands in a row named for her branch.
export const groupsOf = (c: HolodoriCharacter): string[] => (c.groups.length ? c.groups : [c.branch]);
