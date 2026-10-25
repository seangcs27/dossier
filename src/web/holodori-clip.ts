import { claimAudio, clock, getVolume, onVolume, releaseAudio, volumeHtml } from './holodori-audio';
import type { HolodoriSong } from './holodori-index';
import { clipButtonHtml, videoOf } from './render/holodori-clip-html';

// A song's chorus on hololive Dreams' pages (views/holodori-songs.ts): a disc on its jacket
// that plays the part of its official music video the game marks as the chorus, in YouTube's
// own embedded player. The audio is never copied here: it is the rights holder's own stream,
// shown as it is, and the player stays in view while it plays. The disc's ring fills as the
// clip goes, from the time the player reports.

const HOST = 'https://www.youtube-nocookie.com';

// What the player needs of a song: its disc carries it (render/holodori-clip-html.ts), so
// no page has to hold the songs for it.
type ClipSong = Pick<HolodoriSong, 'id' | 'title' | 'mv' | 'chorus' | 'estimated'>;

function songOf(button: HTMLElement): ClipSong {
  const { clip, title, mv, chorus, estimated } = button.dataset;
  return {
    id: clip!,
    title: title!,
    mv: mv!,
    ...(chorus ? { chorus: chorus.split(',').map(Number) as [number, number] } : {}),
    ...(estimated !== undefined ? { estimated: true as const } : {}),
  };
}

// What the player reports as `playerState`: 0 ended, 1 playing, 2 paused, 3 buffering.
type State = 'idle' | 'playing' | 'paused';

let now: { song: ClipSong; from: number; to: number } | undefined;
let state: State = 'idle';
let progress = 0;
let dock: HTMLElement | undefined;
let frame: HTMLIFrameElement | undefined;

/** A song's disc, the button that plays its chorus, as the player has it now. */
export function clipHtml(song: HolodoriSong): string {
  return clipButtonHtml(song, now && { id: now.song.id, playing: state === 'playing', progress });
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

function post(func: string, args: number[] | '' = ''): void {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), HOST);
}

// The clip plays at the site's one volume (holodori-audio.ts), from the slider under the
// video: in a player this small, YouTube's own slider drops below its speaker with a gap the
// pointer loses it in.
function applyVolume(): void {
  const level = Math.round(getVolume() * 100);
  post('setVolume', [level]);
  post(level === 0 ? 'mute' : 'unMute');
}
onVolume(applyVolume);

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

// Where the player was left when it was moved, kept for the next time it opens. Until it is
// moved it stands in the window's lower right corner, which is the stylesheet's.
let place: { x: number; y: number } | undefined;
const EDGE = 8;

// Puts the player's top left at x, y, kept inside the window.
function moveTo(el: HTMLElement, x: number, y: number): void {
  const left = Math.min(Math.max(x, EDGE), Math.max(EDGE, window.innerWidth - el.offsetWidth - EDGE));
  const top = Math.min(Math.max(y, EDGE), Math.max(EDGE, window.innerHeight - el.offsetHeight - EDGE));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  place = { x: left, y: top };
}

// The player is moved by its grip and its title, never by the video, which would take the
// press for itself; the grip answers the arrow keys too.
function wireMove(el: HTMLElement): void {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !(e.target as Element).closest('.sc-grip, .sc-meta')) return;
    const box = el.getBoundingClientRect();
    const dx = e.clientX - box.left;
    const dy = e.clientY - box.top;
    const drag = (m: PointerEvent): void => moveTo(el, m.clientX - dx, m.clientY - dy);
    const drop = (): void => {
      el.classList.remove('is-moving');
      el.removeEventListener('pointermove', drag);
      el.removeEventListener('pointerup', drop);
      el.removeEventListener('pointercancel', drop);
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add('is-moving');
    el.addEventListener('pointermove', drag);
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
    e.preventDefault();
  });
  el.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
    if (!step || !(e.target as Element).closest('.sc-grip')) return;
    const box = el.getBoundingClientRect();
    moveTo(el, box.left + step[0], box.top + step[1]);
    e.preventDefault();
  });
}

// The player's width once it has been resized, kept for the next time it opens; its height
// follows from the video's. Until it is resized the width is the stylesheet's.
let size: number | undefined;
const MIN_WIDTH = 240;

