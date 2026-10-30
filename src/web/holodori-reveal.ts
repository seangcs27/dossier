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
  voice?: { text: string; lang?: string };
  // The emblem behind the line, a white-on-transparency picture painted in a gradient of two
  // of her colours: her mascot, as the game shows there.
  mark?: { url: string; from: string; to: string };
}

// The line's screen, as a recording of the game shows it (29 October 2026, the owner's): her
// emblem large and faint behind the words, and four-pointed sparkles twinkling over the white
// at places of their own. Where they stand is drawn from the card (a seed from its animation's
// address), so a card's screen is the same each time and two cards' are not.
const SPARKS = 48;

function sparksHtml(seed: string): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = (): number => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  return Array.from({ length: SPARKS }, () => {
    const size = 14 + next() * next() * 30;
    return `<i class="rv-spark" style="left: ${(next() * 100).toFixed(1)}%; top: ${(next() * 100).toFixed(1)}%;`
      + ` --s: ${size.toFixed(1)}px; --t: ${(1.4 + next() * 1.6).toFixed(2)}s; --d: -${(next() * 3).toFixed(2)}s"></i>`;
  }).join('');
}

// The tracks folded away, leaving the buttons: kept from one reveal to the next while the
// page is open.
let folded = false;

// Seconds the white screen is held after the line ends, before the animation.
const HOLD = 0.4;

// The signature fades out in the last half-second of its video (9 s on every card checked);
// the frame this many seconds before the end is the one that stays over the art.
const FADE = 0.6;

