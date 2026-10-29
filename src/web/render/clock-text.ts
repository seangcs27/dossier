// Text the reader's clock decides: a date in their time zone, how long to a gacha's end. No
// DOM, no window and no data: fresh.ts imports this in every page built at build time to set
// such text again in the browser, so it must not bring any of the games' data with it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOUR_MS = 3_600_000;

const two = (n: number): string => String(n).padStart(2, '0');

/** '7 Oct 2026, 10:00', in the reader's own time zone. */
export function whenText(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/** '2d 5h' or '5h 12m', rounded down. */
export function spanText(ms: number): string {
  const h = Math.floor(ms / HOUR_MS);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.floor((ms % HOUR_MS) / 60_000)}m`;
}

/** Where a dated banner is: still to start, running, or over. */
export function windowText(from: number, to: number | undefined, now: number): string {
  if (now < from) return `Starts in ${spanText(from - now)}`;
  // A banner whose end is not known yet (the newest one the build read from the dump).
  if (to === undefined || Number.isNaN(to)) return 'Running · end not announced';
  return now <= to ? `Ends in ${spanText(to - now)}` : 'Ended';
}

/** An announced ★5 whose gacha is not in the record: still to open, or open and unrecorded. */
export const previewText = (from: number, now: number): string =>
  now < from ? `Starts in ${spanText(from - now)}` : 'Open, not in the record yet';
