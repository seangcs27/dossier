import ported from '../ported-routes.json';

/**
 * The page Astro serves for a hash route, relative to the site's root, or undefined where only
 * the SPA has it. A key ending in '/' stands for every route under it ('#/holodori/card/' + id),
 * except '#/', which is the grid's own address and not a prefix of every route.
 */
export function portedPath(hash: string): string | undefined {
  const routes: Record<string, string> = ported;
  if (routes[hash]) return routes[hash];
  const prefix = Object.keys(routes).find(key => key !== '#/' && key.endsWith('/') && hash.startsWith(key));
  return prefix && `${routes[prefix]}${hash.slice(prefix.length)}/`;
}

/** The markup with every `href="#/…"` Astro has a page for written as that page's path. */
export function portedLinks(html: string): string {
  return html.replace(/href="(#\/[^"]*)"/g, (attr, hash: string) => {
    const page = portedPath(hash);
    return page ? `href="${page}"` : attr;
  });
}
