import { escHtml } from './format';
import { claimAudio, clock, releaseAudio } from './holodori-audio';
import { getHolodoriSongs, type HolodoriSong } from './holodori-index';

// A song's chorus on hololive Dreams' pages (views/holodori-songs.ts): a disc on its jacket
// that plays the part of its official music video the game marks as the chorus, in YouTube's
// own embedded player. The audio is never copied here: it is the rights holder's own stream,
// shown as it is, and the player stays in view while it plays. The disc's ring fills as the
// clip goes, from the time the player reports.

const HOST = 'https://www.youtube-nocookie.com';
const songs = new Map(getHolodoriSongs().map(s => [s.id, s]));

// What the player reports as `playerState`: 0 ended, 1 playing, 2 paused, 3 buffering.
type State = 'idle' | 'playing' | 'paused';

let now: { song: HolodoriSong; from: number; to: number } | undefined;
let state: State = 'idle';
let progress = 0;
let dock: HTMLElement | undefined;
let frame: HTMLIFrameElement | undefined;

/** The YouTube id of a song's music video, or undefined for a song that has none. */
export function videoOf(song: HolodoriSong): string | undefined {
  return /(?:[?&]v=|youtu\.be\/)([\w-]{11})/.exec(song.mv)?.[1];
}

/** A song's disc, the button that plays its chorus; nothing for a song with no video. */
export function clipHtml(song: HolodoriSong): string {
  if (!videoOf(song)) return '';
  const mine = now?.song.id === song.id;
  return `
    <button class="song-play${mine ? ' is-on' : ''}${mine && state === 'playing' ? ' is-playing' : ''}" type="button"
            data-clip="${escHtml(song.id)}" aria-pressed="${mine && state === 'playing'}"
            aria-label="Play the chorus of ${escHtml(song.title)}" style="--p: ${mine ? progress : 0}">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle class="ring" cx="22" cy="22" r="19" pathLength="100"></circle>
        <circle class="ring-on" cx="22" cy="22" r="19" pathLength="100"></circle>
        <path class="ico-play" d="M18 14.5v15l12-7.5z"></path>
        <path class="ico-pause" d="M16.5 14h4v16h-4zM23.5 14h4v16h-4z"></path>
      </svg>
    </button>
  `;
}

function paint(): void {
  document.querySelectorAll<HTMLElement>('.song-play').forEach((button) => {
    const mine = !!now && button.dataset.clip === now.song.id;
    button.classList.toggle('is-on', mine);
    button.classList.toggle('is-playing', mine && state === 'playing');
    button.setAttribute('aria-pressed', String(mine && state === 'playing'));
    button.style.setProperty('--p', String(mine ? progress : 0));
  });
}

function post(func: string): void {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: '' }), HOST);
}

// Pauses the clip, for another sound that starts.
function halt(): void {
  if (state === 'playing') post('pauseVideo');
  if (state !== 'idle') state = 'paused';
  paint();
}

function shut(): void {
  releaseAudio(halt);
  dock?.remove();
  dock = undefined;
  frame = undefined;
  now = undefined;
  state = 'idle';
  progress = 0;
  paint();
}

function build(): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'sc-dock';
  el.setAttribute('aria-label', 'Song clip');
  el.innerHTML = `
    <div class="sc-frame">
      <iframe title="Music video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <div class="sc-meta"><b class="sc-title"></b><span class="sc-note"></span></div>
    <button class="sc-close" type="button" aria-label="Close the player">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
    </button>
    <p class="sc-fail" hidden>This video can't play here. <a target="_blank" rel="noopener">Watch it on YouTube</a></p>
  `;
  document.body.append(el);
  frame = el.querySelector('iframe')!;
  // The player talks only to a page that says it is listening, once it has loaded.
  frame.addEventListener('load', () => {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST);
  });
  return el;
}

function open(song: HolodoriSong): void {
  const [start, end] = song.chorus ?? [0, 30000];
  const from = Math.floor(start / 1000);
  const to = Math.ceil(end / 1000);
  claimAudio(halt);
  now = { song, from, to };
  state = 'playing';
  progress = 0;
  dock ??= build();
  dock.querySelector('.sc-title')!.textContent = song.title;
  dock.querySelector('.sc-note')!.textContent = `Chorus ${clock(from)} to ${clock(to)} · official music video`;
  dock.querySelector<HTMLElement>('.sc-fail')!.hidden = true;
  dock.querySelector<HTMLAnchorElement>('.sc-fail a')!.href = song.mv;
  frame!.src = `${HOST}/embed/${videoOf(song)}?start=${from}&end=${to}&autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  paint();
}

function toggle(): void {
  if (state === 'playing') {
    post('pauseVideo');
    state = 'paused';
  } else {
    claimAudio(halt);
    post('playVideo');
    state = 'playing';
  }
  paint();
}

function setState(player: number): void {
  if (player === 1 || player === 3) {
    state = 'playing';
  } else if (player === 2) {
    state = 'paused';
  } else if (player === 0) {
    // The clip ran to its end: the disc is ready to play it again.
    state = 'idle';
    progress = 0;
    releaseAudio(halt);
  }
  paint();
}

window.addEventListener('message', (e) => {
  if (!now || e.origin !== HOST || e.source !== frame?.contentWindow) return;
  let data: { event?: string; info?: unknown };
  try {
    data = JSON.parse(e.data as string);
  } catch {
    return;
  }
  const info = data.info as { currentTime?: number; playerState?: number } | number | undefined;
  if (data.event === 'onError') {
    state = 'idle';
    dock!.querySelector<HTMLElement>('.sc-fail')!.hidden = false;
    paint();
  } else if (data.event === 'onStateChange' && typeof info === 'number') {
    setState(info);
  } else if (data.event === 'infoDelivery' && info && typeof info === 'object') {
    if (typeof info.currentTime === 'number') {
      progress = Math.min(1, Math.max(0, (info.currentTime - now.from) / (now.to - now.from)));
    }
    if (typeof info.playerState === 'number') setState(info.playerState);
    else paint();
  }
});

// One press handler for every page that has jackets: a disc plays or pauses its song, the
// player's cross closes it.
document.addEventListener('click', (e) => {
  const target = e.target as Element;
  if (target.closest('.sc-close')) {
    shut();
    return;
  }
  const song = songs.get(target.closest<HTMLElement>('[data-clip]')?.dataset.clip ?? '');
  if (!song) return;
  if (now?.song.id === song.id && state !== 'idle') toggle();
  else open(song);
});

// The player is the body's and not the page's, so it is put away with the page.
window.addEventListener('hashchange', shut);
