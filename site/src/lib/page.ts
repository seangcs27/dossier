import type { Route } from '@web/router';
import { initShell, showShell } from '@web/shell';
import { portedPath } from './ported';

// What every page's script does through here. Astro's client router swaps one page for the
// next without a reload, so a page's script runs once, the first time its page is shown; what
// it mounts it mounts on every `astro:page-load` that is its page's. The shell is started once.
initShell();

// A '#/…' link a view draws in the browser (the build wrote the static pages' as paths) is
// given its page's path as soon as it is in the page, so that a hover prefetches that page and
// the router takes a press as a link to it. A view that writes one back (card-spin.ts puts a
// card's href back after a spin, shell.ts sets the roster link's) has it changed again. The
// whole document is watched: the router swaps the body for the next page's.
const portLinks = (): void => {
  for (const link of document.querySelectorAll('a[href^="#/"]')) {
    const page = portedPath(link.getAttribute('href')!);
    if (page) link.setAttribute('href', page);
  }
};
portLinks();
new MutationObserver(portLinks).observe(document.documentElement, {
  subtree: true, childList: true, attributes: true, attributeFilter: ['href'],
});

document.addEventListener('astro:before-swap', (e) => {
  const next = e.newDocument.body;
  // The drawer's state is the body's class, which showShell reads to close it.
  next.className = document.body.className;
  // The tooltip hangs off the body, made once by initShell.
  const tip = document.getElementById('tip');
  if (tip) next.append(tip);
});

/** Mounts a page each time it is shown: `view` is the page's own, as `data-view` on its body. */
export function onPage(view: Route['view'], mount: (container: HTMLElement) => void): void {
  document.addEventListener('astro:page-load', () => {
    if (document.body.dataset.view !== view) return;
    showShell(view);
    mount(document.getElementById('view')!);
  });
}
