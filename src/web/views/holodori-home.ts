import { clipHtml } from '../holodori-clip';
import { wireTurns } from '../holodori-flip';
import { homeHtml } from '../render/holodori-home-html';
import { songBackHtml } from '../render/holodori-songs-html';

// hololive Dreams' front page (#/holodori), where its tile in the sidebar lands: a way into
// each of its four pages, then what is going on in the game now (the gachas running, the
// birthdays coming) and its newest songs. In the game's world (_holodori.scss). The page is
// drawn by render/holodori-home-html.ts.

export function mountHolodoriHome(container: HTMLElement): void {
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  container.innerHTML = homeHtml(Date.now(), clipHtml);
  wireTurns(container.querySelector<HTMLElement>('.hh-page')!, songBackHtml);
}
