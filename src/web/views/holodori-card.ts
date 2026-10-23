import { openArtViewer } from '../art-viewer';
import { getVolume, paintVolume, stopAudio } from '../holodori-audio';
import {
  cardArtUrl, cardMovieUrl, cardSignUrl, fetchHolodoriCard, getHolodoriCards, voiceUrl,
  type HolodoriCardDetail, type HolodoriLine,
} from '../holodori-index';
import { playReveal, revealHtml } from '../holodori-reveal';
import { voiceClick } from '../holodori-voice';
import {
  bodyHtml, cardHtml, headHtml, readoutHtml, stageHtml, voicesHtml, type Shown,
} from '../render/holodori-card-html';

// A hololive Dreams card's own page (#/holodori/card/<id>), after holodori.best's: its
// illustration (and a 5-star card's animation and signature, which Reveal plays as the game
// does when a card is won), its stats at the level and bloom picked, its skills as that bloom
// has them, its voice lines and its live dialogues as bubbles with a player. Everything under
// the head is the card's payload, fetched when the page opens. In the album's world
// (_holodori.scss). The page is drawn by render/holodori-card-html.ts.

const cards = getHolodoriCards();

// The level and bloom picked, kept from one card to the next as the Arknights dossier keeps
// its elite and potential. 'max' follows each card's own top level.
let level: number | 'max' = 'max';
let bloom = 0;

// The line a card's reveal plays with its signature, which a 5-star card has first.
const cardGet = (d: HolodoriCardDetail): HolodoriLine | undefined => d.voices.find(v => v.label === 'Card get') ?? d.voices[0];

/**
 * Mounts the page. A page the Astro site drew at build time comes with its payload (`inlined`):
 * it is kept as it is, and only the handlers are put on it.
 */
export function mountHolodoriCard(container: HTMLElement, id: string, inlined?: HolodoriCardDetail): void {
  // The search box, its filters and the count are a roster's: put away as on every dossier.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  const card = cards.find(k => k.id === id);
  if (!card) {
    container.innerHTML = cardHtml(id);
    return;
  }
  let detail: HolodoriCardDetail | null = inlined ?? null;
  let failed = false;
  let shown: Shown = 'art';
  let drawn = Boolean(inlined);

  // The first call draws the page. After it only the head and the stats and skills are drawn
  // again, which a bloom or the payload coming changes: the stage and the voices hold a
  // reveal or a line that is playing, and are left alone.
  const render = (): void => {
    const mounted = page();
    if (drawn && mounted) {
      mounted.querySelector('.hc-head')!.outerHTML = headHtml(card, detail);
      mounted.querySelector('.hc-main')!.innerHTML = bodyHtml(detail, failed, level, bloom);
      return;
    }
    drawn = true;
    container.innerHTML = cardHtml(id, detail, level, bloom, getVolume());
  };

  const page = (): HTMLElement | null => container.querySelector<HTMLElement>('.hc-page');

  // The reveal's screen and bar are drawn here, since they hold the player's volume.
  const drawStage = (): void => {
    const line = detail ? cardGet(detail) : undefined;
    page()!.querySelector('.hc-stage')!.outerHTML = stageHtml(card, shown, shown === 'reveal'
      ? revealHtml({
        poster: card.full ?? '',
        movie: cardMovieUrl(card.asset),
        sign: cardSignUrl(card.asset),
        voice: line && { label: line.label ?? 'Card get', text: line.text },
      })
      : '');
  };

  // Plays the reveal on the stage, from a press. The card-get line is in the payload, which
  // is asked for if it has not come yet.
  const reveal = async (): Promise<void> => {
    const d = detail ?? await fetchHolodoriCard(id).catch(() => null);
    if (!page()) return;
    detail = d ?? detail;
    shown = 'reveal';
    drawStage();
    const line = d ? cardGet(d) : undefined;
    playReveal(page()!.querySelector<HTMLElement>('.hc-stage')!, line && voiceUrl(line.audio));
    page()!.querySelector<HTMLElement>('[data-show="reveal"]')?.focus();
  };

  // Handlers are assigned to the container, since the page is drawn again on every change.
  container.oninput = (e) => {
    const input = e.target as HTMLInputElement;
    if (input.id !== 'hc-level' || !detail) return;
    level = Number(input.value) === detail.levels.length ? 'max' : Number(input.value);
    input.setAttribute('aria-valuetext', `Level ${input.value}`);
    page()!.querySelector('.hc-readout')!.innerHTML = readoutHtml(detail, level, bloom);
  };
  container.onclick = (e) => {
    if (voiceClick(e, container)) return;
    const target = e.target as HTMLElement;
    const b = target.closest<HTMLElement>('[data-bloom]');
    const show = target.closest<HTMLElement>('[data-show]');
    if (b) {
      bloom = Number(b.dataset.bloom);
      render();
      page()?.querySelector<HTMLElement>(`[data-bloom="${bloom}"]`)?.focus();
    } else if (target.closest('[data-reveal]') || show?.dataset.show === 'reveal') {
      void reveal();
    } else if (show) {
      stopAudio();
      shown = show.dataset.show as Shown;
      drawStage();
      page()?.querySelector<HTMLElement>(`[data-show="${shown}"]`)?.focus();
    } else if (target.closest('.hc-art')) {
      openArtViewer(
        card.id, [{ suffix: 'full', label: card.name, artist: null, url: cardArtUrl(card.asset) }], 0,
        () => undefined, () => card.art ?? '',
      );
    }
  };
  if (inlined) {
    // Drawn at the default volume, and with the first level and bloom of a visit.
    paintVolume();
    return;
  }
  render();
  fetchHolodoriCard(id).then((d) => { detail = d; }, () => { failed = true; }).then(() => {
    // The page may have been left, or mounted again for another card, while it came.
    if (!page() || location.hash !== `#/holodori/card/${encodeURIComponent(id)}`) return;
    render();
    if (detail) page()!.querySelector('.hc-voices')!.innerHTML = voicesHtml(card, detail, getVolume());
  });
}
