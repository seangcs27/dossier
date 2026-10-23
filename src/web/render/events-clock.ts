import type { GameEvent } from '../event-index';

// What the Events page says that the reader's clock decides: a countdown, and a date in
// their own time zone. No DOM, no window and no data (the schedule is imported as a type
// only), so that fresh.ts can import it without every page carrying events.json. The
// renderer (events-html.ts) draws from this, and marks each such piece of text with a
// data-* attribute that fresh.ts reads to set it again.

export const DAY_MS = 86_400_000;

const yourTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

/** The dates' tooltip when it is the reader's own time. */
export const yourTimeTip = (start: number, end: number): string =>
  `Your time: ${yourTime.format(start)} – ${yourTime.format(end)}`;

// Down to the second, which is what shows it to be a clock: "3d 18h 26m 05s".
function spanText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const two = (n: number): string => String(n).padStart(2, '0');
  const days = Math.floor(seconds / 86_400);
  const clock = `${two(Math.floor(seconds % 86_400 / 3600))}h ${two(Math.floor(seconds % 3600 / 60))}m ${two(seconds % 60)}s`;
  return days ? `${days}d ${clock}` : clock;
}

/** What an event or a pool has to be placed in time: a list item, or the numbers fresh.ts reads back. */
export type Timed = Pick<GameEvent, 'predicted' | 'start' | 'end' | 'shopEnd'>;

// When the thing is over for the lists: an event stays until its shop shuts.
export const lastsUntil = (item: Timed): number => ('shopEnd' in item && item.shopEnd) || item.end;

export function whenText(item: Timed, now: number): string {
  if (item.predicted) {
    // A predicted start that has passed with nothing announced: the estimate was early.
    return item.start <= now ? 'Expected around now' : `In about ${Math.round((item.start - now) / DAY_MS)} days`;
  }
  if (item.start > now) return `Starts in ${spanText(item.start - now)}`;
  if (item.end > now) return `Ends in ${spanText(item.end - now)}`;
  return `Stages closed · Shop closes in ${spanText(lastsUntil(item) - now)}`;
}
