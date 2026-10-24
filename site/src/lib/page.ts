import type { Route } from '@web/router';
import { initShell, showShell } from '@web/shell';
import { portedPath } from './ported';

// What every page's script does through here. Astro's client router swaps one page for the
// next without a reload, so a page's script runs once, the first time its page is shown; what
// it mounts it mounts on every `astro:page-load` that is its page's. The shell is started once.
initShell();

// A '#/…' link (the views' own, and the static pages', drawn from the same renderers) is given
// its page's path as it is pressed, so that the router takes it as a link to that page. Changed
// as late as that, and not undone, because a view may still cancel the press (the Path to
// Nowhere wall swallows the click that ends a drag), and then nothing happens, as before.
document.addEventListener('click', (e) => {
  const link = (e.target as Element).closest?.('a[href^="#/"]');
  const page = link && portedPath(link.getAttribute('href')!);
  if (page) link.setAttribute('href', page);
}, true);

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
