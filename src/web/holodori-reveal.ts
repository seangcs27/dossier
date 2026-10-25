import { escHtml } from './format';
import { claimAudio, clock, getVolume, onVolume, releaseAudio, volumeHtml } from './holodori-audio';

// A 5-star card's reveal on its page (views/holodori-card.ts), in the order the game shows a
// card won from a gacha, read off a recording of one (20 October 2026): the card-get line is
// said first on a white screen with its words, then the card's animation plays, and the
// signature is written over it from the animation's first second on; the animation is
// silent. So: the line, then the animation and the signature together.
//
// The signature's video is 1280x1440: its top half is the writing in colour and its bottom
// half is a white matte of the same strokes, the two 16:9 pictures the game lays over the
// card. Both are drawn onto canvases over the screen, the matte inverted and multiplied in
// to clear the strokes' place and the colour screened in over it, which composites the
// strokes with the art or the animation under them. (A canvas shows a video from another
// host; it only cannot be read back, which this never does.) The browser lets a page play
// sound only after a press, so the reveal starts on one.

/** What the reveal needs of a card: its art and two videos, and the card-get line if the payload has one. */
export interface Reveal {
  poster: string;
  movie: string;
  sign: string;
  voice?: { label: string; text: string; lang?: string };
}

// Seconds the white screen is held after the line ends, before the animation.
const HOLD = 0.4;

// The signature fades out in the last half-second of its video (9 s on every card checked);
// the frame this many seconds before the end is the one that stays over the art.
const FADE = 0.6;

/** The reveal's screen, its three tracks and its buttons, in place of a stage's picture. */
export function revealHtml(r: Reveal): string {
  const text = r.voice ? escHtml(r.voice.text).replace(/\n/g, '<br>') : '';
  const rows = [['Voice line', !!r.voice], ['Animation', true], ['Signature', true]] as const;
  return `
    <div class="rv-screen">
      <video class="rv-movie" src="${escHtml(r.movie)}" poster="${escHtml(r.poster)}" playsinline preload="auto"></video>
      ${r.poster ? `<img class="rv-art" src="${escHtml(r.poster)}" alt="">` : ''}
      <video class="rv-sign" src="${escHtml(r.sign)}" playsinline preload="auto"></video>
      <canvas class="rv-matte" width="1280" height="720"></canvas>
      <canvas class="rv-ink" width="1280" height="720"></canvas>
      ${r.voice ? `
        <div class="rv-intro">
          <b class="rv-voice-lab">${escHtml(r.voice.label)}</b>
          <p class="vl-text rv-line"${r.voice.lang ? ` lang="${r.voice.lang}"` : ''}><span>${text}</span><span class="vl-fill" aria-hidden="true">${text}</span></p>
        </div>` : ''}
    </div>
    <div class="rv-bar">
      <div class="rv-tracks">
        ${rows.map(([name, shown]) => `
          <span${shown ? '' : ' hidden'}>${name}</span>
          <span class="rv-track"${shown ? '' : ' hidden'}><b class="rv-seg"></b></span>`).join('')}
      </div>
      <div class="rv-ctl">
        <button type="button" data-rv="skip">Skip to end</button>
        <button type="button" data-reveal hidden>Replay</button>
        ${volumeHtml()}
        <output class="rv-time">0:00 / 0:00</output>
      </div>
    </div>
  `;
}

// The signature's colour half and its matte half, each onto its own canvas. Once the video
// has ended its frame is empty, so the canvases keep the one before.
function paintSign(sign: HTMLVideoElement, ink: CanvasRenderingContext2D, matte: CanvasRenderingContext2D): void {
  if (sign.readyState < 2 || !sign.videoHeight || sign.ended) return;
  const half = sign.videoHeight / 2;
  ink.drawImage(sign, 0, 0, sign.videoWidth, half, 0, 0, 1280, 720);
  matte.drawImage(sign, 0, half, sign.videoWidth, half, 0, 0, 1280, 720);
}

/** Draws the stage's looping signature (the card page's Signature) over its art, for as long as it is on the page. */
export function loopSign(stage: HTMLElement): void {
  const sign = stage.querySelector<HTMLVideoElement>('.rv-sign');
  if (!sign) return;
  const ink = stage.querySelector<HTMLCanvasElement>('.rv-ink')!.getContext('2d')!;
  const matte = stage.querySelector<HTMLCanvasElement>('.rv-matte')!.getContext('2d')!;
  const loop = (): void => {
    if (!sign.isConnected) return;
    paintSign(sign, ink, matte);
    requestAnimationFrame(loop);
  };
  loop();
}

