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

// The panel's groups rising into place one after another as it opens, once the shape behind
// them has mostly grown (styles.scss). Played from the press that opens it, not from CSS:
// the panel is rebuilt on every change, and a CSS animation would play again on each.
export function riseGroups(): void {
  Array.from(document.getElementById('more-filters')!.children).forEach((group, i) => {
    group.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 260, delay: 360 + i * 45, easing: 'ease-out', fill: 'backwards' },
    );
  });
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
