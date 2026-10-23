import { getHolodoriCharacters, type HolodoriCharacter } from '../holodori-index';

// What hololive Dreams' pages say about a holomem's number and groups. No DOM and no window:
// the pages built at build time (site/) import this as the views do. Her birthday and debut
// are in holodori-dates.ts, which has no data and is re-exported here.
export * from './holodori-dates';

const cast = getHolodoriCharacters();
// Her number is her place in the game's own order.
export const place = new Map(cast.map((c, i) => [c.id, i + 1]));
export const no = (c: HolodoriCharacter): string => String(place.get(c.id)).padStart(3, '0');

// A holomem in no group stands in a row named for her branch.
export const groupsOf = (c: HolodoriCharacter): string[] => (c.groups.length ? c.groups : [c.branch]);
