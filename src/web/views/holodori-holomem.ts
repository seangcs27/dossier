import { getVolume } from '../holodori-audio';
import { clipHtml } from '../holodori-clip';
import { wireTurns } from '../holodori-flip';
import { fetchHolodoriHolomem, getHolodoriCharacters } from '../holodori-index';
import { voiceClick } from '../holodori-voice';
import { holomemHtml, holomemVoicesHtml, knowsHolomem } from '../render/holodori-holomem-html';
import { songBackHtml } from '../render/holodori-songs-html';
import { hideSearch } from '../shell';

// A holomem's own page (#/holodori/holomem/<id>): her whole key art on her colours beside
// her profile, then her cards, each opening its own page, the songs she sings, each
// turning over as on the Songs page, her membership stickers and her voice lines, which come
// from her payload and play as the card page's do.
// In the album's world (_holodori.scss). The page is drawn by
// render/holodori-holomem-html.ts.

export function mountHolodoriHolomem(container: HTMLElement, id: string): void {
  // The search box, its filters and the count are a roster's: put away here as they are on
  // every other game's dossier.
  hideSearch();

  container.innerHTML = holomemHtml(id, Date.now(), { disc: clipHtml });
  if (!knowsHolomem(id)) return;
  const page = container.querySelector<HTMLElement>('.hm-page')!;
  wireTurns(page, songBackHtml);
  page.addEventListener('click', (ev) => { voiceClick(ev, page); });
  const holomem = getHolodoriCharacters().find(c => c.id === id)!;
  void fetchHolodoriHolomem(id).then((d) => {
    page.querySelector('.hc-voices')!.innerHTML = holomemVoicesHtml(holomem, d, getVolume());
  }, () => {
    page.querySelector('.hc-voices')!.innerHTML = '<p class="hm-none">The last build did not bake her voice lines.</p>';
  });
}
