// The light or dark theme. It follows the system until the reader presses the switch in the
// topbar; their choice is kept in localStorage and put on <html> as data-theme, which
// the stylesheet's dark rules key on (_theme.scss). index.html's head sets it before the first
// paint; this keeps it from there.

const KEY = 'dossier-theme';
const system = window.matchMedia('(prefers-color-scheme: dark)');

let choice: string | null = null;
try {
  choice = localStorage.getItem(KEY);
} catch {
  // Storage blocked: the choice lasts while the page is open.
}

function isDark(): boolean {
  return choice ? choice === 'dark' : system.matches;
}

function apply(doc: Document): void {
  if (choice) doc.documentElement.dataset.theme = choice;
  else delete doc.documentElement.dataset.theme;
}

/** Wires the topbar's theme switch. */
export function mountThemeSwitch(): void {
  const button = document.getElementById('theme-toggle')!;
  const show = (): void => button.setAttribute('aria-pressed', String(isDark()));

  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    // A press that lands on the system's own theme hands the choice back to the system, so a
    // later change there is followed again.
    choice = (next === 'dark') === system.matches ? null : next;
    try {
      if (choice) localStorage.setItem(KEY, choice);
      else localStorage.removeItem(KEY);
    } catch {
      // Kept in memory only.
    }
    apply(document);
    show();
  });
  // The glow inside the track follows the pointer.
  button.addEventListener('pointermove', (e) => {
    const box = button.getBoundingClientRect();
    button.style.setProperty('--mx', `${e.clientX - box.left}px`);
    button.style.setProperty('--my', `${e.clientY - box.top}px`);
  });
  system.addEventListener('change', show);
  // Astro's router gives <html> the next page's attributes: put the choice on that page first.
  document.addEventListener('astro:before-swap', (e) => apply((e as Event & { newDocument: Document }).newDocument));
  show();
}
