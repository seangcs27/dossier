// Inline SVG glyphs for the detail page. Sanity Gone gives every stat row, every skill
// meta field and the elite/potential controls their own icon, and the panels read as a
// dense wall of numbers without them. Most are drawn here rather than fetched, so they
// cost no image request; the elite badge is the game's own art, baked by the build. All of
// them are monochrome, inherit `currentColor`, and are sized by the caller through CSS.

import { eliteIconUrl } from '../shared/api/hella-api';

const svg = (body: string, viewBox = '0 0 16 16'): string =>
  `<svg class="ico" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.4"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

// Filled glyphs on their own pixel grid. The four stat glyphs and three position glyphs
// that use this are Sanity Gone's (SanityGoneAK/sanity-gone, src/components/icons, ported
// from iansjk/sanity-gone, GPL-2.0), with their hardcoded grey swapped for currentColor so
// the caller's CSS colours them. The game ships no art for any of the seven.
const filled = (body: string, viewBox: string): string =>
  `<svg class="ico" viewBox="${viewBox}" fill="currentColor" aria-hidden="true">${body}</svg>`;

// ── Stats ──
export const ICON_HP      = svg('<path d="M8 13.5S2 10 2 6.2A3.2 3.2 0 0 1 8 4.6a3.2 3.2 0 0 1 6 1.6C14 10 8 13.5 8 13.5Z"/>');
export const ICON_DEF     = svg('<path d="M8 1.8 13.2 4v4.1c0 3.2-2.2 5.3-5.2 6.1-3-.8-5.2-2.9-5.2-6.1V4Z"/>');
export const ICON_RES     = svg('<path d="M8 1.8 13.2 4v4.1c0 3.2-2.2 5.3-5.2 6.1-3-.8-5.2-2.9-5.2-6.1V4Z"/><path d="M8 5.2 9 7.4l2.2 1-2.2 1L8 11.6 7 9.4l-2.2-1L7 7.4Z"/>');
export const ICON_ATK = filled(
  '<path d="M2 1L0 0L1 2L6 7L3 10L2 9H1V10L2 11L0 13V14H1L3 12L4 13H5V12L4 11L7 8L10 11L9 12V13H10L11 12L13 14H14V13L12 11L13 10V9H12L11 10L8 7L13 2L14 0L12 1L7 6L2 1Z"/>',
  '0 0 14 14',
);
export const ICON_ASPD = filled(
  '<path d="M9 1H0V2H8L9 1Z"/><path d="M6 4H0V5H5L6 4Z"/><path d="M3 7H0V8H2L3 7Z"/>' +
  '<path d="M12 1L0 13V14H1L3 12L4 13H5V12L4 11L13 2L14 0L12 1Z"/>',
  '0 0 14 14',
);
export const ICON_BLOCK = filled(
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M1 11V1H5L7 0L9 1H13V11L7 14L1 11ZM5.36 2.41L7 1.59L8.64 2.41H10.204L2.41 8.905V2.41H5.36ZM11.59 10.11L7 12.41L2.88587 10.3484L11.59 3.095V10.11Z"/>',
  '0 0 14 14',
);
export const ICON_DP = filled(
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M7 0L0 7L7 14L14 7L7 0ZM3 7L7 3L8 4L5 7L8 10L7 11L3 7Z"/>',
  '0 0 14 14',
);
export const ICON_REDEPLOY = svg('<path d="M4 2h8M4 14h8M5 2c0 3 6 3.4 6 6s-6 3-6 6"/><path d="M11 2c0 3-6 3.4-6 6"/>');

// ── Skill meta ──
export const ICON_SP_COST = svg('<path d="M8.8 1.8 3.4 9.2h3.6l-.6 5 5.4-7.4H8.2Z"/>');
export const ICON_SP_INIT = svg('<circle cx="8" cy="8" r="6"/><path d="M8.6 4.6 6 8.6h2.2L7.6 11.6 10.4 7.6H8.2Z"/>');
export const ICON_DURATION = svg('<circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.3 1.4"/>');

// ── Position ──
// Deployment tiles seen from above: one tile for melee, two stacked for ranged, and the
// stack with both tiles filled for an operator who can go on either.
export const ICON_MELEE = filled(
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 6.00019C0 5.77514 0.116469 5.56612 0.307851 5.44771L7.65817 0.899933C7.86763 0.770335 8.13237 0.770335 8.34183 0.899933L15.6921 5.44771C15.8835 5.56612 16 5.77514 16 6.00019C16 6.22524 15.8835 6.43427 15.6921 6.55268L8.34183 11.1005C8.13237 11.2301 7.86763 11.2301 7.65817 11.1005L0.307851 6.55268C0.116469 6.43427 0 6.22524 0 6.00019ZM1.88446 6.00019L8 9.78399L14.1155 6.00019L8 2.2164L1.88446 6.00019Z"/>' +
  '<path d="M8 9.78399L1.88446 6.00019L8 2.2164L14.1155 6.00019L8 9.78399Z"/>',
  '0 0 16 12',
);
export const ICON_RANGED = filled(
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 5.69551C0 5.47046 0.116469 5.26143 0.307851 5.14302L7.65817 0.595246C7.86763 0.465647 8.13237 0.465647 8.34183 0.595246L15.6921 5.14302C15.8835 5.26143 16 5.47046 16 5.69551C16 5.92056 15.8835 6.12958 15.6921 6.24799L8.34183 10.7958C8.13237 10.9254 7.86763 10.9254 7.65817 10.7958L0.307851 6.24799C0.116469 6.12958 0 5.92056 0 5.69551ZM1.88446 5.69551L4.37462 7.23621L5.6094 8.00019L8 9.4793L10.3906 8.00019L11.6254 7.23621L14.1155 5.69551L8 1.91171L1.88446 5.69551Z"/>' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 10.3049C0 10.0798 0.116469 9.87081 0.307851 9.7524L4.37462 7.23621L7.65817 5.20462C7.86763 5.07502 8.13237 5.07502 8.34183 5.20462L11.6254 7.23621L15.6921 9.7524C15.8835 9.87081 16 10.0798 16 10.3049C16 10.5299 15.8835 10.739 15.6921 10.8574L8.34183 15.4051C8.13237 15.5347 7.86763 15.5347 7.65817 15.4051L0.307851 10.8574C0.116469 10.739 0 10.5299 0 10.3049ZM1.88446 10.3049L8 14.0887L14.1155 10.3049L10.3906 8.00019L8 6.52109L5.6094 8.00019L1.88446 10.3049Z"/>' +
  '<path d="M5.6094 8.00019L8 9.4793L10.3906 8.00019L8 6.52109L5.6094 8.00019Z"/>' +
  '<path d="M14.1155 5.69551L8 1.91171L1.88446 5.69551L4.37462 7.23621L7.65817 5.20462C7.86763 5.07502 8.13237 5.07502 8.34183 5.20462L11.6254 7.23621L14.1155 5.69551Z"/>',
  '0 0 16 16',
);
export const ICON_MELEE_AND_RANGED = filled(
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 5.69551C0 5.47046 0.116469 5.26143 0.307851 5.14302L7.65817 0.595246C7.86763 0.465647 8.13237 0.465647 8.34183 0.595246L15.6921 5.14302C15.8835 5.26143 16 5.47046 16 5.69551C16 5.92056 15.8835 6.12958 15.6921 6.24799L11.6254 8.76418L8.34183 10.7958C8.13237 10.9254 7.86763 10.9254 7.65817 10.7958L4.37462 8.76418L0.307851 6.24799C0.116469 6.12958 0 5.92056 0 5.69551ZM1.88446 5.69551L4.37462 7.23621L5.6094 8.00019L8 9.4793L10.3906 8.00019L11.6254 7.23621L14.1155 5.69551L8 1.91171L1.88446 5.69551Z"/>' +
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M0 10.3049C0 10.0798 0.116469 9.87081 0.307851 9.7524L4.37462 7.23621L7.65817 5.20462C7.86763 5.07502 8.13237 5.07502 8.34183 5.20462L11.6254 7.23621L15.6921 9.7524C15.8835 9.87081 16 10.0798 16 10.3049C16 10.5299 15.8835 10.739 15.6921 10.8574L8.34183 15.4051C8.13237 15.5347 7.86763 15.5347 7.65817 15.4051L0.307851 10.8574C0.116469 10.739 0 10.5299 0 10.3049ZM1.88446 10.3049L8 14.0887L14.1155 10.3049L11.6254 8.76418L10.3906 8.00019L8 6.52109L5.6094 8.00019L4.37462 8.76418L1.88446 10.3049Z"/>' +
  '<path d="M5.6094 8.00019L8 9.4793L10.3906 8.00019L8 6.52109L5.6094 8.00019Z"/>' +
  '<path d="M14.1155 5.69551L8 1.91171L1.88446 5.69551L4.37462 7.23621L7.65817 5.20462C7.86763 5.07502 8.13237 5.07502 8.34183 5.20462L11.6254 7.23621L14.1155 5.69551Z"/>' +
  '<path d="M11.6254 8.76418L8.34183 10.7958C8.13237 10.9254 7.86763 10.9254 7.65817 10.7958L4.37462 8.76418L1.88446 10.3049L8 14.0887L14.1155 10.3049L11.6254 8.76418Z"/>',
  '0 0 16 16',
);

// ── Misc ──
export const ICON_BRUSH = svg('<path d="M13.4 2.6 7.2 8.8M11 1.6l3.4 3.4-2 2-3.4-3.4ZM6.6 8.2c-1.4-.6-3 .2-3.4 1.8-.3 1.2-.9 1.9-1.6 2.2 1.6 1.6 4.5 1.6 5.6-.6.5-1 .3-2.2-.6-2.9Z"/>');

// Elite rank markers: the game's own E0/E1/E2 badges, baked by the build. The files are
// white on transparent, so the badge is painted as a mask in the current text colour —
// gold on an unlock badge, dark on the selected elite button — the way the inline SVGs it
// replaces were. `.ico-mask` gives it a size where no caller rule does.
export function eliteIcon(phase: number): string {
  return `<span class="ico ico-mask" style="--ico: url(${eliteIconUrl(Math.min(phase, 2))})" aria-hidden="true"></span>`;
}
