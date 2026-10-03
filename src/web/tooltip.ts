// One floating tooltip for every `[data-tip]` on the page, in place of the browser's own
// `title`: that one can't be styled, never shows on a phone, and is invisible to the
// keyboard. This shows on hover, on a tap, and on keyboard focus.
//
// It hangs off <body> with fixed positioning rather than sitting beside its anchor, because
// the detail panel clips its overflow and a definition is often wider than the room left
// beside the keyword. An anchor may also carry `data-term`, shown as the tooltip's heading.
const GAP = 8;

// A mouse has to rest this long before the tooltip shows. Every card in the grid carries
// tooltips, and without a pause one would flash up under the pointer on every card it
// crossed.
const HOVER_DELAY_MS = 300;

export function mountTooltips(): void {
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);

  let anchor: HTMLElement | null = null;
  let pending = 0;

  const hide = (): void => {
    clearTimeout(pending);
    if (!anchor) return;
    anchor.removeAttribute('aria-describedby');
    anchor = null;
    tip.hidden = true;
  };

  const show = (el: HTMLElement): void => {
    clearTimeout(pending);
    if (el === anchor || !el.isConnected) return;
    hide();
    anchor = el;
    tip.replaceChildren();
    if (el.dataset.term) {
      const heading = document.createElement('strong');
      heading.textContent = el.dataset.term;
      tip.append(heading);
    }
    tip.append(el.dataset.tip ?? '');
    tip.hidden = false;
    el.setAttribute('aria-describedby', tip.id);

    // Above the anchor and centred on it, kept inside the viewport; below when there is no
    // room above.
    const box = el.getBoundingClientRect();
    const { width, height } = tip.getBoundingClientRect();
    const left = Math.min(box.left + box.width / 2 - width / 2, window.innerWidth - width - GAP);
    const above = box.top - height - GAP;
    tip.style.left = `${Math.max(GAP, left)}px`;
    tip.style.top = `${above >= GAP ? above : box.bottom + GAP}px`;
  };

  const tipAnchor = (target: EventTarget | null): HTMLElement | null =>
    target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;

  document.addEventListener('pointerover', ev => {
    const el = tipAnchor(ev.target);
    if (!el || el === anchor) return;
    if (ev.pointerType === 'mouse') {
      clearTimeout(pending);
      pending = window.setTimeout(() => show(el), HOVER_DELAY_MS);
    } else if (el.tabIndex >= 0) {
      // A tap, which has no hover to wait out. Only on something made to be tapped — a
      // keyword, a button — so touching a card to spin it doesn't raise the card's own.
      show(el);
    }
  });
  // Leaving the anchor hides it, unless the anchor also holds keyboard focus: a keyboard
  // reader's tooltip shouldn't vanish because the mouse drifted.
  document.addEventListener('pointerout', ev => {
    const el = tipAnchor(ev.target);
    if (!el || (ev.relatedTarget instanceof Node && el.contains(ev.relatedTarget))) return;
    clearTimeout(pending);
    if (el === anchor && !anchor.matches(':focus-visible')) hide();
  });
  // A press ends it: with a mouse always, with a finger only when the press lands somewhere
  // else, since the tap that raised the tooltip is itself a press on the anchor.
  document.addEventListener('pointerdown', ev => {
    if (ev.pointerType === 'mouse' || tipAnchor(ev.target) !== anchor) hide();
  });
  // Keyboard focus only. A click focuses a button too, and a tooltip pinned to every button
  // just pressed is noise.
  document.addEventListener('focusin', ev => {
    const el = tipAnchor(ev.target);
    if (el?.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', ev => {
    if (tipAnchor(ev.target) === anchor) hide();
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') hide();
  });
  // A click usually re-renders the panel, taking the anchor with it.
  document.addEventListener('click', () => {
    if (anchor && !anchor.isConnected) hide();
  });
  // Fixed positioning doesn't follow the page, so a scroll would leave it stranded; and a
  // route change replaces the whole view under it.
  window.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('hashchange', hide);
}
