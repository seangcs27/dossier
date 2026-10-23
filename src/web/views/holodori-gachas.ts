import { gachasPageHtml } from '../render/holodori-gachas-html';

// hololive Dreams' gachas (#/holodori/gachas): every banner the record has
// (scripts/lib/holodori-gachas.mjs), as its logo, its dates in the reader's own clock and
// the cards it features, each opening its page. Running now first, then the past ones,
// then the gachas that are always there. In the game's world (_holodori.scss). The page is
// drawn by render/holodori-gachas-html.ts.

export function mountHolodoriGachas(container: HTMLElement): void {
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  container.innerHTML = gachasPageHtml(Date.now());
}