/** Plays the reveal laid out by `revealHtml` in `stage`, from a press. */
export function playReveal(stage: HTMLElement, voiceUrl?: string): void {
  const find = <T extends HTMLElement>(selector: string): T => stage.querySelector<T>(selector)!;
  const movie = find<HTMLVideoElement>('.rv-movie');
  const sign = find<HTMLVideoElement>('.rv-sign');
  const matte = find<HTMLCanvasElement>('.rv-matte').getContext('2d')!;
  const ink = find<HTMLCanvasElement>('.rv-ink').getContext('2d')!;
  const segs = Array.from(stage.querySelectorAll<HTMLElement>('.rv-seg'));
  const intro = stage.querySelector<HTMLElement>('.rv-intro');
  const voice = voiceUrl ? new Audio(voiceUrl) : undefined;
  let finished = false;
  let skipped = false;
  let started = false;   // the animation and signature have begun
  let movieDone = false;
  let signDone = false;
  let frame = 0;
  let hold = 0;

  const length = (media?: HTMLMediaElement): number => (media && Number.isFinite(media.duration) ? media.duration : 0);

  const applyVolume = (): void => {
    const level = getVolume();
    movie.volume = level;
    sign.volume = level;
    if (voice) voice.volume = level;
  };
  const stopVolume = onVolume(applyVolume);
  applyVolume();

  const drawSign = (): void => paintSign(sign, ink, matte);

  // The line first, then the animation and the signature side by side: the tracks run in that
  // order along the whole, and fill as each plays.
  function paint(): void {
    const a = length(movie);
    const b = length(sign);
    const v = length(voice);
    const lead = voice ? v + HOLD : 0;
    const total = lead + Math.max(a, b);
    const share = (x: number): number => (total ? x / total : 0);
    const set = (seg: HTMLElement | undefined, from: number, wide: number, done: number): void => {
      seg?.style.setProperty('--l', String(from));
      seg?.style.setProperty('--w', String(wide));
      seg?.style.setProperty('--p', String(skipped || finished ? 1 : done));
    };
    const spoken = v && voice ? voice.currentTime / v : 0;
    set(segs[0], 0, share(v), spoken);
    set(segs[1], share(lead), share(a), a ? movie.currentTime / a : 0);
    set(segs[2], share(lead), share(b), b ? sign.currentTime / b : 0);
    intro?.style.setProperty('--p', String(skipped ? 1 : spoken));
    const at = skipped || finished ? total
      : started ? lead + Math.max(movie.currentTime, sign.currentTime)
        : voice?.currentTime ?? 0;
    find('.rv-time').textContent = `${clock(at)} / ${clock(total)}`;
  }

  function loop(): void {
    if (started) drawSign();
    paint();
    if (!finished) frame = requestAnimationFrame(loop);
  }

  function finish(): void {
    if (finished) return;
    finished = true;
    stage.dataset.ph = 'done';
    cancelAnimationFrame(frame);
    clearTimeout(hold);
    stopVolume();
    releaseAudio(halt);
    drawSign();
    find('[data-reveal]').hidden = false;
    find('[data-rv="skip"]').hidden = true;
    paint();
  }

  // Stops all three where they are, for another sound that starts or a page that is left.
  function halt(): void {
    movie.pause();
    sign.pause();
    voice?.pause();
    finish();
  }

  const settle = (): void => {
    if (movieDone && signDone) finish();
  };

  // The animation is over: the card's own art comes up under what is left of the signature.
  const endMovie = (): void => {
    movieDone = true;
    if (!finished) stage.dataset.ph = 'end';
    settle();
  };

  // The signature is over, or cannot play, and the animation alone ends the reveal. It has
  // faded out by now, so it steps back to the frame before the fade, which is drawn once the
  // seek is done.
  const endSign = (): void => {
    signDone = true;
    if (sign.ended && length(sign)) sign.currentTime = length(sign) - FADE;
    settle();
  };

  // The animation and the signature start together, the white screen goes and the
  // animation's own white burst takes its place.
  function begin(): void {
    if (started || finished) return;
    started = true;
    stage.dataset.ph = 'play';
    void movie.play().catch(endMovie);
    void sign.play().catch(endSign);
  }

  // A browser that unlocks sound per element wants each one started by the press, so the two
  // that start later are started silent now and put back.
  function unlock(media: HTMLMediaElement): void {
    media.muted = true;
    void media.play().then(() => {
      if (!started) {
        media.pause();
        media.currentTime = 0;
      }
      media.muted = false;
    }, () => { media.muted = false; });
  }

  movie.onended = endMovie;
  movie.onerror = endMovie;
  sign.onended = endSign;
  sign.onerror = endSign;
  sign.onseeked = drawSign;
  if (voice) {
    voice.preload = 'auto';
    voice.onended = () => { hold = window.setTimeout(begin, HOLD * 1000); };
    voice.onerror = begin;
  }

  find('[data-rv="skip"]').onclick = () => {
    skipped = true;
    movie.pause();
    sign.pause();
    voice?.pause();
    // The signature's frame before its fade is what is left over the art.
    if (length(sign)) sign.currentTime = length(sign) - FADE;
    finish();
  };

  claimAudio(halt);
  unlock(movie);
  unlock(sign);
  if (voice) {
    stage.dataset.ph = 'voice';
    void voice.play().catch(begin);
  } else {
    begin();
  }
  frame = requestAnimationFrame(loop);
}
