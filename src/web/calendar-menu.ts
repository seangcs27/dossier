// The calendar icon's menu in the topbar (hololive Dreams only): pointed at, or focused by the
// keyboard, it drops a small calendar down, with a month picker over it as a date picker has
// one; pressed, the icon is a link to the calendar page. The month is drawn the first time it
// is wanted, from a chunk of its own, so that no page carries the cast for a menu that is
// never opened.

import { wireMonthPicker } from './calendar-picker';

const OPEN_DELAY_MS = 120;
// Long enough to cross the gap between the icon and the menu.
const CLOSE_DELAY_MS = 220;

export function mountCalendarMenu(): void {
  const link = document.getElementById('nav-calendar') as HTMLAnchorElement;
  const menu = document.getElementById('cal-menu')!;
  let timer = 0;
  let wanted = false;
  let drawnOn = '';
  let shown = { y: 0, m: 0 };
  let html: typeof import('./render/holodori-calendar-html') | undefined;

  const draw = (): void => { menu.innerHTML = html!.calendarMenuHtml(Date.now(), shown.y, shown.m); };

  const close = (): void => {
    wanted = false;
    window.clearTimeout(timer);
    menu.hidden = true;
    link.setAttribute('aria-expanded', 'false');
    // Drawn again, so that the picker's panel is shut the next time the menu opens.
    if (drawnOn) draw();
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
      else close();
    }, delay);
  };

  // Before the menu's own Escape below: the picker's shuts its panel first and marks the key handled.
  wireMonthPicker(menu, (control) => {
    shown = html!.monthMoved(shown.y, shown.m, Date.now(), control);
    draw();
  });

  for (const el of [link, menu]) {
    // A finger has no hover: its tap is the press, which opens the page.
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') later(true, OPEN_DELAY_MS); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') later(false, CLOSE_DELAY_MS); });
    el.addEventListener('focusin', () => later(true, 0));
    el.addEventListener('focusout', (e) => {
      // A press on the menu's bare ground takes the focus too, with the pointer still on the menu.
      if (!link.contains(e.relatedTarget as Node | null) && !menu.contains(e.relatedTarget as Node | null) && !menu.matches(':hover')) {
        later(false, 0);
      }
    });
  }
  menu.addEventListener('click', (e) => {
    // A press on a row is a link to somebody: the menu goes with the page.
    if ((e.target as Element).closest('a')) leave();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented) { close(); link.focus(); }
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
