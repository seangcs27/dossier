import { CALENDAR_LEGEND, monthGridHtml, monthListHtml } from '../render/holodori-calendar-html';
import { MONTHS } from '../render/holodori-dates';
import { hideSearch } from '../shell';

// hololive Dreams' calendar (#/holodori/calendar), where the topbar's calendar icon leads: one
// month at a time as a grid of days, the face of whoever's birthday or debut anniversary it is
// on each, with the month's dates listed under it. It covers every hololive talent the build
// knows, the ones the game lacks too (holodori-index.ts, getHolodoriTalent). In the game's world
// (_holodori.scss); the grid is drawn by render/holodori-calendar-html.ts.

const CHEVRON = (turn: 'left' | 'right'): string =>
  `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${turn === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'}"></path></svg>`;

export function mountHolodoriCalendar(container: HTMLElement): void {
  hideSearch();

  container.innerHTML = '<div class="roster-page hc-page"></div>';
  const page = container.firstElementChild as HTMLElement;
  const start = new Date();
  let year = start.getFullYear();
  let month = start.getMonth();

  const draw = (): void => {
    const now = Date.now();
    const current = new Date(now).getFullYear() === year && new Date(now).getMonth() === month;
    page.innerHTML = `
      <header class="hd-head">
        <h2 class="hd-title">Birthday Calendar</h2>
        <p class="hd-sub">Birthdays and debut anniversaries · every hololive talent, the game's or not yet</p>
      </header>
      <div class="hc-bar">
        <button type="button" class="hc-step" data-step="-1" aria-label="Previous month">${CHEVRON('left')}</button>
        <h3 class="hc-month"><span class="lettered">${MONTHS[month]}</span><small>${year}</small></h3>
        <button type="button" class="hc-step" data-step="1" aria-label="Next month">${CHEVRON('right')}</button>
        <button type="button" class="hc-today" data-step="today"${current ? ' disabled' : ''}>Today</button>
      </div>
      <div class="hc-sheet">${monthGridHtml(year, month, now, 'page')}</div>
      ${CALENDAR_LEGEND}
      <section class="month hc-list">
        <h3 class="month-head"><span class="lettered">${MONTHS[month]}</span><small>every date</small></h3>
        ${monthListHtml(year, month, now)}
      </section>
      <p class="hd-credit">Data: <a href="https://github.com/HolodoriDB" target="_blank" rel="noopener">HolodoriDB</a> · Talent the game lacks: <a href="https://hololive.wiki" target="_blank" rel="noopener">hololive Fan Wiki</a></p>
    `;
  };

  page.addEventListener('click', (e) => {
    const button = (e.target as Element).closest<HTMLButtonElement>('[data-step]');
    if (!button || button.disabled) return;
    const step = button.dataset.step!;
    const to = step === 'today' ? new Date() : new Date(year, month + Number(step), 1);
    year = to.getFullYear();
    month = to.getMonth();
    draw();
    // The page is drawn again, so the press's own button is a new one: keep focus on its twin.
    page.querySelector<HTMLElement>(`[data-step="${step}"]:not(:disabled)`)?.focus();
  });
  draw();
}
