// Inline SVG glyphs for the detail page. Sanity Gone gives every stat row, every skill
// meta field and the elite/potential controls their own icon, and the panels read as a
// dense wall of numbers without them. These are drawn here rather than fetched so the
// detail page adds no new image requests: they're monochrome, inherit `currentColor`,
// and are sized by the caller through CSS.

const svg = (body: string, viewBox = '0 0 16 16'): string =>
  `<svg class="ico" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.4"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

// ── Stats ──
export const ICON_HP      = svg('<path d="M8 13.5S2 10 2 6.2A3.2 3.2 0 0 1 8 4.6a3.2 3.2 0 0 1 6 1.6C14 10 8 13.5 8 13.5Z"/>');
export const ICON_DEF     = svg('<path d="M8 1.8 13.2 4v4.1c0 3.2-2.2 5.3-5.2 6.1-3-.8-5.2-2.9-5.2-6.1V4Z"/>');
export const ICON_RES     = svg('<path d="M8 1.8 13.2 4v4.1c0 3.2-2.2 5.3-5.2 6.1-3-.8-5.2-2.9-5.2-6.1V4Z"/><path d="M8 5.2 9 7.4l2.2 1-2.2 1L8 11.6 7 9.4l-2.2-1L7 7.4Z"/>');
export const ICON_ATK     = svg('<path d="M13.6 2.4 6.8 9.2M13.6 2.4v3.2M13.6 2.4h-3.2M6.8 9.2 4.4 11.6M2.4 13.6l2-2M4.4 11.6l2 2"/>');
export const ICON_ASPD    = svg('<circle cx="8" cy="9" r="5"/><path d="M8 6.2V9l1.9 1.2M6.2 1.8h3.6"/>');
export const ICON_BLOCK   = svg('<rect x="2.2" y="3" width="11.6" height="10" rx="1"/><path d="M2.2 6.6h11.6M2.2 9.8h11.6M6 3v10M10 3v10"/>');
export const ICON_DP      = svg('<path d="M8 1.8 13.6 5v6L8 14.2 2.4 11V5Z"/><path d="M8 5.4v5.2"/>');
export const ICON_REDEPLOY = svg('<path d="M4 2h8M4 14h8M5 2c0 3 6 3.4 6 6s-6 3-6 6"/><path d="M11 2c0 3-6 3.4-6 6"/>');

// ── Skill meta ──
export const ICON_SP_COST = svg('<path d="M8.8 1.8 3.4 9.2h3.6l-.6 5 5.4-7.4H8.2Z"/>');
export const ICON_SP_INIT = svg('<circle cx="8" cy="8" r="6"/><path d="M8.6 4.6 6 8.6h2.2L7.6 11.6 10.4 7.6H8.2Z"/>');
export const ICON_DURATION = svg('<circle cx="8" cy="8" r="6"/><path d="M8 4.6V8l2.3 1.4"/>');

// ── Position ──
export const ICON_MELEE  = svg('<path d="M12.6 2.4 5.8 9.2M12.6 2.4v3.2M12.6 2.4h-3.2M5.8 9.2 3.4 11.6M2.6 14.4l1.4-1.4M4 13 5.4 14.4"/>');
export const ICON_RANGED = svg('<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2"/><path d="M8 .8v2.4M8 12.8v2.4M.8 8h2.4M12.8 8h2.4"/>');

// ── Misc ──
export const ICON_BRUSH = svg('<path d="M13.4 2.6 7.2 8.8M11 1.6l3.4 3.4-2 2-3.4-3.4ZM6.6 8.2c-1.4-.6-3 .2-3.4 1.8-.3 1.2-.9 1.9-1.6 2.2 1.6 1.6 4.5 1.6 5.6-.6.5-1 .3-2.2-.6-2.9Z"/>');

// Elite rank markers. The game's own E0/E1/E2 badges are chevrons; these approximate
// them closely enough to read at 16px without pulling in three more assets.
export function eliteIcon(phase: number): string {
  if (phase >= 2) return svg('<path d="M8 2 13 7.2H3ZM8 8 13 13.2H3Z" fill="currentColor" stroke="none"/>');
  if (phase === 1) return svg('<path d="M8 4.4 13 9.6H3Z" fill="currentColor" stroke="none"/>');
  return svg('<path d="M8 4.4 13 9.6H3Z"/>');
}