/** The reveal's screen, and its three tracks with the seek bar over them and its buttons floating over the screen's foot, in place of a stage's picture. */
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
          <div class="rv-sparks" aria-hidden="true">${sparksHtml(r.movie)}</div>
          ${r.mark ? `<canvas class="rv-mark" width="512" height="512" aria-hidden="true"
                    data-src="${escHtml(r.mark.url)}" data-from="${escHtml(r.mark.from)}" data-to="${escHtml(r.mark.to)}"></canvas>` : ''}
          <p class="vl-text rv-line"${r.voice.lang ? ` lang="${r.voice.lang}"` : ''}>${text}</p>
        </div>` : ''}
    </div>
    <div class="rv-bar">
      <div class="rv-tracks">
        ${rows.map(([name, shown]) => `
          <span${shown ? '' : ' hidden'}>${name}</span>
          <span class="rv-track"${shown ? '' : ' hidden'}><b class="rv-seg"></b></span>`).join('')}
        <div class="rv-scrub">
          <input class="rv-seek" type="range" min="0" max="1" step="any" value="0" aria-label="Seek">
          <b class="rv-head" aria-hidden="true"></b>
        </div>
      </div>
      <div class="rv-ctl">
        <button class="rv-fold" type="button" data-rv="fold" aria-pressed="${folded}" aria-label="Hide the tracks">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6.5l4 4 4-4"></path></svg>
        </button>
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

// The emblem, onto its canvas, as the game draws it there: her mascot's line art in her
// gradient. The picture is the line art alone (baked by hand from the game's mascot, motifUrl),
// thickened a little by drawing it round a small circle, then the gradient is laid over what
// was drawn (source-in). It is drawn at 80% of the canvas.
const LINE = 3;  // how far the lines are thickened, on the 512px canvas

function paintMark(stage: HTMLElement): void {
  const canvas = stage.querySelector<HTMLCanvasElement>('.rv-mark');
  if (!canvas || canvas.dataset.painted) return;
  canvas.dataset.painted = '1';
  const picture = new Image();
  picture.onload = () => {
    const ctx = canvas.getContext('2d')!;
    const { width: w, height: h } = canvas;
    const size = w * 0.8;
    const at = (w - size) / 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      ctx.drawImage(picture, at + LINE * Math.cos(a), at + LINE * Math.sin(a), size, size);
    }
    ctx.globalCompositeOperation = 'source-in';
    const gradient = ctx.createLinearGradient(0, 0, w * 0.6, h);
    gradient.addColorStop(0, canvas.dataset.from!);
    gradient.addColorStop(1, canvas.dataset.to!);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };
  picture.src = canvas.dataset.src!;
}

/** Plays the reveal laid out by `revealHtml` in `stage`, from a press. */
export function playReveal(stage: HTMLElement, voiceUrl?: string): void {
  const find = <T extends HTMLElement>(selector: string): T => stage.querySelector<T>(selector)!;
  const movie = find<HTMLVideoElement>('.rv-movie');
  const sign = find<HTMLVideoElement>('.rv-sign');
  const matte = find<HTMLCanvasElement>('.rv-matte').getContext('2d')!;
  const ink = find<HTMLCanvasElement>('.rv-ink').getContext('2d')!;
  const segs = Array.from(stage.querySelectorAll<HTMLElement>('.rv-seg'));
  const seek = find<HTMLInputElement>('.rv-seek');
  const scrub = find('.rv-scrub');
  const corner = find('.hc-play');
  const voice = voiceUrl ? new Audio(voiceUrl) : undefined;
  let finished = false;
  let paused = false;
  let shownAt = 0;       // seconds into the whole, as last painted: where a pause resumes from
  let dragging = false;  // the seek bar is held, so the playback does not move its thumb
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
  let stopVolume = onVolume(applyVolume);
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
    const at = skipped || finished ? total
      : started ? lead + Math.max(movie.currentTime, sign.currentTime)
        : voice?.currentTime ?? 0;
    shownAt = at;
    find('.rv-time').textContent = `${clock(at)} / ${clock(total)}`;
    if (total) seek.max = String(total);
    if (!dragging) seek.value = String(at);
    seek.setAttribute('aria-valuetext', `${clock(Number(seek.value))} of ${clock(total)}`);
    scrub.style.setProperty('--at', String(share(Number(seek.value))));
  }

  function loop(): void {
    // The Sound toggle beside Play mutes all three at once, playing or not.
    const mute = stage.dataset.sound === 'off';
    movie.muted = mute;
    sign.muted = mute;
    if (voice) voice.muted = mute;
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
    find('.rv-ctl [data-reveal]').hidden = false;
    find('[data-rv="skip"]').hidden = true;
    corner.setAttribute('aria-label', 'Replay');
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

  const skip = (): void => {
    skipped = true;
    movie.pause();
    sign.pause();
    voice?.pause();
    // The signature's frame before its fade is what is left over the art.
    if (length(sign)) sign.currentTime = length(sign) - FADE;
    finish();
  };
  find('[data-rv="skip"]').onclick = skip;

  const fold = find('[data-rv="fold"]');
  const showFold = (): void => {
    stage.toggleAttribute('data-fold', folded);
    fold.setAttribute('aria-pressed', String(folded));
    fold.setAttribute('aria-label', folded ? 'Show the tracks' : 'Hide the tracks');
  };
  fold.onclick = () => {
    folded = !folded;
    showFold();
  };
  showFold();

  // Plays on from `t` seconds into the whole, finished or not: in the line, in the hold after
  // it, or in the animation and the signature, each put where it is at that moment.
  function jump(t: number): void {
    const a = length(movie);
    const b = length(sign);
    const v = length(voice);
    const lead = voice ? v + HOLD : 0;
    const total = lead + Math.max(a, b);
    if (!total) return;
    if (t >= total) {
      skip();
      return;
    }
    clearTimeout(hold);
    skipped = false;
    paused = false;
    delete stage.dataset.paused;
    corner.setAttribute('aria-label', 'Pause');
    if (finished) {
      finished = false;
      stopVolume = onVolume(applyVolume);
      find('.rv-ctl [data-reveal]').hidden = true;
      find('[data-rv="skip"]').hidden = false;
      frame = requestAnimationFrame(loop);
    }
    claimAudio(halt);
    const into = Math.max(0, t) - lead;
    started = into >= 0;
    movieDone = into >= a;
    signDone = into >= b;
    if (voice) {
      voice.currentTime = Math.min(Math.max(0, t), v);
      if (t < v) void voice.play().catch(begin);
      else voice.pause();
    }
    if (!started) {
      movie.pause();
      sign.pause();
      movie.currentTime = 0;
      sign.currentTime = 0;
      stage.dataset.ph = 'voice';
      if (t >= v) hold = window.setTimeout(begin, (lead - t) * 1000);
      return;
    }
    stage.dataset.ph = movieDone ? 'end' : 'play';
    movie.currentTime = Math.min(into, a);
    if (movieDone) movie.pause();
    else void movie.play().catch(endMovie);
    // A signature that is over stays on its frame before the fade, as at its end.
    sign.currentTime = signDone ? b - FADE : into;
    if (signDone) sign.pause();
    else void sign.play().catch(endSign);
  }

  // Stops all three where they are, to go on from there (`jump`) on the next press. A pause in
  // the hold after the line goes on from the line's end, the hold whole.
  function pause(): void {
    paused = true;
    stage.dataset.paused = '';
    clearTimeout(hold);
    movie.pause();
    sign.pause();
    voice?.pause();
    corner.setAttribute('aria-label', 'Play');
  }
  const toggle = (): void => (paused ? jump(shownAt) : pause());
  // The play button in the corner and a press on the screen pause and go on; once the reveal is
  // over, the button's press goes on to the view, which plays it again.
  corner.onclick = (e) => {
    if (finished) return;
    e.stopPropagation();
    toggle();
  };
  find('.rv-screen').onclick = () => {
    if (!finished) toggle();
  };

  seek.oninput = () => jump(Number(seek.value));
  seek.onpointerdown = () => {
    dragging = true;
    document.addEventListener('pointerup', () => { dragging = false; }, { once: true });
  };
  // A second a press of an arrow key, which a bar with no step does not have.
  seek.onkeydown = (e) => {
    const by = ({ ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 } as Record<string, number>)[e.key];
    if (!by) return;
    e.preventDefault();
    jump(Number(seek.value) + by);
  };

  // The floating bar shows while the pointer moves over the stage, and goes 1 s after it
  // stops or at once when it leaves (the stylesheet keeps it while paused or over).
  let idle = 0;
  const wake = (): void => {
    delete stage.dataset.idle;
    clearTimeout(idle);
    idle = window.setTimeout(() => { stage.dataset.idle = ''; }, 1000);
  };
  stage.onpointermove = wake;
  stage.onpointerdown = wake;
  stage.onpointerleave = () => {
    clearTimeout(idle);
    stage.dataset.idle = '';
  };
  wake();

  paintMark(stage);
  corner.setAttribute('aria-label', 'Pause');
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