// Gives the player as much of `width` as the window has room for, keeping its lower right
// corner where it was, since the handle is at its upper left.
function sizeTo(el: HTMLElement, width: number): void {
  const box = el.getBoundingClientRect();
  const video = el.querySelector<HTMLElement>('.sc-frame')!;
  const sides = el.offsetWidth - video.offsetWidth;
  const rest = el.offsetHeight - video.offsetHeight;
  const most = Math.min(box.right - EDGE, ((box.bottom - EDGE - rest) * 16) / 9 + sides);
  el.style.width = `${Math.round(Math.max(MIN_WIDTH, Math.min(width, most)))}px`;
  if (place) moveTo(el, box.right - el.offsetWidth, box.bottom - el.offsetHeight);
}

// The player is resized by the handle at its upper left, dragged up or left to grow, or with
// the arrow keys on it.
function wireSize(el: HTMLElement): void {
  const handle = el.querySelector<HTMLElement>('.sc-size')!;
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const from = el.offsetWidth;
    // The axis the pointer has moved further along decides, so a drag along either one works.
    const drag = (m: PointerEvent): void => {
      const across = e.clientX - m.clientX;
      const up = ((e.clientY - m.clientY) * 16) / 9;
      sizeTo(el, from + (Math.abs(across) >= Math.abs(up) ? across : up));
      size = el.offsetWidth;
    };
    const drop = (): void => {
      el.classList.remove('is-sizing');
      handle.removeEventListener('pointermove', drag);
      handle.removeEventListener('pointerup', drop);
      handle.removeEventListener('pointercancel', drop);
    };
    handle.setPointerCapture(e.pointerId);
    el.classList.add('is-sizing');
    handle.addEventListener('pointermove', drag);
    handle.addEventListener('pointerup', drop);
    handle.addEventListener('pointercancel', drop);
    e.preventDefault();
  });
  handle.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: 32, ArrowUp: 32, ArrowRight: -32, ArrowDown: -32 }[e.key];
    if (!step) return;
    sizeTo(el, el.offsetWidth + step);
    size = el.offsetWidth;
    e.preventDefault();
  });
}

function build(): HTMLElement {
  const el = document.createElement('aside');
  el.className = 'sc-dock';
  el.setAttribute('aria-label', 'Song clip');
  el.innerHTML = `
    <button class="sc-grip" type="button" aria-label="Move the player: drag, or use the arrow keys">
      <svg viewBox="0 0 24 6" aria-hidden="true"><circle cx="6" cy="3" r="1.4"></circle><circle cx="12" cy="3" r="1.4"></circle><circle cx="18" cy="3" r="1.4"></circle></svg>
    </button>
    <button class="sc-size" type="button" aria-label="Resize the player: drag, or use the arrow keys">
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 9L9 1M1 5L5 1"></path></svg>
    </button>
    <div class="sc-frame">
      <iframe title="Music video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen
              referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <div class="sc-meta"><b class="sc-title"></b><span class="sc-note"></span></div>
    <div class="sc-vol">${volumeHtml()}</div>
    <button class="sc-close" type="button" aria-label="Close the player">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
    </button>
    <p class="sc-fail" hidden>This video can't play here. <a target="_blank" rel="noopener">Watch it on YouTube</a></p>
  `;
  document.body.append(el);
  wireMove(el);
  wireSize(el);
  if (size) el.style.width = `${size}px`;
  if (place) moveTo(el, place.x, place.y);
  frame = el.querySelector('iframe')!;
  // The player talks only to a page that says it is listening, once it has loaded.
  frame.addEventListener('load', () => {
    frame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), HOST);
  });
  return el;
}

function open(song: ClipSong): void {
  const [start, end] = song.chorus ?? [0, 30000];
  const from = Math.floor(start / 1000);
  const to = Math.ceil(end / 1000);
  claimAudio(halt);
  now = { song, from, to };
  state = 'playing';
  progress = 0;
  dock ??= build();
  dock.querySelector('.sc-title')!.textContent = song.title;
  dock.querySelector('.sc-note')!.textContent =
    `${song.estimated ? 'Highlight' : 'Chorus'} ${clock(from)} to ${clock(to)} · official music video`;
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
  if (data.event === 'onReady') {
    applyVolume();
  } else if (data.event === 'onError') {
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
  const button = target.closest<HTMLElement>('[data-clip]');
  if (!button) return;
  const song = songOf(button);
  if (now?.song.id === song.id && state !== 'idle') toggle();
  else open(song);
});

// The player is the body's and not the page's, so it is put away with the page.
window.addEventListener('hashchange', shut);
document.addEventListener('astro:before-swap', shut);

// A smaller window must not leave it out of reach.
window.addEventListener('resize', () => {
  if (dock && size) sizeTo(dock, size);
  if (dock && place) moveTo(dock, place.x, place.y);
});
