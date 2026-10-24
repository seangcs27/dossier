// The routes the Astro site serves (site/src/ported-routes.json), hash to path under its base,
// for the scripts; the site's own copy is site/src/lib/ported.ts.
import { readFile } from 'node:fs/promises';

const PORTED = JSON.parse(await readFile(new URL('../../site/src/ported-routes.json', import.meta.url), 'utf8'));

/**
 * The Astro site's path for a hash route, or undefined where it does not serve it. A key ending
 * in '/' stands for every route under it ('#/holodori/holomem/' + id), but for '#/', the grid's own.
 */
export function portedPath(hash) {
  if (PORTED[hash]) return PORTED[hash];
  const prefix = Object.keys(PORTED).find(key => key !== '#/' && key.endsWith('/') && hash.startsWith(key));
  return prefix && `${PORTED[prefix]}${hash.slice(prefix.length)}/`;
}
