import { escHtml } from './format';
import { claimAudio, clock, getVolume, onVolume, volumeHtml, waveHtml } from './holodori-audio';
import { voiceUrl, type HolodoriLine } from './holodori-index';

// A card page's voice lines and live dialogues as speech bubbles (views/holodori-card.ts): a
// bubble in the speaker's colour that fills with its own words as the line goes and shows a
// waveform to press for a place in it, and one dock for the lot, with previous and next, a
// speed and the line's own waveform. One line plays at a time, here and everywhere
// (holodori-audio.ts); a conversation plays its lines one after another.

/** Who says a line, for its bubble. */
export interface Speaker {
  colour: string;   // '#RRGGBB'
  face: string;     // her round face, as markup
  mine: boolean;    // the card's own holomem, whose bubbles stand on the left
}

const PLAY = '<svg class="ico-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L13 8z"></path></svg>';
const PAUSE = '<svg class="ico-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z"></path></svg>';
const RATES = [1, 1.25, 1.5, 0.75];

/** One line as a bubble: `label` is what it is called, a kind of line or who says it. */
export function bubbleHtml(line: HolodoriLine, who: Speaker, label: string): string {
  const text = escHtml(line.text).replace(/\n/g, '<br>');
  return `
    <li class="vl${who.mine ? '' : ' them'}" data-audio="${escHtml(line.audio)}" style="--who: ${escHtml(who.colour)}">
      ${who.face}
      <div class="vl-bub">
        <button class="vl-play" type="button" aria-pressed="false" aria-label="Play: ${escHtml(label)}">${PLAY}${PAUSE}</button>
        <div class="vl-body">
          <span class="vl-lab">${escHtml(label)}</span>
          <p class="vl-text"><span>${text}</span><span class="vl-fill" aria-hidden="true">${text}</span></p>
          <span class="vl-seek" data-seek>${waveHtml(line.audio)}</span>
        </div>
      </div>
    </li>
  `;
}

/** The dock the page's bubbles share. */
export function dockHtml(): string {
  const skip = (to: 'prev' | 'next', path: string): string => `
    <button class="vd-step" type="button" data-vd="${to}" aria-label="${to === 'prev' ? 'Previous' : 'Next'} line">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="${path}"></path></svg>
    </button>`;
  return `
    <div class="vd" role="group" aria-label="Voice player">
      ${skip('prev', 'M11.5 3.5v9L6 8zM3.8 3.5h1.8v9H3.8z')}
      <button class="vd-go" type="button" data-vd="play" aria-label="Play or pause">${PLAY}${PAUSE}</button>
      ${skip('next', 'M4.5 3.5v9L10 8zM10.4 3.5h1.8v9h-1.8z')}
      <span class="vd-name">Pick a line</span>
      <span class="vd-seek" data-seek></span>
      <span class="vd-time" aria-hidden="true">0:00 / 0:00</span>
      ${volumeHtml()}
      <button class="vd-rate" type="button" data-vd="rate" aria-label="Speed">1×</button>
    </div>
  `;
}

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
