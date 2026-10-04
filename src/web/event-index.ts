import bundled from '../shared/generated/events.json';

/** What an event and a headhunting pool have in common. Times are epoch milliseconds. */
interface Scheduled {
  name: string;
  start: number;
  end: number;
  // True when Global has not announced it: `start` and `end` are then the CN run moved
  // later by the schedule's lag, and `cnStart` / `cnEnd` are that run.
  predicted: boolean;
  cnStart?: number;
  cnEnd?: number;
  banner: string;      // event-banners/ file stem, '' when the build has none for it
}

/**
 * One event on the Global schedule, baked by scripts/build-event-index.mjs from the wiki's
 * event tables.
 */
export interface GameEvent extends Scheduled {
  type: string;        // the wiki's eventType: 'sidestory', 'storycol', 'cc', … or ''
  group: string;       // 'Celebration', 'Festival', 'Carnival' or ''
  rerun: boolean;
  crossover: boolean;
  shopEnd?: number;    // when the event's shop closes, where that is later than `end`
}

/** One headhunting pool. */
export interface GamePool extends Scheduled {
  kind: string;        // the wiki's bannerType: 'standard', 'kernel', 'special', 'jo', …
  // The featured operators: an operator id where the build could match the wiki's name to
  // the index, the wiki's name where it could not.
  operators: string[];
}

// Baked in at build time — no runtime fetch. The build keeps a few months of what has ended,
// for the calendar, and the page is read for days after it, so callers filter by the clock.
const schedule = bundled as unknown as { lagDays: number; events: GameEvent[]; pools: GamePool[] };

export function getEvents(): GameEvent[] {
  return schedule.events;
}

// A file kept from a build older than the pools (the wiki was down, so nothing rewrote it)
// has no list of them.
export function getPools(): GamePool[] {
  return schedule.pools ?? [];
}

/** How many days Global runs behind CN, the gap a predicted date is built on. */
export function lagDays(): number {
  return schedule.lagDays;
}
