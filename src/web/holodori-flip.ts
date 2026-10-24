// Turning a hololive Dreams song over to its back, on the Songs page and a holomem's page
// (views/holodori-songs.ts, holodori-holomem.ts): the jacket pressed turns edge on, and its
// back comes round from the other side at its place, growing from its size to its own. One
// is turned over at a time.

/** What is turned over, if anything: its back, the button it came from, and how it turned. */
interface Turned {
  back: HTMLElement;
  from: HTMLElement;
  spin: Animation;
  small: string;   // the scale that shrinks the back to the size of what it came from
}
let turned: Turned | undefined;

/** The back on show, if one is. */
export function turnedBack(): HTMLElement | undefined {
  return turned?.back;
}

/** Forgets the back on show, for a page that has just drawn itself over it. */
export function forgetTurn(): void {
  turned = undefined;
}

/** Turns `from` over to `html`, a back whose close button is `.back-close`, inside `page`. */
export function turnOver(page: HTMLElement, from: HTMLElement, html: string): void {
  turnBack(false);
  page.insertAdjacentHTML('beforeend', html);
  const back = page.lastElementChild as HTMLElement;
  const box = page.getBoundingClientRect();
  const r = from.getBoundingClientRect();
  const w = back.offsetWidth;
  const h = back.offsetHeight;
  const cx = r.left - box.left + r.width / 2;
  const cy = r.top - box.top + r.height / 2;
  const x = Math.min(Math.max(cx - w / 2, 8), box.width - w - 8);
  const y = Math.max(cy - h / 2, 8);
  back.style.left = `${x}px`;
  back.style.top = `${y}px`;
  back.style.transformOrigin = `${cx - x}px ${cy - y}px`;
  const small = `scale(${(r.width / w).toFixed(3)}, ${(r.height / h).toFixed(3)})`;
  const spin = from.animate({ rotate: ['y 0deg', 'y 90deg'] }, { duration: 160, easing: 'ease-in', fill: 'forwards' });
  back.animate(
    { transform: [`perspective(900px) rotateY(-90deg) ${small}`, 'perspective(900px) rotateY(0deg) scale(1)'] },
    { duration: 380, delay: 140, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
  );
  from.setAttribute('aria-expanded', 'true');
  turned = { back, from, spin, small };
  back.querySelector<HTMLElement>('.back-close')!.focus({ preventScroll: true });
}

export function turnBack(refocus: boolean): void {
  if (!turned) return;
  const { back, from, spin, small } = turned;
  turned = undefined;
  from.setAttribute('aria-expanded', 'false');
  back.animate(
    { transform: ['perspective(900px) rotateY(0deg) scale(1)', `perspective(900px) rotateY(90deg) ${small}`] },
    { duration: 200, easing: 'ease-in', fill: 'forwards' },
  ).finished.then(() => back.remove(), () => back.remove());
  // Held edge on through the delay, then round to face the page again.
  from.animate({ rotate: ['y -90deg', 'y 0deg'] }, { duration: 200, delay: 160, easing: 'ease-out', fill: 'backwards' });
  spin.cancel();
  if (refocus && from.isConnected) from.focus({ preventScroll: true });
}

/**
 * The backs a page built at build time carries in `<template data-back-of="<id>">` elements
 * (render/holodori-songs-html.ts), for wireTurns: it need not hold the songs to draw one.
 */
export function backsInPage(page: HTMLElement): (id: string) => string | undefined {
  return id => page.querySelector<HTMLTemplateElement>(`template[data-back-of="${CSS.escape(id)}"]`)?.innerHTML;
}

/**
 * A page whose buttons carry `data-back="<id>"` turns each over to `backOf(id)`; the close
 * button, Escape or a press anywhere else turns it back. Assigned, not added, since the
 * view is mounted twice a navigation.
 */
export function wireTurns(page: HTMLElement, backOf: (id: string) => string | undefined): void {
  forgetTurn();
  page.onclick = (ev) => {
    const target = ev.target as Element;
    if (target.closest('.back-close')) { turnBack(true); return; }
    const who = target.closest<HTMLElement>('[data-back]');
    const html = who && backOf(who.dataset.back!);
    if (who && html) turnOver(page, who, html);
  };
  page.onpointerdown = (ev) => {
    const target = ev.target as Element;
    if (turned && !turned.back.contains(target) && !target.closest('[data-back]')) turnBack(false);
  };
  page.onkeydown = (ev) => {
    if (ev.key === 'Escape' && turned) turnBack(true);
  };
}
