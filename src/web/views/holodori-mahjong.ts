import { holojongPageHtml } from '../render/holojong-html';
import { hideSearch } from '../shell';

// The guide to hololive Mahjong -Holojan- (#/holodori/mahjong), in hololive Dreams' world
// (_holodori.scss). The page is drawn by render/holojong-html.ts.

/**
 * Makes the contents' links scroll to their section. Under the pages' `<base href>` a bare
 * '#hj-tiles' resolves to the site's root, and in the SPA it would be read as a route.
 */
export function wireGuideLinks(container: HTMLElement): void {
  const toc = container.querySelector<HTMLElement>('.hj-toc');
  if (!toc) return;
  toc.onclick = (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#hj-"]');
    if (!link) return;
    e.preventDefault();
    document.getElementById(link.getAttribute('href')!.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
}

export function mountHolodoriMahjong(container: HTMLElement): void {
  hideSearch();
  container.innerHTML = holojongPageHtml();
  wireGuideLinks(container);
}
