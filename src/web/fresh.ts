import { previewText, whenText, windowText } from './render/clock-text';
import { daysAway, daysToBirthday, debutYears, today } from './render/holodori-dates';

// A page built at build time says what the clock said then: a gacha's "Ends in 5d 8h", a
// date in the builder's time zone, a birthday's "in 12 days". The renderers (render/) mark
// each such piece of text with a data-* attribute carrying what it is worked out from, and
// this sets it again from the reader's own clock. The SPA, which draws in the browser, has no
// use for it.

/** Brings every clock-dependent piece of text under `root` up to `at` (ms). */
export function freshen(root: ParentNode = document, at = Date.now()): void {
  const day = today(new Date(at));
  const each = (selector: string, set: (el: HTMLElement) => string): void => {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => { el.textContent = set(el); });
  };
  each('[data-when]', el => whenText(el.dataset.when!));
  each('[data-gacha-from]', el => windowText(Date.parse(el.dataset.gachaFrom!), Date.parse(el.dataset.gachaTo!), at));
  each('[data-preview-from]', el => previewText(Date.parse(el.dataset.previewFrom!), at));
  each('[data-bday]', el => daysAway(daysToBirthday({ birthday: el.dataset.bday! }, day)));
  each('[data-debut]', el => debutYears(el.dataset.debut!, day));
}
