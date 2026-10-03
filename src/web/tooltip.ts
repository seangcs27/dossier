// One floating tooltip for every `[data-tip]` on the page, in place of the browser's own
// `title`: that one waits a second, can't be styled, never shows on a phone, and is
// invisible to the keyboard. This shows on hover and on focus, and a tap focuses.
//
// It hangs off <body> with fixed positioning rather than sitting beside its anchor, because
// the detail panel clips its overflow and a definition is often wider than the room left
// beside the keyword. An anchor may also carry `data-term`, shown as the tooltip's heading.
const GAP = 8;

export function mountTooltips(): void {
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);

  let anchor: HTMLElement | null = null;

  const hide = (): void => {
    if (!anchor) return;
    anchor.removeAttribute('aria-describedby');
    anchor = null;
    tip.hidden = true;
  };

  const show = (el: HTMLElement): void => {
    if (el === anchor) return;
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
    if (el) show(el);
  });
  // Leaving the anchor hides it, unless the anchor also holds focus: a keyboard reader's
  // tooltip shouldn't vanish because the mouse drifted.
  document.addEventListener('pointerout', ev => {
    if (!anchor || tipAnchor(ev.target) !== anchor) return;
    if (ev.relatedTarget instanceof Node && anchor.contains(ev.relatedTarget)) return;
    if (document.activeElement !== anchor) hide();
  });
  document.addEventListener('focusin', ev => {
    const el = tipAnchor(ev.target);
    if (el) show(el);
  });
  document.addEventListener('focusout', ev => {
    if (tipAnchor(ev.target) === anchor) hide();
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') hide();
  });
  // Fixed positioning doesn't follow the page, so a scroll would leave it stranded.
  window.addEventListener('scroll', hide, { passive: true, capture: true });
}
