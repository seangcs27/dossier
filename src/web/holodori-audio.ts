// What hololive Dreams' pages have in common when they play something: a voice line, a card's
// reveal and a song's clip never sound at once, and none outlives the page that started it.

let stopCurrent: (() => void) | undefined;

/** Makes `stop` the sound that is on, after stopping whichever was. */
export function claimAudio(stop: () => void): void {
  if (stopCurrent && stopCurrent !== stop) stopCurrent();
  stopCurrent = stop;
}

/** Says `stop`'s sound has ended of itself, so nothing is left to stop. */
export function releaseAudio(stop: () => void): void {
  if (stopCurrent === stop) stopCurrent = undefined;
}

/** Stops whatever is playing. */
export function stopAudio(): void {
  const stop = stopCurrent;
  stopCurrent = undefined;
  stop?.();
}

// A change of page ends it: what plays is never in the page that comes next.
window.addEventListener('hashchange', stopAudio);
document.addEventListener('astro:before-swap', stopAudio);

// ── Volume ──
// One volume for every sound the pages play (the voice lines, a reveal's three parts, and a
// song's clip, which holodori-clip.ts sets on YouTube's player), kept in localStorage.
// Every slider and mute button on the page is the same one, found by class and kept in step
// from here, so a page's views need only put `volumeHtml()` in and ask `getVolume()`.

const VOLUME_KEY = 'holodori-volume';
let volume = 0.25;
let before = 0.25;   // what the volume goes back to when mute is pressed again
const listeners = new Set<() => void>();

try {
  const saved = localStorage.getItem(VOLUME_KEY);
  if (saved !== null && Number.isFinite(Number(saved))) volume = Math.min(1, Math.max(0, Number(saved)));
} catch {
  // Storage can be blocked, in a private window; the volume then starts at a quarter.
}
if (volume > 0) before = volume;

/** The volume, 0 to 1; 0 is muted. */
export function getVolume(): number {
  return volume;
}

/** Calls `listener` whenever the volume changes; returns the call that stops it. */
export function onVolume(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Puts every slider and mute button in step with the volume: a page drawn at build time shows the default. */
export function paintVolume(): void {
  document.querySelectorAll<HTMLInputElement>('.vol-range').forEach((range) => { range.value = String(Math.round(volume * 100)); });
  document.querySelectorAll<HTMLElement>('.vol-mute').forEach((button) => {
    button.classList.toggle('is-muted', volume === 0);
    button.setAttribute('aria-pressed', String(volume === 0));
  });
}

function setVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next));
  if (volume > 0) before = volume;
  try {
    localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Not kept; it holds for this visit.
  }
  paintVolume();
  listeners.forEach(listener => listener());
}

document.addEventListener('input', (e) => {
  const range = (e.target as Element).closest<HTMLInputElement>('.vol-range');
  if (range) setVolume(Number(range.value) / 100);
});
document.addEventListener('click', (e) => {
  if ((e.target as Element).closest('.vol-mute')) setVolume(volume === 0 ? before : 0);
});

/** A speaker button that mutes and a slider beside it, for any page that plays sound. */
export function volumeHtml(): string {
  return `
    <span class="vol">
      <button class="vol-mute${volume === 0 ? ' is-muted' : ''}" type="button" aria-label="Mute" aria-pressed="${volume === 0}">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path class="vol-cone" d="M2 6h3l4-3v10l-4-3H2z"></path>
          <path class="vol-waves" d="M11.2 5.6a3.4 3.4 0 010 4.8M13 3.8a6 6 0 010 8.4"></path>
          <path class="vol-slash" d="M11 6l4 4M15 6l-4 4"></path>
        </svg>
      </button>
      <input class="vol-range" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}" aria-label="Volume">
    </span>
  `;
}

/** Seconds as the game's players show them: 0:07, 1:32. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * A strip of bars, the same for the same `seed`: the shape of a line is for the eye, not read
 * from its audio. The second copy is clipped to what has played (`--p`, 0 to 1, set on the
 * strip's owner), so a line fills as it goes.
 */
export function waveHtml(seed: string, bars = 36): string {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let out = '';
  for (let i = 0; i < bars; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    out += `<i style="height: ${28 + (h % 72)}%"></i>`;
  }
  return `<span class="wave" aria-hidden="true"><span>${out}</span><span class="wave-on">${out}</span></span>`;
}
