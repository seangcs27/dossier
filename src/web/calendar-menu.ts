// The calendar icon's menu in the topbar (hololive Dreams only): pointed at, or focused by the
// keyboard, it drops a small calendar down, with a month picker over it as a date picker has
// one; pressed, the icon is a link to the calendar page. The month is drawn the first time it
// is wanted, from a chunk of its own, so that no page carries the cast for a menu that is
// never opened.

const OPEN_DELAY_MS = 120;
// Long enough to cross the gap between the icon and the menu.
const CLOSE_DELAY_MS = 220;

export function mountCalendarMenu(): void {
  const link = document.getElementById('nav-calendar') as HTMLAnchorElement;
  const menu = document.getElementById('cal-menu')!;
  let timer = 0;
  let wanted = false;
  // A month or year list is open: its popup is the browser's and takes the pointer off the menu.
  let picking = false;
  let drawnOn = '';
  let shown = { y: 0, m: 0 };
  let html: typeof import('./render/holodori-calendar-html') | undefined;

  const draw = (): void => { menu.innerHTML = html!.calendarMenuHtml(Date.now(), shown.y, shown.m); };

  const close = (): void => {
    wanted = false;
    picking = false;
    window.clearTimeout(timer);
    menu.hidden = true;
    link.setAttribute('aria-expanded', 'false');
  };

  // Leaving the page puts the month back to this one for the next time the menu is wanted.
  const leave = (): void => { drawnOn = ''; close(); };

  const open = async (): Promise<void> => {
    wanted = true;
    html ??= await import('./render/holodori-calendar-html');
    // Pointed away while the chunk came, or the page changed under it.
    if (!wanted || link.hidden) return;
    // A day on, a page left open overnight would show yesterday: start again from this month.
    const day = new Date().toDateString();
    if (drawnOn !== day) {
      const now = new Date();
      shown = { y: now.getFullYear(), m: now.getMonth() };
      draw();
      drawnOn = day;
    }
    menu.hidden = false;
    link.setAttribute('aria-expanded', 'true');
  };

  const later = (want: boolean, delay: number): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (want) void open();
      else if (!picking) close();
    }, delay);
  };

  // A step or a chosen month or year: draw again, and keep focus on the control's twin.
  const move = (control: HTMLElement, value?: string): void => {
    shown = html!.monthMoved(shown.y, shown.m, Date.now(), {
      step: control.dataset.step, pick: control.dataset.pick, value,
    });
    picking = false;
    draw();
    const twin = control.dataset.step ? `[data-step="${control.dataset.step}"]` : `[data-pick="${control.dataset.pick}"]`;
    menu.querySelector<HTMLElement>(twin)?.focus();
  };

  for (const el of [link, menu]) {
    // A finger has no hover: its tap is the press, which opens the page.
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') later(true, OPEN_DELAY_MS); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') later(false, CLOSE_DELAY_MS); });
    el.addEventListener('focusin', () => later(true, 0));
    el.addEventListener('focusout', (e) => {
      if (!link.contains(e.relatedTarget as Node | null) && !menu.contains(e.relatedTarget as Node | null)) {
        picking = false;
        later(false, 0);
      }
    });
  }
  menu.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('select')) picking = true;
  });
  menu.addEventListener('focusout', (e) => {
    if ((e.target as Element).closest('select')) picking = false;
  });
  menu.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    if (select.dataset.pick) move(select, select.value);
  });
  menu.addEventListener('click', (e) => {
    const step = (e.target as Element).closest<HTMLElement>('button[data-step]');
    if (step) { move(step); return; }
    // A press on a row is a link to somebody: the menu goes with the page.
    if ((e.target as Element).closest('a')) leave();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); link.focus(); }
  });
  link.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Any way to another page puts it away: a press on the icon, a change of address, and
  // Astro's swap of the page.
  link.addEventListener('click', leave);
  window.addEventListener('hashchange', leave);
  document.addEventListener('astro:before-swap', leave);
}
