import type { HolodoriCharacter } from '../holodori-index';

// What hololive Dreams' pages say about a holomem's birthday and debut. No DOM, no window and
// no data of its own: fresh.ts imports this in every page built at build time, so it must not
// bring the cast with it (holodori-format.ts has the pieces that need it).

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
export const DAY_MS = 86_400_000;

// A birthday is a day of the year with no hour to it, so everything here is the reader's
// own calendar: what is lifted, and what is today, is decided by their clock.

export function today(at = new Date()): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

// Only the day is read of a holomem, so the pages' clock script can ask with just that.
type Born = Pick<HolodoriCharacter, 'birthday'>;

// Her birthday in a given year. Hakos Baelz's is 29 February, and a year with no such day
// keeps it on the 28th.
export function birthdayIn(c: Born, year: number): Date {
  const [m, d] = c.birthday.split('-').map(Number);
  const leap = new Date(year, 1, 29).getDate() === 29;
  return new Date(year, m - 1, m === 2 && d === 29 && !leap ? 28 : d);
}

export function nextBirthday(c: Born, now: Date): Date {
  const day = birthdayIn(c, now.getFullYear());
  return day < now ? birthdayIn(c, now.getFullYear() + 1) : day;
}

// Rounded, since a day with a change of the clocks in it is 23 or 25 hours long.
export function daysToBirthday(c: Born, now: Date): number {
  return Math.round((nextBirthday(c, now).getTime() - now.getTime()) / DAY_MS);
}

/** 'today', 'tomorrow' or 'in 12 days': how far off a birthday is. */
export const daysAway = (days: number): string => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

/** How long since a debut, 'this year' or '3 years ago'. */
export function debutYears(debut: string, now: Date): string {
  const [y, m, d] = debut.split('-').map(Number);
  const years = now.getFullYear() - y - (now < new Date(now.getFullYear(), m - 1, d) ? 1 : 0);
  return years < 1 ? 'this year' : `${years} year${years === 1 ? '' : 's'} ago`;
}

// Her birthday as her profile has it, '29 Feb' or '29 February', whatever the year.
export function birthdayText(c: Born, long = false): string {
  const [m, d] = c.birthday.split('-').map(Number);
  return `${d} ${long ? MONTHS[m - 1] : MONTHS[m - 1].slice(0, 3)}`;
}

export function debutText(c: Pick<HolodoriCharacter, 'debut'>): string {
  const [y, m, d] = c.debut.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens > 10 && tens < 14 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}
