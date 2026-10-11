// The fill behind whichever section link is showing (Operators, Events), and how it gets
// from one to the other: as a drop of water would. One blob (.sections-blob) travels from
// the link left to the link arrived at, its front edge setting off first so that it draws
// out on the way, and a thinner tail (.sections-drop) trails from its back end and is
// pulled in after it. Both sit in a layer that the #goo-drop filter in index.html runs
// together, which is what tapers the tail into the blob.
//
// The blob is placed by measuring the link, as the filter panel's tab is (views/grid.ts):
// a filter makes its layer the containing block of everything inside it, so the blob
// cannot be laid out against the links themselves.
//
// It plays whatever `prefers-reduced-motion` says, like the filter panel and for its
// reason (styles.scss, .filter-pop): one small move, set off by the reader's own press, on
// a machine whose owner has that setting on and asked for this.

interface Box { x: number; y: number; w: number; h: number }

const DURATION_MS = 520;
// The move is written out frame by frame, not left to an easing: the tail's length is the
// gap between two edges that each ease on their own, which no single easing describes.
const STEPS = 24;
// How far into the move the blob's back edge, and then the tail's end, set off.
const BACK_LAG = 0.12;
const TAIL_LAG = 0.34;
// How far the tail reaches inside the blob, so that the two never part.
const OVERLAP = 12;
// The tail is 60% of the blob's height where it leaves it and 30% once drawn out this far.
// Under the filter's blur a strip much thinner than that is cut away altogether.
const THIN_AT = 56;

const layer = document.querySelector<HTMLElement>('.sections-goo')!;
const blob = layer.querySelector<HTMLElement>('.sections-blob')!;
const drop = layer.querySelector<HTMLElement>('.sections-drop')!;
let shown: HTMLElement | undefined;

// An element's box within the layer. From the rectangles, which keep the fractions of a
// pixel that offsetLeft rounds away.
function boxOf(el: HTMLElement): Box {
  const base = layer.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return { x: rect.left - base.left, y: rect.top - base.top, w: rect.width, h: rect.height };
}

const px = (box: Box): Keyframe => ({
  left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`,
});

// Puts the blob under the link being shown, with no move: on arriving at a page, and
// whenever a link's box changes (another game's word for its cast, a phone's smaller type).
function place(): void {
  if (shown) Object.assign(blob.style, px(boxOf(shown)));
}

const easeOut = (t: number): number => 1 - (1 - t) ** 3;
// The progress of an edge that sets off `lag` of the way into the move.
const late = (t: number, lag: number): number => easeOut(Math.max(0, (t - lag) / (1 - lag)));
const mix = (a: number, b: number, p: number): number => a + (b - a) * p;

function travel(from: Box, to: Box): void {
  const forward = to.x + to.w / 2 >= from.x + from.w / 2;
  const blobFrames: Keyframe[] = [];
  const dropFrames: Keyframe[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const front = easeOut(t);
    const back = late(t, BACK_LAG);
    const left = mix(from.x, to.x, forward ? back : front);
    const right = mix(from.x + from.w, to.x + to.w, forward ? front : back);
    const y = mix(from.y, to.y, front);
    const h = mix(from.h, to.h, front);
    blobFrames.push(px({ x: left, y, w: right - left, h }));

    // The tail runs from the end still on its way to a little inside the blob's back edge,
    // and is thinner the further it is drawn out. At both ends of the move it is no longer
    // than that overlap, and so out of sight inside the blob.
    const tail = late(t, TAIL_LAG);
    const end = forward ? mix(from.x, to.x, tail) : mix(from.x + from.w, to.x + to.w, tail);
    const join = forward ? left + OVERLAP : right - OVERLAP;
    const length = Math.abs(join - end);
    const thick = h * mix(0.6, 0.3, Math.min(1, length / THIN_AT));
    dropFrames.push(px({ x: Math.min(end, join), y: y + (h - thick) / 2, w: length, h: thick }));
  }
  blob.animate(blobFrames, DURATION_MS);
  drop.animate(dropFrames, DURATION_MS);
}

/**
 * Marks `link` as the section being shown: the fill goes under it, travelling there if it
 * was under the other link. A press made mid-move sets off from wherever the blob has got to.
 */
export function markSection(link: HTMLElement): void {
  // Called again for the link already marked, it must leave a move in progress alone: one
  // change of page reaches the router twice, as a popstate and then as a hashchange. The
  // link's box may still have changed, with the game and so its label.
  if (link === shown) {
    place();
    return;
  }
  const arriving = shown === undefined;
  const from = boxOf(blob);
  shown = link;
  place();
  for (const el of [blob, drop]) {
    for (const running of el.getAnimations()) running.cancel();
  }
  if (!arriving) travel(from, boxOf(link));
}

const resized = new ResizeObserver(place);
layer.parentElement!.querySelectorAll('.section-link').forEach(link => resized.observe(link));
