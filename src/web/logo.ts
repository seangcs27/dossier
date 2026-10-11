// Wiš'adel has 7 official square crops in icons/: the in-game "game#9" avatar
// (plain, no suffix — also what manifest.json and the static fallback markup use)
// and the 6 expressions from her April Fools 2026 emoticon set (see design/source/).
// Picking one at random per page load gives the header logo and favicon some
// variety without needing a build-time choice. Hovering the header logo rolls again, and
// goes on rolling for as long as the pointer rests on it.
//
// The avatar is a cut-out with nothing behind it, where the six expressions came on a red
// patterned square, and in the rotation it was the odd one out. So the logo has its own
// copy of it (-1) on that square, rebuilt from the six: its frame from the lines along
// their edges, its field from what shows round their shared silhouette. The plain file is
// left as it was for the extension's toolbar and the fallback markup.
const VARIANT_COUNT = 7;
// How often, while it rests there.
const HOVER_ROLL_MS = 1000;

let current = 0;

function iconPath(size: 16 | 32 | 48 | 96, variant: number): string {
  return `icons/icon-${size}-${variant}.png`;
}

// Never repeats the variant on show, so every hover visibly changes the face.
function rollLogo(): void {
  let variant = current;
  while (variant === current) variant = 1 + Math.floor(Math.random() * VARIANT_COUNT);
  current = variant;

  const logoMark = document.querySelector<HTMLImageElement>('.logo-mark');
  if (logoMark) logoMark.src = iconPath(48, variant);

  for (const size of [16, 32, 96] as const) {
    const link = document.querySelector<HTMLLinkElement>(`link[rel="icon"][sizes="${size}x${size}"]`);
    if (link) link.href = iconPath(size, variant);
  }
}

export function applyRandomLogo(): void {
  rollLogo();
  const logoMark = document.querySelector<HTMLImageElement>('.logo-mark');
  logoMark?.addEventListener('mouseenter', rollLogo);

  // A mouse only: a finger's tap arrives the same way and never leaves, so on a phone the
  // face would go on changing by itself until something else was touched.
  let rolling: number | undefined;
  logoMark?.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    window.clearInterval(rolling);
    rolling = window.setInterval(rollLogo, HOVER_ROLL_MS);
  });
  logoMark?.addEventListener('pointerleave', () => window.clearInterval(rolling));
}
