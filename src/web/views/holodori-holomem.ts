import { clipHtml } from '../holodori-clip';
import { wireTurns } from '../holodori-flip';
import { holomemHtml, knowsHolomem } from '../render/holodori-holomem-html';
import { songBackHtml } from '../render/holodori-songs-html';
import { hideSearch } from '../shell';

// A holomem's own page (#/holodori/holomem/<id>): her whole key art on her colours beside
// her profile, then her cards, each opening its own page, the songs she sings, each
// turning over as on the Songs page, and her membership stickers.
// In the album's world (_holodori.scss). The page is drawn by
// render/holodori-holomem-html.ts.

export function mountHolodoriHolomem(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away here as they are on
  // every other game's dossier.
  hideSearch();

  container.innerHTML = holomemHtml(id, Date.now(), { disc: clipHtml });
  if (knowsHolomem(id)) wireTurns(container.querySelector<HTMLElement>('.hm-page')!, songBackHtml);
}
