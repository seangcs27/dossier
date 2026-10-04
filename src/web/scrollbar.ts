// Lights a box's scrollbar while the box is being scrolled, and lets it go a moment after.
//
// The two colours are the stylesheet's (--thumb, and .is-scrolling for the lit one). What
// is done here is the easing between them, by hand: a CSS transition would have to be added
// to each scroller's own `transition` list, and the filter panel's and the artwork viewer's
// already hold theirs. Each change starts from whatever colour the thumb is at, so a scroll
// that resumes while the light is fading turns back from there rather than jumping.

/** How long after the last scroll event a scrollbar stays lit. */
const LINGER_MS = 700;

const lingering = new WeakMap<Element, number>();

function light(el: HTMLElement, on: boolean): void {
  const from = getComputedStyle(el).getPropertyValue('--thumb');
  el.classList.toggle('is-scrolling', on);
  // Only the first keyframe is given: the last is the colour the class has just set.
  el.animate([{ '--thumb': from }, {}], { duration: on ? 120 : 600, easing: 'ease-out' });
}

export function mountScrollbars(): void {
  // Scroll events do not bubble, so they are caught on the way down. The page's own arrive
  // with the document as their target, and are lit on the body: that is the element the
  // browser styles the page's scrollbar from. On <html> the colour changed in the computed
  // style and never in the pixels.
  document.addEventListener('scroll', (e) => {
    const el = e.target === document ? document.body : e.target as HTMLElement;
    if (!lingering.has(el)) light(el, true);
    window.clearTimeout(lingering.get(el));
    lingering.set(el, window.setTimeout(() => {
      lingering.delete(el);
      light(el, false);
    }, LINGER_MS));
  }, { capture: true, passive: true });
}
