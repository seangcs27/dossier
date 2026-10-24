import { claimAudio, clock, getVolume, onVolume, waveHtml } from './holodori-audio';
import { voiceUrl } from './holodori-index';

// A card page's voice lines and live dialogues as speech bubbles (views/holodori-card.ts): a
// bubble in the speaker's colour that fills with its own words as the line goes and shows a
// waveform to press for a place in it, and one dock for the lot, with previous and next, a
// speed and the line's own waveform. One line plays at a time, here and everywhere
// (holodori-audio.ts); a conversation plays its lines one after another. The bubbles and the
// dock are drawn by render/holodori-card-html.ts; this plays them.

const RATES = [1, 1.25, 1.5, 0.75];

let audio: HTMLAudioElement | undefined;
let scope: HTMLElement | undefined;   // the page the bubbles are in, as of the last press
let loaded = '';                      // the audio id `audio` has been given
let playing = '';                     // the line on show: playing, paused or just ended
let queue: string[] = [];             // the lines a conversation has still to play
let pending = 0;                      // where in the line to start once its length is known, 0 to 1
let rate = 1;
let frame = 0;

const lineOf = (id: string): HTMLElement | null =>
  scope?.querySelector<HTMLElement>(`.vl[data-audio="${CSS.escape(id)}"]`) ?? null;
const lineIds = (): string[] => Array.from(scope?.querySelectorAll<HTMLElement>('.vl') ?? [], el => el.dataset.audio!);
const isOn = (): boolean => !!audio && !audio.paused && !audio.ended;

function paintState(): void {
  const on = isOn();
  scope?.querySelectorAll<HTMLElement>('.vl').forEach((el) => {
    const mine = el.dataset.audio === playing;
    el.classList.toggle('is-on', mine);
    el.classList.toggle('is-playing', mine && on);
    el.querySelector('.vl-play')!.setAttribute('aria-pressed', String(mine && on));
  });
  scope?.querySelector('.vd')?.classList.toggle('is-playing', on);
}

function paintDock(): void {
  const dock = scope?.querySelector<HTMLElement>('.vd');
  if (!dock) return;
  const label = lineOf(playing)?.querySelector('.vl-lab')?.textContent;
  dock.querySelector('.vd-name')!.textContent = label ?? 'Pick a line';
  dock.querySelector('.vd-seek')!.innerHTML = playing ? waveHtml(playing, 48) : '';
}

function paintProgress(): void {
  const length = audio?.duration ?? 0;
  const known = Number.isFinite(length) && length > 0;
  const p = known ? audio!.currentTime / length : 0;
  lineOf(playing)?.style.setProperty('--p', String(p));
  const dock = scope?.querySelector<HTMLElement>('.vd');
  if (!dock) return;
  dock.style.setProperty('--p', String(p));
  dock.querySelector('.vd-time')!.textContent = `${clock(audio?.currentTime ?? 0)} / ${clock(known ? length : 0)}`;
}

function loop(): void {
  paintProgress();
  if (isOn()) frame = requestAnimationFrame(loop);
}

// Stops the line; what is queued after it is dropped.
function halt(): void {
  queue = [];
  audio?.pause();
  paintState();
}

function fail(): void {
  queue = [];
  lineOf(playing)?.classList.add('is-bad');
  paintState();
}

function start(id: string, at = 0): void {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = getVolume();
    onVolume(() => { audio!.volume = getVolume(); });
    audio.onloadedmetadata = () => {
      if (pending) audio!.currentTime = pending * audio!.duration;
      pending = 0;
      paintProgress();
    };
    audio.onplay = () => {
      paintState();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };
    audio.onpause = () => { paintState(); paintProgress(); };
    audio.onerror = fail;
    audio.onended = () => {
      paintProgress();
      const next = queue.shift();
      if (next) start(next);
      else paintState();
    };
  }
  claimAudio(halt);
  if (playing && playing !== id) lineOf(playing)?.style.setProperty('--p', '0');
  playing = id;
  lineOf(id)?.classList.remove('is-bad');
  if (loaded !== id) {
    audio.src = voiceUrl(id);
    loaded = id;
    pending = at;
  } else if (audio.readyState >= 1) {
    audio.currentTime = at * audio.duration;
  } else {
    pending = at;
  }
  // Giving it a new file puts the speed back, so it is set after.
  audio.defaultPlaybackRate = rate;
  audio.playbackRate = rate;
  void audio.play().catch(fail);
  paintDock();
  paintState();
}

function toggle(id: string): void {
  if (id === playing && audio && !audio.ended) {
    if (audio.paused) {
      claimAudio(halt);
      void audio.play().catch(fail);
    } else {
      audio.pause();
    }
    return;
  }
  queue = [];
  start(id);
}

function control(what: string): void {
  const all = lineIds();
  if (what === 'play') {
    toggle(playing || all[0]);
  } else if (what === 'rate') {
    rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    if (audio) audio.defaultPlaybackRate = audio.playbackRate = rate;
    scope!.querySelector('.vd-rate')!.textContent = `${rate}×`;
  } else {
    const at = all.indexOf(playing);
    const to = all[at + (what === 'next' ? 1 : -1)] ?? (what === 'next' ? undefined : all[0]);
    if (to) {
      queue = [];
      start(to);
    }
  }
}

/**
 * Takes a press inside `host`, a page with bubbles in it, and answers it if it was on one: a
 * bubble or its button plays or pauses its line, its waveform plays from the place pressed,
 * the dock's buttons step, play and change the speed, and "Play conversation" plays a whole
 * dialogue. Returns whether it did.
 */
export function voiceClick(ev: MouseEvent, host: HTMLElement): boolean {
  const target = ev.target as Element;
  scope = host;
  const conversation = target.closest<HTMLElement>('[data-conv]');
  if (conversation) {
    const lines = Array.from(conversation.closest('.hc-dialogue')!.querySelectorAll<HTMLElement>('.vl'), el => el.dataset.audio!);
    queue = lines.slice(1);
    start(lines[0]);
    return true;
  }
  const dockButton = target.closest<HTMLElement>('[data-vd]');
  if (dockButton) {
    control(dockButton.dataset.vd!);
    return true;
  }
  const seek = target.closest<HTMLElement>('[data-seek]');
  if (seek) {
    const id = seek.closest<HTMLElement>('.vl')?.dataset.audio ?? playing;
    if (id) {
      const box = seek.getBoundingClientRect();
      if (id !== playing) queue = [];
      start(id, Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width)));
    }
    return true;
  }
  const line = target.closest<HTMLElement>('.vl');
  if (line) {
    toggle(line.dataset.audio!);
    return true;
  }
  return false;
}
