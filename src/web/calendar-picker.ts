// The month picker's handling, for the calendar page and the topbar's menu: its steps, and the
// panel of year and months its button opens (render/holodori-calendar-html.ts draws both).

/** What a press on the picker asks for, as `monthMoved` reads it. */
export interface PickerControl {
  step?: string;
  month?: string;
}

// The panel's months stand this many to a row (.dcal-pop-months), which the up and down arrows go by.
const MONTH_COLS = 4;
const ARROWS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -MONTH_COLS, ArrowDown: MONTH_COLS };

function setOpen(drop: Element, open: boolean): void {
  drop.querySelector<HTMLElement>('.dcal-pop')!.hidden = !open;
  drop.querySelector('.dcal-select')!.setAttribute('aria-expanded', String(open));
}

// A press anywhere outside an open panel shuts it. One listener for every picker, since a view
// has no unmount to take its own away.
let watching = false;
function watchOutside(): void {
  if (watching) return;
  watching = true;
  document.addEventListener('pointerdown', (e) => {
    document.querySelectorAll('.dcal-pop:not([hidden])').forEach((pop) => {
      const drop = pop.parentElement!;
      if (!drop.contains(e.target as Node)) setOpen(drop, false);
    });
  });
}

/**
 * Works the month picker drawn inside `root`. `move` is told what was pressed and draws `root`'s
 * picker again; focus is then put on the new control that stands where the pressed one did.
 * Escape on an open panel shuts it and is marked handled (`defaultPrevented`).
 */
export function wireMonthPicker(root: HTMLElement, move: (control: PickerControl) => void): void {
  watchOutside();

  root.addEventListener('click', (e) => {
    const target = e.target as Element;
    const toggle = target.closest('.dcal-select');
    if (toggle) {
      const drop = toggle.parentElement!;
      const open = drop.querySelector<HTMLElement>('.dcal-pop')!.hidden;
      setOpen(drop, open);
      if (open) drop.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
      return;
    }
    const button = target.closest<HTMLButtonElement>('button[data-step], button[data-month]');
    if (!button || button.disabled) return;
    const { step, month } = button.dataset;
    // A year's step leaves the panel open for the month that is to be picked in it.
    const stay = step !== undefined && button.closest('.dcal-pop') !== null;
    move({ step, month });
    if (stay) setOpen(root.querySelector('.dcal-drop')!, true);
    root.querySelector<HTMLElement>(step ? `[data-step="${step}"]:not(:disabled)` : '.dcal-select')?.focus();
  });

  root.addEventListener('keydown', (e) => {
    const pop = root.querySelector<HTMLElement>('.dcal-pop:not([hidden])');
    if (!pop) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(pop.parentElement!, false);
      pop.parentElement!.querySelector<HTMLElement>('.dcal-select')!.focus();
      return;
    }
    const from = (e.target as Element).closest<HTMLElement>('[data-month]');
    if (!from || !(e.key in ARROWS)) return;
    e.preventDefault();
    pop.querySelector<HTMLElement>(`[data-month="${Number(from.dataset.month) + ARROWS[e.key]}"]`)?.focus();
  });
}
