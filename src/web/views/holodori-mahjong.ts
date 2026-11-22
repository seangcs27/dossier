import { holojongPageHtml } from '../render/holojong-html';
import { hideSearch } from '../shell';

// The guide to hololive Mahjong -Holojan- (#/holodori/mahjong), in hololive Dreams' world
// (_holodori.scss). The page is drawn by render/holojong-html.ts.

/**
 * Makes the contents' links scroll to their section. Under the pages' `<base href>` a bare
 * '#hj-tiles' resolves to the site's root, and in the SPA it would be read as a route.
 */
export function wireGuideLinks(container: HTMLElement): void {
  // One table of contents for each language.
  container.querySelectorAll<HTMLElement>('.hj-toc').forEach((toc) => {
    toc.onclick = (e) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#hj-"]');
      if (!link) return;
      e.preventDefault();
      document.getElementById(link.getAttribute('href')!.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}

/**
 * The demo hand's Back and Next buttons, and the arrow keys while it has the focus. Both
 * languages' demos are on the same step, so a change of language keeps the place.
 */
export function wireGuideDemo(container: HTMLElement): void {
  const demos = Array.from(container.querySelectorAll<HTMLElement>('[data-hj-demo]'));
  let at = 0;
  const go = (step: number, from?: HTMLElement): void => {
    for (const demo of demos) {
      const steps = demo.querySelectorAll<HTMLElement>('.hj-demo-step');
      at = Math.max(0, Math.min(steps.length - 1, step));
      steps.forEach((li, i) => { li.hidden = i !== at; });
      demo.querySelector('.hj-demo-count b')!.textContent = String(at + 1);
      const back = demo.querySelector<HTMLButtonElement>('[data-hj-step="-1"]')!;
      const next = demo.querySelector<HTMLButtonElement>('[data-hj-step="1"]')!;
      back.disabled = at === 0;
      next.disabled = at === steps.length - 1;
      // A button that turns itself off would drop the focus to the page.
      if (from && demo.contains(from) && (from as HTMLButtonElement).disabled) (at === 0 ? next : back).focus();
    }
  };
  for (const demo of demos) {
    demo.onclick = (e) => {
      const button = (e.target as Element).closest<HTMLElement>('[data-hj-step]');
      if (button) go(at + Number(button.dataset.hjStep), button);
    };
    demo.onkeydown = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      go(at + (e.key === 'ArrowRight' ? 1 : -1), document.activeElement as HTMLElement);
    };
  }
}

/**
 * The corner dock: the yaku reminder, open while the pointer or the focus is on it and kept
 * open by a press until another press, Escape or a press elsewhere; and Back to top, shown
 * once the page is scrolled.
 */
export function wireGuideDock(container: HTMLElement): void {
  const cheat = container.querySelector<HTMLElement>('.hj-cheat');
  const top = container.querySelector<HTMLElement>('.hj-top');
  if (!cheat || !top) return;
  const button = cheat.querySelector<HTMLButtonElement>('.hj-cheat-btn')!;
  let pinned = false;
  let shut: number | undefined;
  const set = (open: boolean): void => {
    clearTimeout(shut);
    cheat.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  };
  cheat.onpointerenter = (e) => { if (e.pointerType === 'mouse') set(true); };
  // A short wait, so the move from the button up into the panel does not shut it.
  cheat.onpointerleave = (e) => { if (e.pointerType === 'mouse' && !pinned) shut = window.setTimeout(() => set(false), 200); };
  cheat.addEventListener('focusin', () => set(true));
  cheat.addEventListener('focusout', (e) => { if (!pinned && !cheat.contains(e.relatedTarget as Node)) set(false); });
  button.onclick = () => { pinned = !pinned; set(pinned); };
  const close = (): void => { pinned = false; set(false); };
  cheat.onkeydown = (e) => { if (e.key === 'Escape' && cheat.classList.contains('open')) { close(); button.focus(); } };
  const outside = (e: PointerEvent): void => {
    if (!cheat.isConnected) { document.removeEventListener('pointerdown', outside); return; }
    if (pinned && !cheat.contains(e.target as Node)) close();
  };
  document.addEventListener('pointerdown', outside);

  top.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const onScroll = (): void => {
    if (!top.isConnected) { window.removeEventListener('scroll', onScroll); return; }
    top.classList.toggle('shown', window.scrollY > 400);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

const STORED_LANG ='dossier.holojong.lang';

/**
 * The guide's English / 繁體中文 switch: shows the language picked and keeps it. The first
 * visit goes by the browser's language.
 */
export function wireGuideLang(container: HTMLElement): void {
  const page = container.querySelector<HTMLElement>('.hj-page');
  if (!page) return;
  const show = (lang: string): void => {
    page.querySelectorAll<HTMLElement>('[data-hj-lang]').forEach((block) => { block.hidden = block.dataset.hjLang !== lang; });
    page.querySelectorAll<HTMLElement>('[data-hj-pick]').forEach((button) => {
      const on = button.dataset.hjPick === lang;
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
    });
  };
  let stored: string | null = null;
  // A browser that keeps nothing (a private window, storage turned off) throws here.
  try { stored = localStorage.getItem(STORED_LANG); } catch { /* the browser's language, then */ }
  show(stored === 'en' || stored === 'zh' ? stored : navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');
  page.querySelector<HTMLElement>('.hj-langs')!.onclick = (e) => {
    const lang = (e.target as Element).closest<HTMLElement>('[data-hj-pick]')?.dataset.hjPick;
    if (!lang) return;
    show(lang);
    try { localStorage.setItem(STORED_LANG, lang); } catch { /* kept for this visit only */ }
  };
}

export function mountHolodoriMahjong(container: HTMLElement): void {
  hideSearch();
  container.innerHTML = holojongPageHtml();
  wireGuideLinks(container);
  wireGuideLang(container);
  wireGuideDemo(container);
  wireGuideDock(container);
}
