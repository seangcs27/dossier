// What every roster that hangs the filter panel from the topbar's search box shares, apart
// from the grid that first wrote it (views/grid.ts): so the Endfield, FGO, Path to Nowhere and
// hololive Dreams pages need not load the Arknights grid and its data to have it.

// A selector that finds the same control again after renderMore() rebuilds the panel.
// Every panel control is identified by its id or by its data-* attributes.
export function focusSelector(el: HTMLElement): string | null {
  const control = el.closest<HTMLElement>('button');
  if (!control) return null;
  if (control.id) return `#${CSS.escape(control.id)}`;
  const attrs = Object.entries(control.dataset)
    .map(([k, v]) => `[data-${k}="${CSS.escape(v ?? '')}"]`).join('');
  return attrs ? `button${attrs}` : null;
}

// A filter control's answer to a press. The panel is rebuilt on every change, so the control
// pressed is gone by the release: its replacement settles from the press (styles.scss holds it
// down while pressed) with a small overshoot.
export function settlePress(control: HTMLElement): void {
  control.animate(
    [{ transform: 'scale(0.92)' }, { transform: 'scale(1.04)', offset: 0.6 }, { transform: 'none' }],
    { duration: 220, easing: 'ease-out' },
  );
}

// The panel's lines, top to bottom: a group's name, then each line its buttons wrap to. A
// line is the largest boxes that each stand on one line, so a row of buttons in a frame of
// its own (Server, Game mode) moves with its frame, and tiles that wrap to two lines move as
// two. Found by height, so it holds for any game's panel.
function linesOf(panel: HTMLElement): Element[][] {
  const found: { el: Element; top: number }[] = [];
  const split = (el: Element): void => {
    const kids = Array.from(el.children)
      .map(kid => ({ el: kid, box: kid.getBoundingClientRect() }))
      .filter(kid => kid.box.height > 0);
    const tops = kids.map(kid => kid.box.top);
    if (el !== panel && (el.matches('button') || !kids.length || Math.max(...tops) - Math.min(...tops) <= 6)) {
      found.push({ el, top: el.getBoundingClientRect().top });
    } else kids.forEach(kid => split(kid.el));
  };
  split(panel);
  const lines: Element[][] = [];
  let top = -Infinity;
  for (const part of found.sort((a, b) => a.top - b.top)) {
    if (part.top - top > 6) {
      lines.push([]);
      top = part.top;
    }
    lines[lines.length - 1].push(part.el);
  }
  return lines;
}

// The panel's lines rising into place one after another as it opens, once the folder behind
// them has opened out (styles.scss). Played from the press that opens it, not from CSS: the
// panel is rebuilt on every change, and a CSS animation would play again on each.
export function riseLines(): void {
  const lines = linesOf(document.getElementById('more-filters')!);
  // A tall panel's lines come closer together, so the last is in place within about 1.6 s.
  const gap = Math.min(70, 840 / lines.length);
  lines.forEach((line, i) => line.forEach(el => el.animate(
    [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }],
    { duration: 380, delay: 360 + i * gap, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'backwards' },
  )));
}

// The lines sinking out while the panel shuts, if they are.
let sinking: Animation[] | null = null;

/**
 * Shuts the panel the way it opened, backwards: its lines sink out from the last up, quicker
 * than they rose, and then `shut` (the view's own closing) folds it away. A second call while
 * they sink changes nothing.
 */
export function sinkLines(shut: () => void): void {
  if (sinking) return;
  const lines = linesOf(document.getElementById('more-filters')!).reverse();
  const gap = Math.min(40, 400 / lines.length);
  const anims = lines.flatMap((line, i) => line.map(el => el.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px)' }],
    { duration: 220, delay: i * gap, easing: 'ease-in', fill: 'forwards' },
  )));
  sinking = anims;
  // Each sunk line stays out of sight until the panel is next drawn, which replaces it.
  void Promise.all(anims.map(a => a.finished)).then(() => {
    if (sinking !== anims) return;
    sinking = null;
    shut();
  }, () => {});
}

/** The toggle pressed while the lines sink: they rise back and the panel stays open. True if they were sinking. */
export function unsink(): boolean {
  if (!sinking) return false;
  sinking.forEach(a => a.reverse());
  sinking = null;
  return true;
}

// Watches the two sizes the filter panel's shape is drawn from (.filter-blob in styles.scss):
// how wide the buttons' part of the search box is, which is the tab's width, and how tall
// the box is, which is the tab's height. The first changes with the Filters label and all the
// way through Clear and the close button folding in or out, so it is observed, not read once.
let tabWatch: ResizeObserver | undefined;

// Started by whichever grid mounts first. The Endfield grid (views/endfield.ts) hangs the
// same panel from the same box, and a visitor can open that page before this one.
export function watchFilterTab(actions: HTMLElement, wrap: HTMLElement): void {
  if (tabWatch) return;
  const tab = actions.querySelector<HTMLElement>('.filter-tab')!;
  tabWatch = new ResizeObserver(() => {
    actions.style.setProperty('--tab-w', `${tab.offsetWidth}px`);
    actions.style.setProperty('--box-h', `${wrap.offsetHeight}px`);
  });
  tabWatch.observe(tab);
}
