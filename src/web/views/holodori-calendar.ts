import {
  CALENDAR_LEGEND, monthGridHtml, monthListHtml, monthMoved, monthPickerHtml,
} from '../render/holodori-calendar-html';
import { MONTHS } from '../render/holodori-dates';
import { hideSearch } from '../shell';

// hololive Dreams' calendar (#/holodori/calendar), where the topbar's calendar icon leads: one
// month at a time as a grid of days, the face of whoever's birthday or debut anniversary it is
// on each, with the month's dates listed beside it. The month is picked as a date picker has
// it, from a drop-down of months and one of years, or stepped to with the arrows. It covers
// every hololive talent the build knows, the ones the game lacks too (holodori-index.ts,
// getHolodoriTalent). In the game's world (_holodori.scss); drawn by
// render/holodori-calendar-html.ts.

export function mountHolodoriCalendar(container: HTMLElement): void {
  hideSearch();

  container.innerHTML = '<div class="roster-page hc-page"></div>';
  const page = container.firstElementChild as HTMLElement;
  const start = new Date();
  let year = start.getFullYear();
  let month = start.getMonth();

  const draw = (): void => {
    const now = Date.now();
    page.innerHTML = `
      <header class="hd-head">
        <h2 class="hd-title">Calendar</h2>
        <p class="hd-sub">Birthdays and debut anniversaries · every hololive talent, the game's or not yet</p>
      </header>
      <div class="hc-layout">
        <div class="hc-main">
          ${monthPickerHtml(year, month, now, 'page')}
          <div class="hc-sheet">${monthGridHtml(year, month, now, 'page')}</div>
          ${CALENDAR_LEGEND}
        </div>
        <section class="month hc-list">
          <h3 class="month-head"><span class="lettered">${MONTHS[month]}</span><small>${year}</small></h3>
          ${monthListHtml(year, month, now)}
        </section>
      </div>
      <p class="hd-credit">Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a> · Talent the game lacks: <a href="https://hololive.wiki" target="_blank" rel="noopener">hololive Fan Wiki</a></p>
    `;
  };

  // A press on a step, or a month or year chosen. The page is drawn again, so the control that
  // was used is a new one: keep focus on its twin.
  const move = (control: HTMLElement, value?: string): void => {
    ({ y: year, m: month } = monthMoved(year, month, Date.now(), {
      step: control.dataset.step, pick: control.dataset.pick, value,
    }));
    draw();
    const twin = control.dataset.step ? `[data-step="${control.dataset.step}"]:not(:disabled)` : `[data-pick="${control.dataset.pick}"]`;
    page.querySelector<HTMLElement>(twin)?.focus();
  };

  page.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('button[data-step]');
    if (button && !button.disabled) move(button);
  });
  page.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    if (select.dataset.pick) move(select, select.value);
  });
  draw();
}
