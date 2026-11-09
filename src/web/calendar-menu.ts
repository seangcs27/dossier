// The calendar icon's menu in the topbar (hololive Dreams only): pointed at, or focused by the
// keyboard, it drops this month down small with who is next; pressed, the icon is a link to the
// calendar page. The month is drawn the first time it is wanted, from a chunk of its own, so
// that no page carries the cast for a menu that is never opened.

const OPEN_DELAY_MS = 120;
// Long enough to cross the gap between the icon and the menu.
const CLOSE_DELAY_MS = 220;

export function mountCalendarMenu(): void {
  const link = document.getElementById('nav-calendar') as HTMLAnchorElement;
  const menu = document.getElementById('cal-menu')!;
  let timer = 0;
  let wanted = false;
  let drawnOn = '';

  const close = (): void => {
    wanted = false;
    window.clearTimeout(timer);
    menu.hidden = true;
    link.setAttribute('aria-expanded', 'false');
  };

  const open = async (): Promise<void> => {
    wanted = true;
    const { calendarMenuHtml } = await import('./render/holodori-calendar-html');
    // Pointed away while the chunk came, or the page changed under it.
    if (!wanted || link.hidden) return;
    // The month is drawn again once a day: a page left open overnight would show yesterday's.
    const day = new Date().toDateString();
    if (drawnOn !== day) {
      menu.innerHTML = calendarMenuHtml(Date.now());
      drawnOn = day;
    }
    menu.hidden = false;
    link.setAttribute('aria-expanded', 'true');
  };

  const later = (want: boolean, delay: number): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => { if (want) void open(); else close(); }, delay);
  };

  for (const el of [link, menu]) {
    // A finger has no hover: its tap is the press, which opens the page.
    el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') later(true, OPEN_DELAY_MS); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') later(false, CLOSE_DELAY_MS); });
    el.addEventListener('focusin', () => later(true, 0));
    el.addEventListener('focusout', (e) => {
      if (!link.contains(e.relatedTarget as Node | null) && !menu.contains(e.relatedTarget as Node | null)) later(false, 0);
    });
  }
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); link.focus(); }
  });
  link.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  // Any way to another page puts it away: a press on the icon or on a row, a change of address,
  // and Astro's swap of the page.
  link.addEventListener('click', close);
  menu.addEventListener('click', close);
  window.addEventListener('hashchange', close);
  document.addEventListener('astro:before-swap', close);
}
