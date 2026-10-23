// The Global server's schedule: its events and headhunting pools — running, announced, and
// predicted from what CN has already run — as two lists and a month calendar. Modelled on
// Arkpedia's Schedule page (arkpedia.net/schedule), which draws on the same wiki tables.
//
// Everything comes from the bundled events.json, so this view makes no data requests. Where
// an entry falls (live, upcoming, over) is decided by the reader's clock, not at build
// time: the page is read for up to a week after the build that baked it. The page is drawn by
// render/events-html.ts; this keeps what the calendar remembers, its controls and the clock.
import { getEvents, getPools } from '../event-index';
import { calendarMonth, eventsPageHtml, eventsPanelHtml, sectionsOf, shapeOf } from '../render/events-html';
import type { CalendarView } from '../render/events-html';
import { whenText } from '../render/events-clock';
import type { EventsTab } from '../router';

// Which month the calendar shows, as months since year 0; unset until first opened, when it
// becomes the server's current month. Kept across visits, like the grid's filters.
let calMonth: number | undefined;
let calPools = false;

// The one countdown timer, whichever list is showing.
let ticker = 0;

export function mountEvents(container: HTMLElement, tab: EventsTab): void {
  // The grid's controls have no meaning here, the same as on a detail page.
  document.querySelector<HTMLElement>('.search-wrap')!.style.display = 'none';
  document.querySelector<HTMLElement>('.topbar-actions')!.style.display = 'none';
  document.getElementById('more-filters')!.hidden = true;
  document.getElementById('count')!.textContent = '';

  // What the calendar remembers, with the month it settles on kept for the next step.
  const calendar = (now: number): CalendarView => {
    const view = { month: calMonth, pools: calPools };
    if (tab === 'calendar') calMonth = view.month = calendarMonth(now, view);
    return view;
  };
  const panelHtml = (): string => {
    const now = Date.now();
    return eventsPanelHtml(tab, now, calendar(now));
  };

  const opened = Date.now();
  container.innerHTML = eventsPageHtml(tab, opened, calendar(opened));

  // The calendar's own controls. Assigned rather than added: this runs on every visit, and
  // the detail page leaves its handler on the same element.
  container.onclick = (ev) => {
    const control = (ev.target as Element).closest<HTMLButtonElement>('[data-cal]');
    if (!control || calMonth === undefined) return;
    switch (control.dataset.cal) {
      case 'prev':  calMonth -= 1; break;
      case 'next':  calMonth += 1; break;
      case 'today': calMonth = undefined; break;
      case 'pools': calPools = !calPools; break;
    }
    const panel = container.querySelector<HTMLElement>('#ev-panel')!;
    panel.innerHTML = panelHtml();
    // The rebuild detached the button that was pressed; its replacement takes the focus.
    panel.querySelector<HTMLElement>(`[data-cal="${control.dataset.cal}"]:not(:disabled)`)?.focus();
  };

  // The countdowns are a clock. The schedule is baked, but "now" is the reader's, so every
  // second each card's line is written again from the same data; and when something starts,
  // closes or ends, which moves it to another section or off the page, the list is rebuilt.
  // The views have no way to be told they have been left, so the timer checks for itself:
  // once its panel is gone from the page it stops.
  clearInterval(ticker);
  if (tab !== 'calendar') {
    const items = tab === 'pools' ? getPools() : getEvents();
    let shape = shapeOf(items, Date.now());
    ticker = window.setInterval(() => {
      const panel = container.querySelector<HTMLElement>('#ev-panel');
      if (!panel) { clearInterval(ticker); return; }
      const now = Date.now();
      if (shapeOf(items, now) !== shape) {
        shape = shapeOf(items, now);
        panel.innerHTML = panelHtml();
        return;
      }
      const shown = sectionsOf(items, now).flatMap(s => s.items);
      panel.querySelectorAll('.ev-when').forEach((line, i) => { line.textContent = whenText(shown[i], now); });
    }, 1000);
  }

  // The link to here is in the sticky topbar, so it is pressed from anywhere down the grid.
  window.scrollTo(0, 0);
}
