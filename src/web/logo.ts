// Wiš'adel has 8 official square crops in icons/: the base avatar, the in-game
// "game#9" avatar, and the 6 expressions from her April Fools 2026 emoticon set
// (see design/source/). Picking one at random per page load gives the header
// logo and favicon some variety without needing a build-time choice.
const VARIANT_COUNT = 8;

function iconPath(size: 16 | 32 | 48 | 96, variant: number): string {
  return variant === 1 ? `icons/icon-${size}.png` : `icons/icon-${size}-${variant}.png`;
}

export function applyRandomLogo(): void {
  const variant = 1 + Math.floor(Math.random() * VARIANT_COUNT);

  const logoMark = document.querySelector<HTMLImageElement>('.logo-mark');
  if (logoMark) logoMark.src = iconPath(48, variant);

  for (const size of [16, 32, 96] as const) {
    const link = document.querySelector<HTMLLinkElement>(`link[rel="icon"][sizes="${size}x${size}"]`);
    if (link) link.href = iconPath(size, variant);
  }
}
