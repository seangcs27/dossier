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

const STORED_LANG = 'dossier.holojong.lang';

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
}
