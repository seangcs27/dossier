// An Endfield operator's dossier, the page a card on the roster opens. It is the Arknights
// dossier's page (detail.ts has the reasoning behind the layout) cut down to what the
// roster's index says about one operator: the art on the left under the breadcrumb, and on
// the right one panel with no tabs, since there is one panel's worth to show. Nothing is
// fetched but the images. The page is drawn by render/endfield-detail-html.ts.

import { endfieldDetailHtml, knowsEndfieldOperator } from '../render/endfield-detail-html';
import { hideSearch } from '../shell';

export function mountEndfieldDetail(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away here as they are on
  // the Arknights dossier.
  hideSearch();

  container.innerHTML = endfieldDetailHtml(id);
  if (!knowsEndfieldOperator(id)) return;

  // A card is pressed from anywhere down the roster, and this page is built in one go, with
  // no loading state between the two to shorten the page, so the window would stay as far
  // down as it was.
  window.scrollTo(0, 0);
}
